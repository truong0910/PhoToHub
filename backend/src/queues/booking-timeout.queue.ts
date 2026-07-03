import { Queue } from "bullmq";
import { redisConnection, isRedisAvailable } from "../shared/redis.js";
import { getServiceRoleClient } from "../shared/supabase-client.js";
import { emailQueue } from "./email.queue.js";

let queueInstance: Queue | null = null;

export function initializeBookingTimeoutQueue() {
  if (isRedisAvailable && !queueInstance) {
    try {
      queueInstance = new Queue("booking-timeout", {
        connection: redisConnection as any
      });
      console.log("📥 BullMQ 'booking-timeout' queue initialized successfully.");
    } catch (err: any) {
      console.warn("⚠️ Failed to initialize BullMQ 'booking-timeout' queue:", err.message);
    }
  }
}

// Call initially in case redis connected early
initializeBookingTimeoutQueue();

export const bookingTimeoutQueue = {
  async add(name: string, data: { bookingId: string }, options?: { delay: number }) {
    // Lazy check in case connection was established later
    initializeBookingTimeoutQueue();

    if (isRedisAvailable && queueInstance) {
      try {
        await queueInstance.add(name, data, options);
        console.log(`📥 [BullMQ Queue] Scheduled delayed check for Booking ID: ${data.bookingId}`);
        return;
      } catch (err: any) {
        console.warn("⚠️ BullMQ queue add failed. Falling back to In-Memory scheduler.");
      }
    }

    // In-Memory Fallback Scheduler
    const delay = options?.delay || 1 * 60 * 1000;
    console.log(`📥 [In-Memory Queue] Scheduled delayed cancel-booking (delay: ${delay}ms) for ID: ${data.bookingId}`);

    setTimeout(async () => {
      console.log(`⏳ [In-Memory Queue] Running cancel-booking check for ID: ${data.bookingId}`);
      try {
        const supabase = getServiceRoleClient();
        const { data: booking, error: selectError } = await supabase
          .from("bookings")
          .select("id, status")
          .eq("id", data.bookingId)
          .single();

        if (selectError) {
          throw new Error(`Select error: ${selectError.message}`);
        }

        if (booking && booking.status === "pending") {
          const { error: updateError } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", data.bookingId);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }
          console.log(`❌ [In-Memory Queue] Booking ID ${data.bookingId} has been automatically CANCELLED (Unpaid timeout).`);
          
          await emailQueue.add("send-email", {
            bookingId: data.bookingId,
            type: "cancelled"
          });
        } else {
          console.log(`✅ [In-Memory Queue] Booking ID ${data.bookingId} is already processed (Status: '${booking?.status}').`);
        }
      } catch (err: any) {
        console.error(`❌ [In-Memory Queue] Error executing cancellation check:`, err.message);
      }
    }, delay);
  }
};

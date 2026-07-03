import { Worker } from "bullmq";
import { redisConnection } from "../shared/redis.js";
import { getServiceRoleClient } from "../shared/supabase-client.js";
import { emailQueue } from "../queues/email.queue.js";

export let bookingTimeoutWorker: Worker | null = null;

export function startBookingTimeoutWorker() {
  if (bookingTimeoutWorker) return; // Already initialized

  try {
    bookingTimeoutWorker = new Worker(
      "booking-timeout",
      async (job) => {
        const { bookingId } = job.data;
        console.log(`⏳ Processing booking-timeout check for ID: ${bookingId}`);

        try {
          const supabase = getServiceRoleClient();

          // Retrieve current booking state
          const { data: booking, error: selectError } = await supabase
            .from("bookings")
            .select("id, status")
            .eq("id", bookingId)
            .single();

          if (selectError) {
            throw new Error(`Failed to query booking ${bookingId}: ${selectError.message}`);
          }

          if (!booking) {
            console.warn(`⚠️ Booking ID ${bookingId} not found. Skipping cancellation.`);
            return;
          }

          console.log(`Booking status is currently: '${booking.status}'`);

          if (booking.status === "pending") {
            // Transition status to cancelled
            const { error: updateError } = await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", bookingId);

            if (updateError) {
              throw new Error(`Failed to update booking status: ${updateError.message}`);
            }

            console.log(`❌ Booking ID ${bookingId} has been automatically CANCELLED due to unpaid timeout (15 minutes).`);
            
            // Queue cancellation notification email
            await emailQueue.add("send-email", {
              bookingId,
              type: "cancelled"
            });
          } else {
            console.log(`✅ Booking ID ${bookingId} is already processed (Status: '${booking.status}'). No action required.`);
          }
        } catch (err: any) {
          console.error(`❌ Error in booking-timeout worker for job ${job.id}:`, err.message);
          throw err;
        }
      },
      {
        connection: redisConnection as any
      }
    );

    bookingTimeoutWorker.on("completed", (job) => {
      console.log(`✅ Booking timeout job ${job.id} completed successfully.`);
    });

    bookingTimeoutWorker.on("failed", (job, err) => {
      console.error(`❌ Booking timeout job ${job?.id} failed:`, err);
    });

    console.log("⚙️ BullMQ 'booking-timeout' worker started dynamically.");
  } catch (err: any) {
    console.warn("⚠️ Failed to initialize BullMQ 'booking-timeout' worker:", err.message);
  }
}

// Attempt starting immediately if connection is already ready
if (redisConnection.status === "ready" || redisConnection.status === "connect") {
  startBookingTimeoutWorker();
}

// Bind to connection events for reactive startup
redisConnection.on("connect", () => {
  startBookingTimeoutWorker();
});

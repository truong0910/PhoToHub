import { BookingPipelineContext } from "./pipeline.types.js";
import { bookingTimeoutQueue } from "../../queues/booking-timeout.queue.js";
import { emailQueue } from "../../queues/email.queue.js";
import { LockManager } from "../../shared/lock.js";

export async function emitEventStep(context: BookingPipelineContext): Promise<void> {
  console.log("Booking Pipeline Step 5: EmitEvent executing...");
  const booking = context.resultBooking;

  if (!booking) {
    throw new Error("Pipeline Error: Booking details not found in context.");
  }

  // 1. Queue delayed timeout cancellation in BullMQ (15 minutes = 15 * 60 * 1000 milliseconds)
  const timeoutMs = 15 * 60 * 1000;
  try {
    await bookingTimeoutQueue.add(
      "cancel-booking",
      { bookingId: booking.id },
      { delay: timeoutMs }
    );
    console.log(`📥 BullMQ: Enqueued delayed booking cancellation job (15m delay) for booking ID: ${booking.id}`);
  } catch (err: any) {
    console.error("❌ Failed to enqueue BullMQ booking-timeout job:", err.message);
  }

  // 2. Queue asynchronous email dispatch task in BullMQ
  try {
    await emailQueue.add(
      "send-booking-email",
      { bookingId: booking.id, type: "created" }
    );
    console.log(`📥 BullMQ: Enqueued async created email job for booking ID: ${booking.id}`);
  } catch (err: any) {
    console.error("❌ Failed to enqueue BullMQ email-queue job:", err.message);
  }

  // 3. Release locks safely
  console.log("Releasing all acquired locks during this session...");
  for (const resource of context.locksAcquired) {
    await LockManager.releaseLock(resource);
  }
  context.locksAcquired = [];
}

import { BookingRepository, CreateBookingData } from "../repositories/booking.repository.js";
import { BookingPipelineContext } from "./booking-pipeline/pipeline.types.js";
import { validateSlotStep } from "./booking-pipeline/ValidateSlot.js";
import { acquireLockStep } from "./booking-pipeline/AcquireLock.js";
import { checkAvailabilityStep } from "./booking-pipeline/CheckAvailability.js";
import { createBookingStep } from "./booking-pipeline/CreateBooking.js";
import { emitEventStep } from "./booking-pipeline/EmitEvent.js";
import { LockManager } from "../shared/lock.js";
import { emailQueue } from "../queues/email.queue.js";

export interface BookingRequestDto {
  client_id: string;
  photographer_id?: string | null;
  equipment_id?: string | null;
  start_date: string;
  end_date: string;
}

export class BookingService {
  private bookingRepository: BookingRepository;

  constructor(bookingRepository: BookingRepository) {
    this.bookingRepository = bookingRepository;
  }

  /**
   * Implements business logic for placing a new booking.
   * Performs date logic validation, verifies profile roles, validates equipment availability,
   * computes daily price multiplications, and default persists status as 'pending'.
   */
  async createBooking(dto: BookingRequestDto) {
    const context: BookingPipelineContext = {
      dto,
      supabase: this.bookingRepository.supabase,
      locksAcquired: []
    };

    try {
      // Step 1: Validate slot schema and business ranges
      await validateSlotStep(context);

      // Step 2: Acquire Redis lock for target resource(s)
      await acquireLockStep(context);

      // Step 3: Check availability and check overlap bookings
      await checkAvailabilityStep(context);

      // Step 4: Create booking and handle DB exclusion constraints
      await createBookingStep(context);

      // Step 5: Emit BullMQ tasks and release locks
      await emitEventStep(context);

      return context.resultBooking;
    } catch (error) {
      console.error("[Booking Pipeline Aborted] Error details:", error);
      // Guarantee lock cleanup in case of exceptions
      for (const resource of context.locksAcquired) {
        await LockManager.releaseLock(resource);
      }
      throw error;
    }
  }

  /**
   * Implements business logic for updating the status of a booking.
   * Validates target status values and updates through the repository.
   */
  async updateBookingStatus(bookingId: string, status: string) {
    const validStatuses = ["pending", "approved", "ongoing", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid booking status: '${status}'.`);
    }

    const updated = await this.bookingRepository.updateBookingStatus(bookingId, status);

    if (status === "approved" || status === "cancelled") {
      try {
        await emailQueue.add("send-email", {
          bookingId,
          type: status
        });
      } catch (err: any) {
        console.error("Failed to enqueue status update email:", err.message);
      }
    }

    return updated;
  }
}

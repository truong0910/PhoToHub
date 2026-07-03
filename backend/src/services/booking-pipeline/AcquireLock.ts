import { BookingPipelineContext } from "./pipeline.types.js";
import { LockManager } from "../../shared/lock.js";

export async function acquireLockStep(context: BookingPipelineContext): Promise<void> {
  console.log("Booking Pipeline Step 2: AcquireLock executing...");
  const { equipment_id, photographer_id } = context.dto;

  try {
    // 1. Lock Equipment Slot
    if (equipment_id) {
      const resource = `equipment:${equipment_id}`;
      const success = await LockManager.acquireLock(resource, 8000, 3, 400);
      if (!success) {
        throw new Error(`Lock Acquisition Conflict: Lịch đặt thiết bị hiện đang được xử lý bởi một yêu cầu khác. Vui lòng thử lại.`);
      }
      context.locksAcquired.push(resource);
    }

    // 2. Lock Photographer Slot
    if (photographer_id) {
      const resource = `photographer:${photographer_id}`;
      const success = await LockManager.acquireLock(resource, 8000, 3, 400);
      if (!success) {
        throw new Error(`Lock Acquisition Conflict: Lịch đặt thợ ảnh hiện đang được xử lý bởi một yêu cầu khác. Vui lòng thử lại.`);
      }
      context.locksAcquired.push(resource);
    }
  } catch (error) {
    // Clean up locks already held if current acquisition aborts midway
    for (const resource of context.locksAcquired) {
      await LockManager.releaseLock(resource);
    }
    context.locksAcquired = [];
    throw error;
  }
}

import { z } from "zod";
import { BookingPipelineContext } from "./pipeline.types.js";

// Zod Input Verification Schema matching core API expectations
export const bookingInputSchema = z.object({
  client_id: z.string().uuid("Invalid client_id format. Must be a valid UUID."),
  photographer_id: z.string().uuid("Invalid photographer_id format. Must be a valid UUID.").nullable().optional(),
  equipment_id: z.string().uuid("Invalid equipment_id format. Must be a valid UUID.").nullable().optional(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start_date format. Must be a valid ISO 8601 date string."
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end_date format. Must be a valid ISO 8601 date string."
  })
}).refine((data) => {
  return data.photographer_id || data.equipment_id;
}, {
  message: "At least one target selection ('photographer_id' or 'equipment_id') must be provided to place a booking."
});

export async function validateSlotStep(context: BookingPipelineContext): Promise<void> {
  console.log("Booking Pipeline Step 1: ValidateSlot executing...");
  
  // 1. Zod parse verification
  const parseResult = bookingInputSchema.safeParse(context.dto);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((e: any) => e.message).join(" | ");
    throw new Error(`Validation Error: ${errorDetails}`);
  }

  const { start_date, end_date } = context.dto;
  const start = new Date(start_date);
  const end = new Date(end_date);

  // 2. Business date checks
  if (end <= start) {
    throw new Error("Validation Error: Booking end_date must be strictly after the start_date.");
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours < 1) {
    throw new Error("Validation Error: Booking slots must span at least 1 hour.");
  }
}

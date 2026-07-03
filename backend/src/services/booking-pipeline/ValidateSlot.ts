import { z } from "zod";
import { BookingPipelineContext } from "./pipeline.types.js";

// Zod Input Verification Schema matching core API expectations
export const bookingInputSchema = z.object({
  client_id: z.string().uuid("Định dạng client_id không hợp lệ. Phải là một UUID hợp lệ."),
  photographer_id: z.string().uuid("Định dạng photographer_id không hợp lệ. Phải là một UUID hợp lệ.").nullable().optional(),
  equipment_id: z.string().uuid("Định dạng equipment_id không hợp lệ. Phải là một UUID hợp lệ.").nullable().optional(),
  payment_code: z.string().nullable().optional(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Định dạng start_date không hợp lệ. Phải là chuỗi ngày ISO 8601 hợp lệ."
  }),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Định dạng end_date không hợp lệ. Phải là chuỗi ngày ISO 8601 hợp lệ."
  })
}).refine((data) => {
  return data.photographer_id || data.equipment_id;
}, {
  message: "Vui lòng chọn ít nhất một nhiếp ảnh gia hoặc một thiết bị để tiến hành đặt lịch."
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
    throw new Error("Validation Error: Ngày kết thúc đặt lịch phải sau ngày bắt đầu.");
  }

  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (durationHours < 1) {
    throw new Error("Validation Error: Thời gian đặt lịch tối thiểu phải kéo dài ít nhất 1 giờ.");
  }
}

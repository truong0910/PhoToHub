import { BookingPipelineContext } from "./pipeline.types.js";

export async function createBookingStep(context: BookingPipelineContext): Promise<void> {
  console.log("Booking Pipeline Step 4: CreateBooking executing...");
  const { client_id, equipment_id, photographer_id, start_date, end_date, payment_code } = context.dto;

  const bookingData = {
    client_id,
    equipment_id: equipment_id || null,
    photographer_id: photographer_id || null,
    start_date: new Date(start_date).toISOString(),
    end_date: new Date(end_date).toISOString(),
    status: "pending",
    total_price: context.totalPrice || 0,
    payment_code: payment_code || null
  };

  const { data: created, error: insertError } = await context.supabase
    .from("bookings")
    .insert([bookingData])
    .select()
    .single();

  if (insertError) {
    // Intercept PostgreSQL GIST exclusion constraint violation (error code '23P01')
    if (insertError.code === "23P01") {
      console.warn("⚠️ PostgreSQL GIST exclusion constraint triggered! Overlapping booking prevented at DB level.");
      throw new Error("Availability Error: Khung thời gian bạn yêu cầu trùng với một lịch bận đã có sẵn (Ràng buộc Trùng lặp).");
    }
    throw new Error(`Database Error: Lỗi tạo đơn đặt lịch trên cơ sở dữ liệu: ${insertError.message}`);
  }

  context.resultBooking = created;
  console.log(`✅ Booking created successfully in DB. ID: ${created.id}`);
}

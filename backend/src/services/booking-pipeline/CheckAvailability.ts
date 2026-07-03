import { BookingPipelineContext } from "./pipeline.types.js";

export async function checkAvailabilityStep(context: BookingPipelineContext): Promise<void> {
  console.log("Booking Pipeline Step 3: CheckAvailability executing...");
  const { client_id, equipment_id, photographer_id, start_date, end_date } = context.dto;
  const start = new Date(start_date).toISOString();
  const end = new Date(end_date).toISOString();

  // 1. Verify Client Profile exists
  const { data: clientProfile, error: clientErr } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("id", client_id)
    .single();

  if (clientErr || !clientProfile) {
    throw new Error(`Profile Error: Không tìm thấy hồ sơ khách hàng với ID '${client_id}'.`);
  }

  let priceAccumulated = 0;

  // 2. Validate Equipment availability and compute daily price
  if (equipment_id) {
    const { data: equip, error: equipErr } = await context.supabase
      .from("equipment")
      .select("name, status, price_per_day")
      .eq("id", equipment_id)
      .single();

    if (equipErr || !equip) {
      throw new Error(`Availability Error: Không tìm thấy thiết bị với ID '${equipment_id}'.`);
    }

    if (equip.status !== "available") {
      throw new Error(`Availability Error: Thiết bị '${equip.name}' hiện tại không sẵn sàng để thuê (Trạng thái: '${equip.status}').`);
    }

    // Check overlap bookings
    const { data: overlapEquip, error: overlapEquipErr } = await context.supabase
      .from("bookings")
      .select("id")
      .eq("equipment_id", equipment_id)
      .in("status", ["pending", "approved", "ongoing"])
      .lt("start_date", end)
      .gt("end_date", start)
      .limit(1);

    if (overlapEquipErr) {
      throw new Error(`Database Error: Lỗi khi kiểm tra tính khả dụng của thiết bị: ${overlapEquipErr.message}`);
    }

    if (overlapEquip && overlapEquip.length > 0) {
      throw new Error(`Availability Error: Thiết bị '${equip.name}' đã có lịch đặt hoặc bận trong khoảng thời gian yêu cầu.`);
    }

    // Calculate days rounded up
    const diffDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    priceAccumulated += diffDays * (Number(equip.price_per_day) || 0);
  }

  // 3. Validate Photographer availability
  if (photographer_id) {
    const { data: photog, error: photogErr } = await context.supabase
      .from("profiles")
      .select("full_name, role, base_price")
      .eq("id", photographer_id)
      .single();

    if (photogErr || !photog) {
      throw new Error(`Availability Error: Không tìm thấy thợ chụp ảnh với ID '${photographer_id}'.`);
    }

    if (photog.role !== "photographer" && photog.role !== "admin") {
      throw new Error(`Availability Error: Tài khoản ID '${photographer_id}' không phải là nhiếp ảnh gia.`);
    }

    // Check overlap bookings
    const { data: overlapPhotog, error: overlapPhotogErr } = await context.supabase
      .from("bookings")
      .select("id")
      .eq("photographer_id", photographer_id)
      .in("status", ["pending", "approved", "ongoing"])
      .lt("start_date", end)
      .gt("end_date", start)
      .limit(1);

    if (overlapPhotogErr) {
      throw new Error(`Database Error: Lỗi khi kiểm tra lịch bận của thợ chụp ảnh: ${overlapPhotogErr.message}`);
    }

    if (overlapPhotog && overlapPhotog.length > 0) {
      throw new Error(`Availability Error: Thợ ảnh '${photog.full_name}' đã có lịch chụp bận trong khoảng thời gian yêu cầu.`);
    }

    // Calculate days rounded up
    const diffDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    priceAccumulated += diffDays * (Number(photog.base_price) || 1500000);
  }

  context.totalPrice = priceAccumulated;
}

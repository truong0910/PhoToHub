import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSepay() {
  console.log("🚀 Starting SePay Webhook Automation Test...");

  // 1. Create a temporary pending booking
  console.log("1. Creating temporary pending booking...");
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      start_date: new Date(Date.now() + 86400000).toISOString(),
      end_date: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: "pending",
      total_price: 150.00,
    })
    .select()
    .single();

  if (bookingErr) {
    console.error("Failed to create temporary booking:", bookingErr);
    return;
  }
  console.log(`Booking created! ID: ${booking.id}, Status: ${booking.status}`);

  const prefix = booking.id.substring(0, 8);
  const transferContent = `PH${prefix} thanh toan don hang photohub`;
  console.log(`VietQR transfer content note code to use: PH${prefix}`);

  // 2. Simulate SePay webhook callback POST request
  console.log("2. Simulating SePay webhook callback...");
  const response = await fetch("http://localhost:3000/payments/sepay-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SEPAY_SECRET_KEY ? { "Authorization": `Apikey ${process.env.SEPAY_SECRET_KEY}` } : {})
    },
    body: JSON.stringify({
      id: Math.floor(Math.random() * 100000),
      gateway: "MBBank",
      transferType: "in",
      transferAmount: 3810000, // ≈ 150 USD in VND
      content: transferContent,
    }),
  });

  const result = await response.json();
  console.log("Webhook response status:", response.status);
  console.log("Webhook response body:", result);

  // 3. Re-query booking to check status
  console.log("3. Re-querying booking to verify status update...");
  const { data: updatedBooking, error: queryErr } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", booking.id)
    .single();

  if (queryErr) {
    console.error("Failed to query updated booking:", queryErr);
    return;
  }

  if (updatedBooking.status === "approved") {
    console.log("✅ SUCCESS: Booking status automatically updated to 'approved' via SePay Webhook!");
  } else {
    console.error(`❌ FAILURE: Expected 'approved' but got status '${updatedBooking.status}'`);
  }

  // 4. Cleanup temporary booking
  console.log("4. Cleaning up temporary booking...");
  await supabase.from("bookings").delete().eq("id", booking.id);
  console.log("Cleanup finished.");
}

testSepay();

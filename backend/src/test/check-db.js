import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log("Profiles count:", profiles?.length);

  const { data: bookings, error: bErr } = await supabase.from("bookings").select("*");
  if (bErr) console.error("Error fetching bookings:", bErr);
  else console.log("Bookings count:", bookings?.length, "\nBookings:", bookings);
}

check();

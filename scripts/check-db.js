import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./backend/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
  if (pErr) console.error("Error fetching profiles:", pErr);
  else console.log("Profiles count:", profiles.length, "\nProfiles:", profiles);

  const { data: equipment, error: eErr } = await supabase.from("equipment").select("*");
  if (eErr) console.error("Error fetching equipment:", eErr);
  else console.log("Equipment count:", equipment.length, "\nEquipment:", equipment);
}

check();

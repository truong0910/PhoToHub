import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConcurrency() {
  console.log("🚀 Starting Concurrency Integration Test...");

  // Query a valid client and photographer profile dynamically from Supabase
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, role");

  if (profilesErr || !profiles || profiles.length === 0) {
    console.error("❌ Failed to query profiles for seeding test:", profilesErr?.message || "No profiles found.");
    return;
  }

  const client = profiles.find(p => p.role === "client");
  const photographer = profiles.find(p => p.role === "photographer" || p.role === "admin");

  if (!client || !photographer) {
    console.error("❌ Test requires at least one client profile and one photographer/admin profile in database.");
    console.log("Profiles found:", profiles);
    return;
  }

  const clientId = client.id;
  const photographerId = photographer.id;

  console.log(`Using client ID: ${clientId} and photographer ID: ${photographerId}`);

  // Setup test booking date range (1 day in 2 years)
  const tomorrow = new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000);
  const nextDay = new Date(tomorrow.getTime() + 86400000);
  
  const payload = {
    client_id: clientId,
    photographer_id: photographerId,
    start_date: tomorrow.toISOString(),
    end_date: nextDay.toISOString()
  };

  console.log("Simulating 10 concurrent booking requests for the same photographer slot...");

  const requests = Array.from({ length: 10 }).map(async (_, idx) => {
    try {
      const response = await fetch("http://localhost:3000/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return { id: idx + 1, status: response.status, data };
    } catch (err) {
      return { id: idx + 1, status: "error", error: err.message };
    }
  });

  const results = await Promise.all(requests);

  const successes = results.filter(r => r.status === 201);
  const conflicts = results.filter(r => r.status === 409);
  const errors = results.filter(r => r.status === 500 || r.status === "error");

  console.log("Errors detail:", errors);

  console.log("\n=================== TEST RESULTS ===================");
  console.log(`Total Requests: 10`);
  console.log(`Successes (201 Created): ${successes.length}`);
  console.log(`Conflicts (409 Conflict): ${conflicts.length}`);
  console.log(`Errors (500 / Fetch fail): ${errors.length}`);
  console.log("===================================================\n");

  if (successes.length === 1 && conflicts.length === 9) {
    console.log("✅ SUCCESS: Concurrency protection verified! Only 1 booking was created, and the other 9 were blocked with conflict codes.");
  } else {
    console.error("❌ FAILURE: Expected exactly 1 success and 9 conflicts!");
  }

  // Cleanup created booking
  if (successes.length > 0) {
    console.log("Cleaning up created test booking...");
    const createdId = successes[0].data.data.id;
    await supabase.from("bookings").delete().eq("id", createdId);
    console.log("Cleanup finished.");
  }
}

testConcurrency();

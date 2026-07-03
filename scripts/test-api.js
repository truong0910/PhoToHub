const fs = require("fs");

/**
 * Node.js integration testing script for the PhotoHub API.
 * Uses native fetch (Node.js 18+) to run the 5 automated test cases.
 *
 * To run:
 *   node scripts/test-api.js [API_URL]
 */

function loadEnvironment() {
  const env = {};
  try {
    const text = fs.readFileSync(".env", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        env[key] = value;
      }
    }
  } catch (_e) {
    // Falls back to system environment variables
  }

  const url = process.env.SUPABASE_URL || env["SUPABASE_URL"] || "http://localhost:54321";
  const anonKey = process.env.SUPABASE_ANON_KEY || env["SUPABASE_ANON_KEY"] || "";
  
  return { url, anonKey };
}

async function runTests() {
  const { url: baseUrl, anonKey } = loadEnvironment();
  
  // Default to local Node.js Express server path
  const customUrl = process.argv[2];
  const functionUrl = customUrl || "http://localhost:3000/bookings";

  console.log("\n\x1b[36m🚀 Starting PhotoHub API Automatic Testing (Node.js)\x1b[0m");
  console.log(`\x1b[90mTarget URL: \x1b[33m${functionUrl}\x1b[0m`);

  // Attempt to authenticate as client@example.com to obtain a valid JWT token
  // This satisfies RLS rule checks in Postgres (auth.uid() = client_id)
  let authToken = anonKey;
  try {
    const authResponse = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
      },
      body: JSON.stringify({
        email: "client@example.com",
        password: "password123",
      }),
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.access_token;
      console.log("\x1b[32m🔑 Successfully authenticated as client@example.com!\x1b[0m");
    } else {
      const errText = await authResponse.text();
      console.log(`\x1b[33m⚠️ Could not sign in (Status: ${authResponse.status}). Falling back to anonKey.\x1b[0m`);
      console.log(`\x1b[90mError response: ${errText}\x1b[0m`);
    }
  } catch (error) {
    console.log(`\x1b[33m⚠️ Auth connection error: ${error.message}. Falling back to anonKey.\x1b[0m`);
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`,
    "apikey": anonKey,
  };

  const testCases = [
    {
      name: "TEST 1: Valid Booking Creation (Profoto B10X Plus - 2 Days)",
      payload: {
        client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        photographer_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        equipment_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e33", // Profoto B10X Plus (50/day)
        start_date: "2026-07-20T08:00:00.000Z",
        end_date: "2026-07-22T08:00:00.000Z", // Exactly 2 Days
      },
      expectedStatus: 201,
      validate: (data) => {
        return (
          data.success === true &&
          data.data.status === "pending" &&
          Number(data.data.total_price) === 100 // 2 days * 50 = 100
        );
      },
    },
    {
      name: "TEST 2: Invalid Date Range (End date before/equal to Start date)",
      payload: {
        client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        equipment_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e33",
        start_date: "2026-07-20T08:00:00.000Z",
        end_date: "2026-07-19T08:00:00.000Z", // Invalid end date
      },
      expectedStatus: 400,
      validate: (data) => {
        return data.success === false && data.error.includes("must be strictly after");
      },
    },
    {
      name: "TEST 3: Equipment Under Maintenance (Nikon Z9)",
      payload: {
        client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        equipment_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e44", // Nikon Z9 (maintenance status)
        start_date: "2026-07-20T08:00:00.000Z",
        end_date: "2026-07-21T08:00:00.000Z",
      },
      expectedStatus: 400,
      validate: (data) => {
        return data.success === false && data.error.includes("currently not available");
      },
    },
    {
      name: "TEST 4: Overlapping Booking Conflict (Canon EOS R5)",
      payload: {
        client_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        equipment_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e11", // Canon EOS R5 (booked 2026-07-10 to 2026-07-15)
        start_date: "2026-07-12T10:00:00.000Z", // Overlaps
        end_date: "2026-07-14T10:00:00.000Z",
      },
      expectedStatus: 400,
      validate: (data) => {
        return data.success === false && data.error.includes("already booked or scheduled");
      },
    },
    {
      name: "TEST 5: Payload Error (Missing Client ID)",
      payload: {
        // missing client_id
        equipment_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e33",
        start_date: "2026-07-20T08:00:00.000Z",
        end_date: "2026-07-22T08:00:00.000Z",
      },
      expectedStatus: 400,
      validate: (data) => {
        return data.error && data.error.includes("Missing required parameter");
      },
    },
  ];

  let passedTests = 0;

  for (const tc of testCases) {
    console.log(`\x1b[90m⏳ Running: ${tc.name}\x1b[0m`);
    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(tc.payload),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (_err) {
        responseData = responseText;
      }

      const isStatusMatch = response.status === tc.expectedStatus;
      const isValidBody = typeof responseData === "object" ? tc.validate(responseData) : false;

      if (isStatusMatch && isValidBody) {
        console.log(`\x1b[32m✅ PASSED: HTTP ${response.status}\x1b[0m`);
        passedTests++;
      } else {
        console.log(
          `\x1b[31m❌ FAILED: Expect status ${tc.expectedStatus} (Got ${response.status})\x1b[0m`
        );
        console.log("\x1b[90mPayload Sent:\x1b[0m", tc.payload);
        console.log("\x1b[90mResponse Received:\x1b[0m", responseData);
      }
    } catch (e) {
      console.log(`\x1b[31m💥 ERROR: Failed connection or runtime crash.\x1b[0m`);
      console.error(e.message || e);
    }
    console.log("\x1b[90m──────────────────────────────────────────────────\x1b[0m");
  }

  const color = passedTests === testCases.length ? "\x1b[32m" : "\x1b[33m";
  console.log(
    `\n${color}🏁 TEST REPORT: Completed ${passedTests}/${testCases.length} tests successfully.\x1b[0m`
  );
}

runTests();

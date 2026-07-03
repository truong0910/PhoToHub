import dotenv from "dotenv";
dotenv.config();

const merchantId = process.env.SEPAY_MERCHANT_ID;
const secretKey = process.env.SEPAY_SECRET_KEY;

async function testPgApi() {
  console.log("Testing pgapi.sepay.vn endpoints with Basic Auth...");
  const authHeader = "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

  const endpoints = [
    "https://pgapi.sepay.vn/v1/merchants/config",
    "https://pgapi.sepay.vn/v1/info",
    "https://pgapi.sepay.vn/v1/merchant/detail",
    "https://pgapi.sepay.vn/v1/merchant/config",
    "https://pgapi.sepay.vn/v1/bank-accounts",
    "https://pgapi.sepay.vn/v1/merchant"
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nQuerying endpoint: ${url}...`);
      const response = await fetch(url, {
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json().catch(() => null);
      console.log("Response status:", response.status);
      console.log("Response body:", data);
    } catch (err) {
      console.error(`Failed to query ${url}:`, err.message);
    }
  }
}

testPgApi();

import dotenv from "dotenv";
dotenv.config();

const merchantId = process.env.SEPAY_MERCHANT_ID;
const secretKey = process.env.SEPAY_SECRET_KEY;

async function testMerchantSub() {
  console.log("Testing pgapi.sepay.vn /v1/merchant sub-resources with Basic Auth...");
  const authHeader = "Basic " + Buffer.from(`${merchantId}:${secretKey}`).toString("base64");

  const endpoints = [
    "https://pgapi.sepay.vn/v1/merchant/bank-accounts",
    "https://pgapi.sepay.vn/v1/merchant/banks",
    "https://pgapi.sepay.vn/v1/merchant/bank",
    "https://pgapi.sepay.vn/v1/merchant/payment-methods",
    "https://pgapi.sepay.vn/v1/merchant/payment_methods"
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

testMerchantSub();

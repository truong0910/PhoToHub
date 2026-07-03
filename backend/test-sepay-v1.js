import dotenv from "dotenv";
dotenv.config();

const secretKey = process.env.SEPAY_SECRET_KEY;

async function fetchAccounts() {
  console.log("Testing userapi.sepay.vn v1 with key:", secretKey);
  try {
    const response = await fetch("https://userapi.sepay.vn/v1/bank-accounts", {
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json().catch(() => null);
    console.log("Response status:", response.status);
    console.log("Response body:", data);
  } catch (err) {
    console.error("Failed to query SePay API:", err);
  }
}

fetchAccounts();

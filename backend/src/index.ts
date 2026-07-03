import dotenv from "dotenv";
// Load environment variables before importing other dependencies
dotenv.config();

import express from "express";
import cors from "cors";
import { getSupabaseClient, getServiceRoleClient } from "./shared/supabase-client.js";
import { BookingRepository } from "./repositories/booking.repository.js";
import { BookingService } from "./services/booking.service.js";
import { BookingController } from "./controllers/booking.controller.js";

// Initialize async BullMQ background workers
import "./workers/booking-timeout.worker.js";
import "./workers/email.worker.js";

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Enable Global CORS and JSON body parser
app.use(cors());
app.use(express.json());

// 2. Request lifecycle handler mapping
const handleRequest = async (req: express.Request, res: express.Response) => {
  try {
    const supabase = getSupabaseClient(req);
    const bookingRepository = new BookingRepository(supabase);
    const bookingService = new BookingService(bookingRepository);
    const bookingController = new BookingController(bookingService);

    await bookingController.handleCreateBooking(req, res);
  } catch (error: any) {
    console.error("[Express Server Error] Context initialization failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initialize request context.",
    });
  }
};

// 3. Context lifecycle handler mapping for PATCH (Status update)
const handleUpdateStatusRequest = async (req: express.Request, res: express.Response) => {
  try {
    const supabase = getSupabaseClient(req);
    const bookingRepository = new BookingRepository(supabase);
    const bookingService = new BookingService(bookingRepository);
    const bookingController = new BookingController(bookingService);

    await bookingController.handleUpdateStatus(req, res);
  } catch (error: any) {
    console.error("[Express Server Error] Context initialization failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initialize request context.",
    });
  }
};

// 4. Multi-path routing for compatibility (supports standard, custom endpoints)
app.post("/", handleRequest);
app.post("/bookings", handleRequest);
app.post("/functions/v1/photo-hub-api", handleRequest);
app.patch("/bookings/:id/status", handleUpdateStatusRequest);
// SePay Webhook Core Handler (Shared for standard & IPN routes)
const handleSepayIpn = async (req: express.Request, res: express.Response) => {
  try {
    const { content, transferType } = req.body;
    console.log("💳 SePay Webhook incoming transaction:", req.body);

    // 1. Validate SePay Secret Key Authorization
    const authHeader = req.headers["authorization"];
    const sepaySecret = process.env.SEPAY_SECRET_KEY;

    if (sepaySecret && authHeader) {
      const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, "").trim();
      if (token !== sepaySecret.trim()) {
        console.warn("⚠️ Unauthorized SePay Webhook attempt. Invalid Secret Key.");
        res.status(401).json({ success: false, error: "Unauthorized Secret Key." });
        return;
      }
    }

    if (transferType !== "in") {
      res.status(200).json({ success: false, message: "Ignore outgoing transaction type." });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, error: "Missing transfer content description." });
      return;
    }

    // Extract booking ID prefix using regex matching
    const match = content.match(/PH([a-fA-F0-9]{8})/);
    if (!match) {
      res.status(400).json({ success: false, error: "Invalid transfer note format. Code should start with PH." });
      return;
    }

    const bookingPrefix = match[1].toLowerCase();

    // Retrieve clean supabase client with service role key to bypass RLS policies
    const supabase = getServiceRoleClient();

    // Query pending bookings
    const { data: bookings, error: selectError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("status", "pending");

    if (selectError) throw selectError;

    const targetBooking = bookings?.find((b) => b.id.toLowerCase().startsWith(bookingPrefix));

    if (!targetBooking) {
      res.status(404).json({ success: false, error: `No pending booking found matching prefix '${bookingPrefix}'.` });
      return;
    }

    // Check if already approved
    if (targetBooking.status === "approved" || targetBooking.status === "ongoing" || targetBooking.status === "completed") {
      res.status(200).json({ success: true, message: "Booking is already processed." });
      return;
    }

    // Update status to approved
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "approved" })
      .eq("id", targetBooking.id);

    if (updateError) throw updateError;

    console.log(`✅ Booking ID '${targetBooking.id}' approved automatically via SePay transaction.`);

    res.status(200).json({
      success: true,
      message: `Booking '${targetBooking.id}' successfully approved.`,
    });
  } catch (error: any) {
    console.error("❌ SePay Webhook error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process SePay webhook notification.",
    });
  }
};

app.post("/payments/sepay-webhook", handleSepayIpn);
app.post("/api/v1/payments/sepay-ipn", handleSepayIpn);

let cachedSepayInfo: any = null;

// Expose active SePay bank details dynamically
app.get("/payments/sepay-info", async (req, res) => {
  try {
    if (cachedSepayInfo) {
      res.status(200).json({ success: true, data: cachedSepayInfo });
      return;
    }

    const sepaySecret = process.env.SEPAY_SECRET_KEY;
    if (sepaySecret && sepaySecret.trim().length > 10) {
      const response = await fetch("https://userapi.sepay.vn/v2/bank-accounts", {
        headers: {
          "Authorization": `Bearer ${sepaySecret}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const json = await response.json();
        if (json.status === "success" && json.data && json.data.length > 0) {
          const primaryAccount = json.data[0];
          cachedSepayInfo = {
            bankId: primaryAccount.bank_short_name || "VietinBank",
            accountNo: primaryAccount.account_number || "",
            accountName: primaryAccount.account_holder_name || "",
            timeoutDurationMs: 1 * 60 * 1000
          };
          console.log("💳 Dynamic SePay bank account details resolved:", cachedSepayInfo);
          res.status(200).json({ success: true, data: cachedSepayInfo });
          return;
        }
      }
    }
  } catch (err) {
    console.error("Failed to dynamically load SePay info:", err);
  }

  // Fallback defaults if API fails or credentials are placeholders
  res.status(200).json({
    success: true,
    data: {
      bankId: process.env.SEPAY_BANK_ID || "",
      accountNo: process.env.SEPAY_ACCOUNT_NO || "",
      accountName: process.env.SEPAY_ACCOUNT_NAME || "",
      timeoutDurationMs: 1 * 60 * 1000
    }
  });
});

// 4. Default Not Found Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route '${req.originalUrl}' not found.` });
});

// 5. Start listening
app.listen(PORT, () => {
  console.log(`\n🚀 PhotoHub Node.js API running at http://localhost:${PORT}`);
  console.log(`- POST http://localhost:${PORT}/bookings`);
  console.log(`- POST http://localhost:${PORT}/functions/v1/photo-hub-api\n`);
});
// Trigger tsx hot-reload 3

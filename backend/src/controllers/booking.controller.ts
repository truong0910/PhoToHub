import { Request, Response } from "express";
import { BookingService } from "../services/booking.service.js";

export class BookingController {
  private bookingService: BookingService;

  constructor(bookingService: BookingService) {
    this.bookingService = bookingService;
  }

  /**
   * Main handler for Booking requests.
   * Leverages input checks, parses payload variables, intercepts exceptions, and formats the response.
   */
  async handleCreateBooking(req: Request, res: Response): Promise<void> {
    try {
      const { client_id, photographer_id, equipment_id, start_date, end_date } = req.body;

      // 1. Request Parameters Validation
      if (!client_id) {
        res.status(400).json({ error: "Missing required parameter: 'client_id' is mandatory." });
        return;
      }

      if (!start_date) {
        res.status(400).json({ error: "Missing required parameter: 'start_date' is mandatory." });
        return;
      }

      if (!end_date) {
        res.status(400).json({ error: "Missing required parameter: 'end_date' is mandatory." });
        return;
      }

      // 2. Execute business workflow in Service
      const createdBooking = await this.bookingService.createBooking({
        client_id,
        photographer_id,
        equipment_id,
        start_date,
        end_date,
      });

      // 3. Return standard created JSON payload
      res.status(201).json({
        success: true,
        message: "Booking successfully created.",
        data: createdBooking,
      });
    } catch (error: any) {
      console.error("[BookingController] Caught exception:", error);

      const errMsg = error.message || "";
      let status = 500;

      if (errMsg.includes("Validation Error:")) {
        status = 400;
      } else if (
        errMsg.includes("Lock Acquisition Conflict:") ||
        errMsg.includes("Availability Error:") ||
        errMsg.includes("already booked")
      ) {
        status = 409;
      } else if (errMsg.includes("Profile Error:")) {
        status = 404;
      }

      res.status(status).json({
        success: false,
        error: errMsg.replace(/^(Validation Error:|Lock Acquisition Conflict:|Availability Error:|Profile Error:)\s*/i, "") || "An internal error occurred during the booking request.",
      });
    }
  }

  /**
   * Handler for updating a booking's status.
   */
  async handleUpdateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({ error: "Missing required parameter: 'status' is mandatory." });
        return;
      }

      const updatedBooking = await this.bookingService.updateBookingStatus(id, status);

      res.status(200).json({
        success: true,
        message: "Booking status updated successfully.",
        data: updatedBooking,
      });
    } catch (error: any) {
      console.error("[BookingController] handleUpdateStatus caught exception:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to update booking status.",
      });
    }
  }
}

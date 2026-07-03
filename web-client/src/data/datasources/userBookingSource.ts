import { supabase } from "../../config/supabase.js";

export interface BookingInput {
  client_id: string;
  photographer_id: string | null;
  equipment_id: string | null;
  start_date: string;
  end_date: string;
}

export class UserBookingSource {
  /**
   * Checks if a piece of equipment is already booked during a requested date range.
   * Conflicting bookings have status 'approved' or 'ongoing' and overlap: start_date < end AND end_date > start.
   */
  static async checkAvailability(
    equipmentId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("equipment_id", equipmentId)
      .in("status", ["approved", "ongoing"])
      .lt("start_date", endDate)
      .gt("end_date", startDate)
      .limit(1);

    if (error) {
      console.error("Error checking availability in datasource:", error);
      throw error;
    }

    return data.length === 0;
  }

  /**
   * Inserts a new booking record into the Supabase database.
   */
  static async createNewBooking(bookingData: BookingInput) {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    
    // Calls the secure Backend Express API to calculate, validate overlap, and create the booking
    const response = await fetch(`${apiUrl}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to create booking through API.");
    }
    
    return result.data;
  }

  /**
   * Retrieves order history for a client.
   */
  static async fetchUserBookings(clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        start_date,
        end_date,
        status,
        total_price,
        created_at,
        equipment:equipment_id(id, name, image_url, price_per_day, category),
        photographer:photographer_id(id, full_name, avatar_url, role)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookings in datasource:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetches all registered photographers (profiles with role = photographer or admin).
   */
  static async fetchPhotographers(): Promise<any[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url, role, bio, base_price, experience_years")
      .in("role", ["photographer", "admin"]);

    if (error) {
      console.error("Error fetching photographers in datasource:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Fetches all available equipment catalog items.
   */
  static async fetchAvailableEquipment(): Promise<any[]> {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("status", "available");

    if (error) {
      console.error("Error fetching available equipment in datasource:", error);
      throw error;
    }

    return data || [];
  }
}

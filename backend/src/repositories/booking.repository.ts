import { SupabaseClient } from "@supabase/supabase-js";

export interface CreateBookingData {
  client_id: string;
  photographer_id?: string | null;
  equipment_id?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
}

export class BookingRepository {
  public supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Checks if a piece of equipment is already booked during a requested date range.
   * A conflict exists if there is an 'approved' or 'ongoing' booking that overlaps
   * with the requested range: start_date < requested_end AND end_date > requested_start.
   */
  async isEquipmentAvailable(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("bookings")
      .select("id")
      .eq("equipment_id", equipmentId)
      .in("status", ["approved", "ongoing"])
      .lt("start_date", endDate.toISOString())
      .gt("end_date", startDate.toISOString())
      .limit(1);

    if (error) {
      console.error("Database error in isEquipmentAvailable:", error);
      throw error;
    }

    // Available if no conflicting bookings are found
    return data.length === 0;
  }

  /**
   * Retrieves equipment information by ID.
   */
  async getEquipmentById(equipmentId: string) {
    const { data, error } = await this.supabase
      .from("equipment")
      .select("*")
      .eq("id", equipmentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Postgrest error code for 0 rows returned
        return null;
      }
      console.error("Database error in getEquipmentById:", error);
      throw error;
    }

    return data;
  }

  /**
   * Retrieves profile information by ID.
   */
  async getProfileById(profileId: string) {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Database error in getProfileById:", error);
      throw error;
    }

    return data;
  }

  /**
   * Inserts a new booking record into the database.
   */
  async createBooking(bookingData: CreateBookingData) {
    const { data, error } = await this.supabase
      .from("bookings")
      .insert([bookingData])
      .select()
      .single();

    if (error) {
      console.error("Database error in createBooking:", error);
      throw error;
    }

    return data;
  }

  /**
   * Updates the status of a booking record in the database.
   */
  async updateBookingStatus(bookingId: string, status: string) {
    const { data, error } = await this.supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.error("Database error in updateBookingStatus:", error);
      throw error;
    }

    return data;
  }
}

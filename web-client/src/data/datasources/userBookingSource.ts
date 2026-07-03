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

  /**
   * Fetch all booked/busy date ranges for a given photographer or equipment.
   */
  static async fetchBookedDates(
    resourceId: string,
    type: "photographer" | "equipment"
  ): Promise<{ start_date: string; end_date: string }[]> {
    const field = type === "photographer" ? "photographer_id" : "equipment_id";
    const { data, error } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq(field, resourceId)
      .in("status", ["pending", "approved", "ongoing"]);

    if (error) {
      console.error("Error fetching booked dates:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Upload equipment image to Supabase Storage bucket 'equipment'.
   */
  static async uploadEquipmentImage(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `equipment-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("equipment")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image to Supabase Storage:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("equipment")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Register a new piece of equipment for rent.
   */
  static async registerEquipment(
    name: string,
    category: string,
    pricePerDay: number,
    imageFile: File,
    ownerId: string
  ): Promise<any> {
    // 1. Upload the image file first
    const imageUrl = await this.uploadEquipmentImage(imageFile);

    // 2. Insert the database record
    const { data, error } = await supabase
      .from("equipment")
      .insert([{
        name,
        category,
        price_per_day: pricePerDay,
        image_url: imageUrl,
        owner_id: ownerId,
        status: "available"
      }])
      .select()
      .single();

    if (error) {
      console.error("Error registering equipment in database:", error);
      throw error;
    }

    return data;
  }

  /**
   * Fetch all equipment registered by a specific owner/lessor.
   */
  static async fetchMyEquipment(ownerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("owner_id", ownerId);

    if (error) {
      console.error("Error fetching owner's equipment:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * Toggle/update equipment status between 'available' and 'maintenance'.
   */
  static async updateEquipmentStatus(equipId: string, status: "available" | "maintenance"): Promise<any> {
    const { data, error } = await supabase
      .from("equipment")
      .update({ status })
      .eq("id", equipId)
      .select()
      .single();

    if (error) {
      console.error("Error updating equipment status:", error);
      throw error;
    }

    return data;
  }

  /**
   * Delete an equipment listing.
   */
  static async deleteEquipment(equipId: string): Promise<void> {
    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", equipId);

    if (error) {
      console.error("Error deleting equipment:", error);
      throw error;
    }
  }
}

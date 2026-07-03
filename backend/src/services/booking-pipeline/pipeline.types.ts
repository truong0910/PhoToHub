import { SupabaseClient } from "@supabase/supabase-js";
import { BookingRequestDto } from "../booking.service.js";

export interface BookingPipelineContext {
  dto: BookingRequestDto;
  supabase: SupabaseClient;
  locksAcquired: string[];
  totalPrice?: number;
  resultBooking?: any;
}

import { useState, useEffect } from "react";
import { UserBookingSource } from "../../data/datasources/userBookingSource.js";
import type { BookingInput } from "../../data/datasources/userBookingSource.js";
import { supabase } from "../../config/supabase.js";

export function useUserBooking() {
  // Authentication states
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

  // Lists
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Selection form states
  const [selectedPhotographer, setSelectedPhotographer] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Calculation states
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [calculatedDays, setCalculatedDays] = useState(0);

  // Status flags
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Check for active session and setup Auth listener on mount
  useEffect(() => {
    // Check current active session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setClientId(data.session.user.id);
        fetchClientProfile(data.session.user.id);
      } else {
        setLoading(false); // No session, stop initial loading to show AuthPage
      }
    });

    // Listen to changes in auth session (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setClientId(session.user.id);
        fetchClientProfile(session.user.id);
      } else {
        setClientId(null);
        setClientProfile(null);
        setMyBookings([]);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Helper: Query user profile metadata
  const fetchClientProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setClientProfile(data);
    } catch (err) {
      console.error("Error fetching client profile metadata:", err);
    }
  };

  // 2. Fetch photographers, equipment, and user bookings once clientId is established
  useEffect(() => {
    if (!clientId) return;

    async function loadData() {
      try {
        setLoading(true);
        const [photoData, equipData, bookingsData] = await Promise.all([
          UserBookingSource.fetchPhotographers(),
          UserBookingSource.fetchAvailableEquipment(),
          UserBookingSource.fetchUserBookings(clientId!),
        ]);
        setPhotographers(photoData);
        setEquipmentList(equipData);
        setMyBookings(bookingsData);
      } catch (err: any) {
        console.error("Hook initial load failure:", err);
        setErrorMsg(err.message || "Failed to load database dependencies.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [clientId]);

  // 3. Reactive calculation of days and pricing when inputs change
  useEffect(() => {
    if (!startDate || !endDate) {
      setCalculatedDays(0);
      setCalculatedPrice(0);
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setCalculatedDays(0);
      setCalculatedPrice(0);
      return;
    }

    const diffTime = end.getTime() - start.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setCalculatedDays(days);

    let price = 0;
    if (selectedEquipment) {
      const selectedItem = equipmentList.find((e) => e.id === selectedEquipment);
      if (selectedItem) {
        price += days * Number(selectedItem.price_per_day);
      }
    }
    if (selectedPhotographer) {
      const selectedPhoto = photographers.find((p) => p.id === selectedPhotographer);
      if (selectedPhoto) {
        price += days * (Number(selectedPhoto.base_price) || 150.00);
      }
    }
    setCalculatedPrice(price);
  }, [startDate, endDate, selectedEquipment, selectedPhotographer, equipmentList, photographers]);

  // 4. Re-fetch client history logs
  const refreshBookings = async () => {
    if (!clientId) return;
    try {
      const bookingsData = await UserBookingSource.fetchUserBookings(clientId);
      setMyBookings(bookingsData);
    } catch (err: any) {
      console.error("Hook refresh failure:", err);
    }
  };

  // 5. Submit booking logic with validation checks
  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!clientId) {
      setErrorMsg("Session expired. Please log in again.");
      return;
    }

    // Date validations
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      setErrorMsg("Booking end_date must be strictly after the start_date.");
      return;
    }

    try {
      setBookingLoading(true);

      const bookingData: BookingInput = {
        client_id: clientId,
        photographer_id: selectedPhotographer || null,
        equipment_id: selectedEquipment || null,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      };

      // Delegate persistence to the datasource
      const data = await UserBookingSource.createNewBooking(bookingData);

      setSuccessMsg("Đơn đặt của bạn đã được ghi nhận thành công ở trạng thái chờ duyệt!");
      
      // Reset selections
      setSelectedPhotographer("");
      setSelectedEquipment("");
      setStartDate("");
      setEndDate("");

      // Update local history
      await refreshBookings();
      return data;
    } catch (err: any) {
      console.error("Hook booking submission error:", err);
      setErrorMsg(err.message || "Đã xảy ra lỗi kết nối hoặc trùng lịch biểu.");
    } finally {
      setBookingLoading(false);
    }
  };

  return {
    clientId,
    clientProfile,
    photographers,
    equipmentList,
    myBookings,
    selectedPhotographer,
    setSelectedPhotographer,
    selectedEquipment,
    setSelectedEquipment,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    calculatedPrice,
    calculatedDays,
    loading,
    bookingLoading,
    successMsg,
    errorMsg,
    submitBooking,
    refreshBookings,
  };
}

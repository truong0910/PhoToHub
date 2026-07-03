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

  // Cart states (Persisted in LocalStorage)
  const [cartItems, setCartItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("photohub_cart");
    return saved ? JSON.parse(saved) : [];
  });

  // Busy/Unavailable Dates for Selected resource
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  // 1. Check for active session and setup Auth listener on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setClientId(data.session.user.id);
        fetchClientProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

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
        price += days * (Number(selectedPhoto.base_price) || 1500000);
      }
    }
    setCalculatedPrice(price);
  }, [startDate, endDate, selectedEquipment, selectedPhotographer, equipmentList, photographers]);

  // 4. Fetch Unavailable/Booked Dates Reactive
  useEffect(() => {
    async function loadUnavailableDates() {
      if (!selectedPhotographer && !selectedEquipment) {
        setUnavailableDates([]);
        return;
      }
      try {
        let ranges: any[] = [];
        if (selectedPhotographer) {
          const photogDates = await UserBookingSource.fetchBookedDates(selectedPhotographer, "photographer");
          ranges = [...ranges, ...photogDates];
        }
        if (selectedEquipment) {
          const equipDates = await UserBookingSource.fetchBookedDates(selectedEquipment, "equipment");
          ranges = [...ranges, ...equipDates];
        }

        const dates: string[] = [];
        ranges.forEach((r) => {
          let current = new Date(r.start_date);
          const end = new Date(r.end_date);
          current.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);

          while (current <= end) {
            dates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
          }
        });

        setUnavailableDates(Array.from(new Set(dates)).sort());
      } catch (err) {
        console.error("Error loading unavailable dates:", err);
      }
    }
    loadUnavailableDates();
  }, [selectedPhotographer, selectedEquipment]);

  // 5. Re-fetch client history logs
  const refreshBookings = async () => {
    if (!clientId) return;
    try {
      const bookingsData = await UserBookingSource.fetchUserBookings(clientId);
      setMyBookings(bookingsData);
    } catch (err: any) {
      console.error("Hook refresh failure:", err);
    }
  };

  // 6. Add Current Selection to Cart
  const addToCart = () => {
    if (!startDate || !endDate) {
      alert("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      alert("Ngày đặt lịch không hợp lệ.");
      return;
    }

    if (!selectedPhotographer && !selectedEquipment) {
      alert("Vui lòng chọn ít nhất một nhiếp ảnh gia hoặc thiết bị.");
      return;
    }

    // Check conflict
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const endCheck = new Date(endDate);
    endCheck.setHours(0, 0, 0, 0);
    
    let hasConflict = false;
    while (current <= endCheck) {
      const dateStr = current.toISOString().split("T")[0];
      if (unavailableDates.includes(dateStr)) {
        hasConflict = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    if (hasConflict) {
      alert("Khung thời gian này đã có lịch đặt trước. Vui lòng chọn ngày khác!");
      return;
    }

    const item = {
      cartId: Math.random().toString(36).substring(2, 9),
      photographerId: selectedPhotographer || null,
      photographerName: selectedPhotographer ? (photographers.find(p => p.id === selectedPhotographer)?.full_name || "Thợ ảnh") : null,
      equipmentId: selectedEquipment || null,
      equipmentName: selectedEquipment ? (equipmentList.find(e => e.id === selectedEquipment)?.name || "Thiết bị") : null,
      startDate,
      endDate,
      days: calculatedDays,
      price: calculatedPrice
    };

    const newCart = [...cartItems, item];
    setCartItems(newCart);
    localStorage.setItem("photohub_cart", JSON.stringify(newCart));
    alert("Đã thêm sản phẩm vào giỏ hàng thành công!");

    // Clear Form selections
    setSelectedPhotographer("");
    setSelectedEquipment("");
    setStartDate("");
    setEndDate("");
  };

  // Remove from Cart
  const removeFromCart = (cartId: string) => {
    const newCart = cartItems.filter((item) => item.cartId !== cartId);
    setCartItems(newCart);
    localStorage.setItem("photohub_cart", JSON.stringify(newCart));
  };

  // Checkout Selected items in Cart
  const checkoutCart = async (selectedCartIds: string[]) => {
    if (selectedCartIds.length === 0) {
      alert("Vui lòng chọn ít nhất một lịch đặt trong giỏ hàng.");
      return null;
    }

    const itemsToCheckout = cartItems.filter((item) => selectedCartIds.includes(item.cartId));
    if (itemsToCheckout.length === 0) return null;

    setBookingLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const batchCode = "PH" + Math.random().toString(36).substring(2, 6).toUpperCase();

    try {
      const createdBookings: any[] = [];

      for (const item of itemsToCheckout) {
        const bookingInput: any = {
          client_id: clientId!,
          photographer_id: item.photographerId,
          equipment_id: item.equipmentId,
          start_date: item.startDate,
          end_date: item.endDate,
          payment_code: batchCode
        };

        const created = await UserBookingSource.createNewBooking(bookingInput);
        createdBookings.push(created);
      }

      const remainingCart = cartItems.filter((item) => !selectedCartIds.includes(item.cartId));
      setCartItems(remainingCart);
      localStorage.setItem("photohub_cart", JSON.stringify(remainingCart));

      setSuccessMsg(`Đặt lịch thành công cho ${createdBookings.length} sản phẩm!`);
      await refreshBookings();

      return {
        paymentCode: batchCode,
        bookings: createdBookings,
        totalPrice: itemsToCheckout.reduce((sum, item) => sum + item.price, 0)
      };
    } catch (err: any) {
      console.error("Cart checkout error:", err);
      setErrorMsg(err.message || "Lỗi trong quá trình đặt lịch giỏ hàng.");
      return null;
    } finally {
      setBookingLoading(false);
    }
  };

  // 7. Submit booking logic with validation checks (Legacy single booking submit)
  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!clientId) {
      setErrorMsg("Session expired. Please log in again.");
      return;
    }

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

      const data = await UserBookingSource.createNewBooking(bookingData);
      setSuccessMsg("Đặt lịch thành công! Đang chờ thanh toán duyệt đơn.");

      setSelectedPhotographer("");
      setSelectedEquipment("");
      setStartDate("");
      setEndDate("");

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
    cartItems,
    unavailableDates,
    addToCart,
    removeFromCart,
    checkoutCart,
    submitBooking,
    refreshBookings,
  };
}

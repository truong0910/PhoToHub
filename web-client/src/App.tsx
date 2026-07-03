import { useState, useEffect } from "react";
import { useUserBooking } from "./domain/hooks/useUserBooking.js";
import { OrderHistory } from "./presentation/pages/OrderHistory.js";
import { AuthPage } from "./presentation/pages/AuthPage.js";
import { PhotographerDashboard } from "./presentation/pages/PhotographerDashboard.js";
import { supabase } from "./config/supabase.js";
import {
  ShoppingBag,
  Calendar,
  Tag,
  Star,
  UserCheck,
  Sparkles,
  X,
  Compass,
  CheckCircle,
  Loader,
  Share2,
  LogOut,
  CircleDollarSign,
  Trash2
} from "lucide-react";

interface PaymentCountdownProps {
  createdAt: string;
  timeoutDurationMs: number;
  onTimeout: () => void;
}

function PaymentCountdown({ createdAt, timeoutDurationMs, onTimeout }: PaymentCountdownProps) {
  const calculateRemaining = () => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diff = createdTime + timeoutDurationMs - now;
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateRemaining());

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeout();
      return;
    }

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        onTimeout();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <span className="font-mono text-xs font-bold text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded">
      ⏱️ Hạn thanh toán: {formatTime(secondsLeft)}
    </span>
  );
}

export default function App() {
  const hookData = useUserBooking();

  // Navigation Tabs: 'equipment' (Thuê Thiết Bị), 'photographer' (Thuê Người Chụp), 'orders' (Đơn Hàng), 'profile' (Hồ Sơ), 'cart' (Giỏ Hàng)
  const [activeTab, setActiveTab] = useState<"equipment" | "photographer" | "orders" | "profile" | "cart">("equipment");

  // Selected cart items checkboxes
  const [selectedCartIds, setSelectedCartIds] = useState<string[]>([]);

  // Equipment category filter: 'all', 'body', 'lens', 'lighting'
  const [equipCategory, setEquipCategory] = useState<"all" | "body" | "lens" | "lighting">("all");

  // Sorting criteria: 'default' | 'name' | 'price_low' | 'price_high'
  const [sortBy, setSortBy] = useState<"default" | "name" | "price_low" | "price_high">("default");

  // Selected product checkout modal state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // SePay newly created booking context (single or batch)
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  // SePay banking recipient configuration from backend env
  const [sepayConfig, setSepayConfig] = useState<any>(null);

  // Selected payment method in checkout modal: 'vietqr' | 'cash'
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"vietqr" | "cash">("vietqr");

  // Fetch active bank details on mount
  useEffect(() => {
    const loadSepayConfig = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await fetch(`${apiUrl}/payments/sepay-info`);
        const json = await response.json();
        if (json.success) {
          setSepayConfig(json.data);
        }
      } catch (err) {
        console.error("Failed to load SePay configs from API:", err);
      }
    };
    loadSepayConfig();
  }, []);

  // Sync dates from modal selection to domain hook
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setCreatedBooking(null);
    setCheckoutPaymentMethod("vietqr");
    hookData.setSelectedPhotographer("");
    hookData.setSelectedEquipment("");
    hookData.setStartDate("");
    hookData.setEndDate("");

    if (product.type === "photographer") {
      hookData.setSelectedPhotographer(product.id);
    } else {
      hookData.setSelectedEquipment(product.id);
    }
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setCreatedBooking(null);
  };

  const handlePayExistingBooking = (booking: any) => {
    setCheckoutPaymentMethod("vietqr");
    if (booking.equipment) {
      setSelectedProduct({
        id: booking.equipment.id,
        name: booking.equipment.name,
        avatar: booking.equipment.image_url || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
        price: booking.equipment.price_per_day,
        category: booking.equipment.category || "body",
        type: "equipment"
      });
    } else if (booking.photographer) {
      setSelectedProduct({
        id: booking.photographer.id,
        name: booking.photographer.full_name,
        avatar: booking.photographer.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
        price: 80,
        category: "photographer",
        type: "photographer"
      });
    } else {
      setSelectedProduct({
        id: "unknown",
        name: "Dịch vụ đặt lịch PhotoHub",
        avatar: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
        price: booking.total_price,
        category: "service",
        type: "service"
      });
    }
    setCreatedBooking(booking);
  };

  const handleConfirmCashPayment = async (bookingId: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      if (createdBooking?.isBatch) {
        // Approve all bookings in the batch via REST API
        await Promise.all(createdBooking.bookings.map(async (b: any) => {
          const response = await fetch(`${apiUrl}/bookings/${b.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "approved" }),
          });
          if (!response.ok) throw new Error("Gặp lỗi khi duyệt đơn trong nhóm.");
        }));

        alert("Xác nhận thanh toán tiền mặt nhóm thành công!");
        setCreatedBooking((prev: any) => ({ ...prev, status: "approved" }));
        await hookData.refreshBookings();
      } else {
        const response = await fetch(`${apiUrl}/bookings/${bookingId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "approved" }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to confirm cash payment.");
        }

        const result = await response.json();
        setCreatedBooking(result.data);
        await hookData.refreshBookings();
      }
    } catch (err: any) {
      console.error("Failed to approve cash payment:", err);
      alert(`Không thể xác nhận thanh toán tiền mặt: ${err.message}`);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng đặt lịch này không?")) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      if (createdBooking?.isBatch) {
        await Promise.all(createdBooking.bookings.map(async (b: any) => {
          await fetch(`${apiUrl}/bookings/${b.id}/status`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "cancelled" }),
          });
        }));
      } else {
        const response = await fetch(`${apiUrl}/bookings/${bookingId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Failed to cancel booking.");
        }
      }

      handleCloseModal();
      await hookData.refreshBookings();
    } catch (err: any) {
      console.error("Failed to cancel booking:", err);
      alert(`Không thể hủy đơn đặt lịch: ${err.message}`);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct?.type === "cart") {
      await handleCartCheckoutSubmit(selectedCartIds);
    } else {
      const data = await hookData.submitBooking(e);
      if (data) {
        setCreatedBooking(data);
      }
    }
  };

  const handleCartCheckoutSubmit = async (cartIds: string[]) => {
    const res = await hookData.checkoutCart(cartIds);
    if (res) {
      setCreatedBooking({
        id: res.paymentCode,
        total_price: res.totalPrice,
        created_at: new Date().toISOString(),
        isBatch: true,
        bookings: res.bookings
      });
      setSelectedCartIds([]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. Loading screen during session synchronization
  if (hookData.loading && !hookData.clientId) {
    return (
      <div className="min-h-screen bg-photohub-sand flex items-center justify-center font-sans">
        <div className="text-photohub-teal text-sm animate-pulse flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-photohub-orange" />
          <span className="font-semibold">Đang kết nối hệ thống PhotoHub...</span>
        </div>
      </div>
    );
  }

  // 2. Redirect to Login/Registration Page if there is no active session
  if (!hookData.clientId) {
    return <AuthPage />;
  }

  const clientName = hookData.clientProfile?.full_name || "Thành Viên";
  const clientRole = hookData.clientProfile?.role || "client";
  const clientPhone = hookData.clientProfile?.phone || "Chưa cập nhật SĐT";

  // If photographer, render photographer dashboard directly
  if (clientRole === "photographer") {
    return <PhotographerDashboard currentUserId={hookData.clientId} clientName={clientName} />;
  }

  // 3. Process photographer products
  const photographerProducts = hookData.photographers.map((p) => ({
    id: p.id,
    name: p.full_name || "Nhiếp ảnh gia mới",
    type: "photographer",
    category: p.role === "admin" ? "Master Director" : "Senior Portraitist",
    price: Number(p.base_price) || 1500000,
    rating: 4.9,
    reviews: 32,
    avatar: p.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    desc: p.bio || "Nhiếp ảnh gia chuyên nghiệp sở hữu nhiều năm kinh nghiệm, kỹ năng bố cục ánh sáng điện ảnh, hậu kỳ chuyên nghiệp.",
    badge: `${p.experience_years || 5} năm kinh nghiệm`,
    specs: [
      `Kinh nghiệm: ${p.experience_years || 5} năm`,
      `Điện thoại: ${p.phone || "Chưa cập nhật"}`,
      "Bao gồm làm màu ảnh chuyên sâu",
      "Trả file ảnh gốc chất lượng cao"
    ],
  }));

  // 4. Process equipment products
  const equipmentProducts = hookData.equipmentList.map((e) => ({
    id: e.id,
    name: e.name,
    type: "equipment",
    rawCategory: e.category, // 'body', 'lens', 'lighting'
    category: e.category === "body" ? "CHỤP ẢNH 📸" : e.category === "lens" ? "LENS CHUYÊN DỤNG 🔋" : "THIẾT BỊ ÁNH SÁNG 🎧",
    price: Number(e.price_per_day),
    rating: 4.8,
    reviews: 24,
    avatar: e.image_url || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
    desc: "Thiết bị chụp ảnh studio cao cấp được bảo dưỡng định kỳ, thấu kính sạch sẽ không trầy xước, cảm biến hoạt động hoàn hảo.",
    badge: "Sẵn có",
    specs: ["Bảo hành trách nhiệm", "Đầy đủ pin & sạc đi kèm", "Hỗ trợ kỹ thuật 24/7"],
  }));

  // 5. Apply filters and sort order
  const filteredEquipment = equipmentProducts
    .filter((e) => equipCategory === "all" || e.rawCategory === equipCategory);

  if (sortBy === "name") {
    filteredEquipment.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "price_low") {
    filteredEquipment.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_high") {
    filteredEquipment.sort((a, b) => b.price - a.price);
  }

  return (
    <div className="min-h-screen bg-photohub-sand text-photohub-teal flex flex-col font-sans selection:bg-photohub-orange selection:text-white">
      {/* 1. Header Navigation Bar */}
      <header className="h-20 border-b border-photohub-teal/10 bg-photohub-sand px-8 flex justify-between items-center sticky top-0 z-30 backdrop-blur-md bg-photohub-sand/90">
        <div className="flex items-center gap-6">
          <div className="flex flex-col cursor-pointer" onClick={() => setActiveTab("equipment")}>
            <h1 className="text-2xl font-extrabold tracking-tight font-serif text-photohub-teal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-photohub-orange fill-photohub-orange" />
              <span>PhotoHub</span>
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-photohub-muted font-bold font-mono">Studio & Rental Store</span>
          </div>
        </div>

        {/* Top level Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("equipment")}
            className={`px-4 py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === "equipment"
                ? "bg-photohub-teal text-white shadow"
                : "text-photohub-teal/75 hover:bg-photohub-teal/5"
              }`}
          >
            THUÊ THIẾT BỊ
          </button>
          <button
            onClick={() => setActiveTab("photographer")}
            className={`px-4 py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === "photographer"
                ? "bg-photohub-teal text-white shadow"
                : "text-photohub-teal/75 hover:bg-photohub-teal/5"
              }`}
          >
            THUÊ NGƯỜI CHỤP
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-lg transition-all cursor-pointer relative ${activeTab === "orders"
                ? "bg-photohub-teal text-white shadow"
                : "text-photohub-teal/75 hover:bg-photohub-teal/5"
              }`}
          >
            ĐƠN HÀNG
            {hookData.myBookings.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-photohub-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {hookData.myBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("cart")}
            className={`px-4 py-2.5 rounded-lg transition-all cursor-pointer relative ${activeTab === "cart"
                ? "bg-photohub-teal text-white shadow"
                : "text-photohub-teal/75 hover:bg-photohub-teal/5"
              }`}
          >
            GIỎ HÀNG
            {hookData.cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-photohub-orange text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {hookData.cartItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-lg transition-all cursor-pointer ${activeTab === "profile"
                ? "bg-photohub-teal text-white shadow"
                : "text-photohub-teal/75 hover:bg-photohub-teal/5"
              }`}
          >
            HỒ SƠ
          </button>
        </nav>

        {/* Profile User Panel & LogOut */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-photohub-teal">{clientName}</div>
            <div className="text-[9px] uppercase tracking-wider text-photohub-orange font-bold font-mono font-serif">Hạng {clientRole === "admin" ? "Admin" : "Thành Viên"}</div>
          </div>
          <button
            onClick={() => setActiveTab("profile")}
            className="h-10 w-10 rounded-full bg-photohub-teal text-photohub-sand font-bold text-sm border border-photohub-teal/10 flex items-center justify-center cursor-pointer transition-transform active:scale-95"
          >
            {clientName.substring(0, 2).toUpperCase()}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-photohub-muted hover:text-photohub-orange transition-colors cursor-pointer"
            title="Đăng xuất tài khoản"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile nav indicator bar */}
      <div className="md:hidden flex border-b border-photohub-teal/5 bg-photohub-sand p-2 text-xs justify-around font-semibold sticky top-20 z-20">
        <button
          onClick={() => setActiveTab("equipment")}
          className={`flex-1 py-2 text-center rounded ${activeTab === "equipment" ? "bg-photohub-teal text-white" : "text-photohub-teal/70"}`}
        >
          Thiết Bị
        </button>
        <button
          onClick={() => setActiveTab("photographer")}
          className={`flex-1 py-2 text-center rounded ${activeTab === "photographer" ? "bg-photohub-teal text-white" : "text-photohub-teal/70"}`}
        >
          Người Chụp
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 text-center rounded relative ${activeTab === "orders" ? "bg-photohub-teal text-white" : "text-photohub-teal/70"}`}
        >
          Đơn ({hookData.myBookings.length})
        </button>
        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-2 text-center rounded relative ${activeTab === "cart" ? "bg-photohub-teal text-white" : "text-photohub-teal/70"}`}
        >
          Giỏ ({hookData.cartItems.length})
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 py-2 text-center rounded ${activeTab === "profile" ? "bg-photohub-teal text-white" : "text-photohub-teal/70"}`}
        >
          Hồ Sơ
        </button>
      </div>

      {/* 2. Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-12">
        {/* TAB 1: THUÊ THIẾT BỊ (E-Commerce style matching image) */}
        {activeTab === "equipment" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="rounded-2xl bg-photohub-teal text-photohub-sand p-8 md:p-10 shadow border border-photohub-teal flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-widest text-photohub-orange font-bold">Studio Gear Store</span>
                <h2 className="text-3xl md:text-4xl font-extrabold font-serif">Dịch Vụ Thuê Thiết Bị Máy Ảnh</h2>
                <p className="text-xs text-photohub-muted max-w-xl leading-relaxed">
                  Trải nghiệm hệ sinh thái các dòng camera mirrorless hàng đầu, lens khẩu độ lớn và thiết bị ánh sáng studio chuyên nghiệp.
                </p>
              </div>
            </div>

            <div className="bg-white border border-photohub-teal/5 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-photohub-teal uppercase tracking-widest font-mono">DANH MỤC</span>
                  <span className="text-xs text-photohub-muted font-bold font-mono font-serif">Hiển thị {filteredEquipment.length} sản phẩm</span>
                </div>

                <div className="flex flex-wrap gap-3 font-semibold text-xs text-photohub-teal">
                  <button
                    onClick={() => setEquipCategory("all")}
                    className={`px-5 py-3 rounded-full border transition-all cursor-pointer ${equipCategory === "all"
                        ? "bg-photohub-teal border-photohub-teal text-white shadow-sm font-bold"
                        : "bg-white border-photohub-teal/20 hover:border-photohub-teal/40"
                      }`}
                  >
                    TẤT CẢ
                  </button>
                  <button
                    onClick={() => setEquipCategory("body")}
                    className={`px-5 py-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${equipCategory === "body"
                        ? "bg-photohub-teal border-photohub-teal text-white shadow-sm font-bold"
                        : "bg-white border-photohub-teal/20 hover:border-photohub-teal/40"
                      }`}
                  >
                    <span>CHỤP ẢNH 📸</span>
                  </button>
                  <button
                    onClick={() => setEquipCategory("lens")}
                    className={`px-5 py-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${equipCategory === "lens"
                        ? "bg-photohub-teal border-photohub-teal text-white shadow-sm font-bold"
                        : "bg-white border-photohub-teal/20 hover:border-photohub-teal/40"
                      }`}
                  >
                    <span>THUÊ LENS - PHỤ KIỆN 🔋</span>
                  </button>
                  <button
                    onClick={() => setEquipCategory("lighting")}
                    className={`px-5 py-3 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${equipCategory === "lighting"
                        ? "bg-photohub-teal border-photohub-teal text-white shadow-sm font-bold"
                        : "bg-white border-photohub-teal/20 hover:border-photohub-teal/40"
                      }`}
                  >
                    <span>THUÊ PHỤ KIỆN KHÁC 🎧</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-photohub-teal/5 pt-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-extrabold font-mono text-photohub-teal/50 uppercase">SẮP XẾP:</span>
                  <div className="flex border border-photohub-teal/10 rounded-lg overflow-hidden font-semibold">
                    <button
                      onClick={() => setSortBy("default")}
                      className={`px-3 py-1.5 ${sortBy === "default" ? "bg-photohub-teal/10 font-bold" : "hover:bg-photohub-teal/5"}`}
                    >
                      Mặc định
                    </button>
                    <button
                      onClick={() => setSortBy("name")}
                      className={`px-3 py-1.5 border-l border-photohub-teal/10 ${sortBy === "name" ? "bg-photohub-teal/10 font-bold" : "hover:bg-photohub-teal/5"}`}
                    >
                      TÊN A-Z
                    </button>
                    <button
                      onClick={() => setSortBy("price_low")}
                      className={`px-3 py-1.5 border-l border-photohub-teal/10 ${sortBy === "price_low" ? "bg-photohub-teal/10 font-bold" : "hover:bg-photohub-teal/5"}`}
                    >
                      GIÁ THẤP
                    </button>
                    <button
                      onClick={() => setSortBy("price_high")}
                      className={`px-3 py-1.5 border-l border-photohub-teal/10 ${sortBy === "price_high" ? "bg-photohub-teal/10 font-bold" : "hover:bg-photohub-teal/5"}`}
                    >
                      GIÁ CAO
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {filteredEquipment.length === 0 ? (
              <div className="text-center py-20 text-photohub-muted border border-dashed border-photohub-teal/10 rounded-2xl bg-white">
                Không tìm thấy thiết bị nào phù hợp với danh mục tìm kiếm.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {filteredEquipment.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-photohub-teal/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="h-56 w-full object-cover border-b border-photohub-teal/5"
                    />

                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] bg-photohub-teal text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {p.category}
                          </span>
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{p.rating}</span>
                          </div>
                        </div>

                        <h3 className="font-bold text-lg text-photohub-teal font-serif">
                          {p.name}
                        </h3>

                        <p className="text-xs text-photohub-muted leading-relaxed">
                          {p.desc}
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {p.specs.map((spec, idx) => (
                            <span key={idx} className="text-[8px] bg-photohub-sand text-photohub-teal/70 px-1.5 py-0.5 rounded font-semibold uppercase font-mono">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-photohub-teal/5">
                        <div>
                          <span className="text-[9px] text-photohub-muted font-bold uppercase tracking-wider block font-serif">Giá thuê ngày</span>
                          <div className="text-base font-extrabold font-mono text-photohub-teal">
                            {p.price.toLocaleString('vi-VN')} đ
                            <span className="text-[10px] font-semibold text-photohub-muted font-serif">/ngày</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleProductSelect(p)}
                          className="bg-photohub-orange hover:bg-photohub-orange/95 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          Thuê Ngay
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THUÊ NGƯỜI CHỤP (Photographers list) */}
        {activeTab === "photographer" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="rounded-2xl bg-photohub-teal text-photohub-sand p-8 md:p-10 shadow border border-photohub-teal">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-widest text-photohub-orange font-bold">Portfolios Matching</span>
                <h2 className="text-3xl md:text-4xl font-extrabold font-serif">Kết Nối Nhiếp Ảnh Gia Chuyên Nghiệp</h2>
                <p className="text-xs text-photohub-muted max-w-xl leading-relaxed">
                  Lựa chọn nhân sự chụp ảnh phù hợp với phong cách chụp ảnh cưới, sự kiện doanh nghiệp, chụp ảnh chân dung ngoại cảnh hoặc lookbook thời trang.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {photographerProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-photohub-teal/10 rounded-2xl p-6 flex flex-col sm:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="h-28 w-28 rounded-xl object-cover border border-photohub-teal/10 shadow-md self-center sm:self-start"
                  />

                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-photohub-orange font-bold font-mono block">
                            {p.category}
                          </span>
                          <h3 className="text-lg font-bold text-photohub-teal font-serif">
                            {p.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{p.rating}</span>
                        </div>
                      </div>

                      <p className="text-xs text-photohub-muted leading-relaxed">
                        {p.desc}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {p.specs.map((spec, idx) => (
                          <span key={idx} className="text-[8px] bg-photohub-sand text-photohub-teal/80 px-2 py-0.5 rounded font-semibold uppercase">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-photohub-teal/5">
                      <div>
                        <span className="text-[9px] text-photohub-muted font-bold uppercase tracking-wider block font-serif">Chi phí buổi chụp</span>
                        <span className="text-base font-extrabold font-mono text-photohub-teal">{p.price.toLocaleString('vi-VN')} đ/buổi</span>
                      </div>

                      <button
                        onClick={() => handleProductSelect(p)}
                        className="bg-photohub-orange hover:bg-photohub-orange/95 text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-transform active:scale-95"
                      >
                        Đặt Lịch Ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ĐƠN HÀNG */}
        {activeTab === "orders" && (
          <div className="animate-fadeIn">
            <OrderHistory
              clientId={hookData.clientId!}
              bookings={hookData.myBookings}
              refreshBookings={hookData.refreshBookings}
              onSelectBookingForPayment={handlePayExistingBooking}
              timeoutDurationMs={sepayConfig?.timeoutDurationMs || 15 * 60 * 1000}
            />
          </div>
        )}

        {/* TAB 4: HỒ SƠ CỦA TÔI */}
        {activeTab === "profile" && (
          <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
            <div className="bg-white border border-photohub-teal/10 rounded-2xl p-8 space-y-6 shadow-md">
              <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-photohub-teal/10 pb-6">
                <div className="h-20 w-20 rounded-full bg-photohub-teal text-photohub-sand font-bold text-3xl flex items-center justify-center border border-photohub-orange/20 shadow-md">
                  {clientName.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-2xl font-bold font-serif text-photohub-teal">{clientName}</h2>
                    <span className="inline-block bg-photohub-orange/10 text-photohub-orange text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      Khách hàng thân thiết
                    </span>
                  </div>
                  <p className="text-xs text-photohub-muted">Mã tài khoản: {hookData.clientId}</p>
                  <p className="text-xs text-photohub-muted flex items-center justify-center sm:justify-start gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-photohub-orange" />
                    <span>Thành viên hệ sinh thái PhotoHub từ 2026</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-photohub-sand/50 p-4 rounded-xl border border-photohub-teal/5 text-center">
                  <span className="text-[10px] text-photohub-muted font-bold uppercase tracking-wider block">ĐƠN ĐẶT LỊCH</span>
                  <span className="text-xl font-extrabold font-mono text-photohub-teal mt-1 block">
                    {hookData.myBookings.length}
                  </span>
                </div>
                <div className="bg-photohub-sand/50 p-4 rounded-xl border border-photohub-teal/5 text-center">
                  <span className="text-[10px] text-photohub-muted font-bold uppercase tracking-wider block">ĐIỂM THƯỞNG</span>
                  <span className="text-xl font-extrabold font-mono text-photohub-teal mt-1 block">450</span>
                </div>
                <div className="bg-photohub-sand/50 p-4 rounded-xl border border-photohub-teal/5 text-center">
                  <span className="text-[10px] text-photohub-muted font-bold uppercase tracking-wider block">HẠNG THÀNH VIÊN</span>
                  <span className="text-xl font-extrabold font-serif text-photohub-orange mt-1 block">
                    {clientRole === "admin" ? "Admin" : "Silver"}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-photohub-teal uppercase tracking-wider font-serif">Thông Tin Liên Hệ</h3>
                <div className="divide-y divide-photohub-teal/5 text-sm">
                  <div className="py-3 flex justify-between">
                    <span className="text-photohub-muted">Số điện thoại:</span>
                    <span className="font-semibold">{clientPhone}</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-photohub-muted">Hòm thư điện tử:</span>
                    <span className="font-semibold">{hookData.clientId ? "Đã liên kết phiên" : "Chưa liên kết"}</span>
                  </div>
                  <div className="py-3 flex justify-between">
                    <span className="text-photohub-muted">Ưu đãi truy cập:</span>
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-photohub-orange fill-photohub-orange" />
                      <span>Chiết khấu 5% cho hóa đơn tiếp theo</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: GIỎ HÀNG */}
        {activeTab === "cart" && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-md">
              <div className="flex justify-between items-center border-b border-photohub-teal/5 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-photohub-teal font-serif">Giỏ Hàng Đặt Lịch</h2>
                  <p className="text-xs text-photohub-muted">Quản lý và thanh toán đồng thời nhiều lịch đặt chụp</p>
                </div>
                <span className="text-[10px] bg-photohub-sand text-photohub-teal/70 px-2.5 py-1 rounded border border-photohub-teal/10 font-bold font-mono">
                  {hookData.cartItems.length} Sản phẩm
                </span>
              </div>

              {hookData.cartItems.length === 0 ? (
                <div className="text-center py-20 text-photohub-muted text-xs border border-dashed border-photohub-teal/10 rounded-xl bg-photohub-sand/20 space-y-3">
                  <ShoppingBag className="w-10 h-10 text-photohub-teal/10 mx-auto animate-bounce" />
                  <p className="font-semibold">Giỏ hàng của bạn đang trống.</p>
                  <button
                    onClick={() => setActiveTab("equipment")}
                    className="bg-photohub-teal text-white px-4 py-2 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Khám phá dịch vụ & thiết bị
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All Checkbox */}
                  <div className="flex items-center gap-2 text-xs font-bold border-b border-photohub-teal/5 pb-3">
                    <input
                      type="checkbox"
                      checked={selectedCartIds.length === hookData.cartItems.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCartIds(hookData.cartItems.map((item: any) => item.cartId));
                        } else {
                          setSelectedCartIds([]);
                        }
                      }}
                      className="rounded border-photohub-teal/10 text-photohub-teal focus:ring-photohub-orange h-4 w-4 cursor-pointer"
                    />
                    <span>Chọn tất cả ({hookData.cartItems.length})</span>
                  </div>

                  <div className="divide-y divide-photohub-teal/5 space-y-4">
                    {hookData.cartItems.map((item: any) => (
                      <div key={item.cartId} className="flex gap-4 items-start pt-4 first:pt-0">
                        <input
                          type="checkbox"
                          checked={selectedCartIds.includes(item.cartId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCartIds([...selectedCartIds, item.cartId]);
                            } else {
                              setSelectedCartIds(selectedCartIds.filter(id => id !== item.cartId));
                            }
                          }}
                          className="mt-1.5 rounded border-photohub-teal/10 text-photohub-teal focus:ring-photohub-orange h-4 w-4 cursor-pointer"
                        />
                        
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 space-y-1">
                            <h4 className="text-xs font-extrabold text-photohub-teal flex flex-wrap gap-2 items-center">
                              {item.photographerName && (
                                <span className="bg-photohub-orange/10 text-photohub-orange text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                  📸 Thợ Ảnh: {item.photographerName}
                                </span>
                              )}
                              {item.equipmentName && (
                                <span className="bg-photohub-teal/10 text-photohub-teal text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                  ⚙️ Thiết Bị: {item.equipmentName}
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-photohub-muted font-mono flex items-center gap-1 font-semibold">
                              📅 {new Date(item.startDate).toLocaleDateString("vi-VN")} - {new Date(item.endDate).toLocaleDateString("vi-VN")} ({item.days} ngày)
                            </p>
                          </div>
                          
                          <div className="text-left md:text-right font-mono flex md:flex-col justify-between items-center md:items-end">
                            <span className="text-[9px] text-photohub-muted font-bold block md:hidden">Tạm tính:</span>
                            <span className="text-xs font-extrabold text-photohub-orange">
                              {item.price.toLocaleString("vi-VN")} đ
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            hookData.removeFromCart(item.cartId);
                            setSelectedCartIds(selectedCartIds.filter(id => id !== item.cartId));
                          }}
                          className="p-1.5 text-photohub-muted hover:text-rose-500 transition-colors cursor-pointer"
                          title="Xóa khỏi giỏ hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="border-t border-photohub-teal/5 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-photohub-sand/35 p-5 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-photohub-muted font-bold block uppercase tracking-wider font-mono">Đã chọn ({selectedCartIds.length} mục)</span>
                      <span className="text-lg font-bold text-photohub-teal font-serif">
                        Tổng tiền nhóm:{" "}
                        <span className="text-photohub-orange font-mono">
                          {hookData.cartItems
                            .filter((item: any) => selectedCartIds.includes(item.cartId))
                            .reduce((sum: number, item: any) => sum + item.price, 0)
                            .toLocaleString("vi-VN")} đ
                        </span>
                      </span>
                    </div>

                    <button
                      onClick={async () => {
                        const total = hookData.cartItems
                          .filter((item: any) => selectedCartIds.includes(item.cartId))
                          .reduce((sum: number, item: any) => sum + item.price, 0);

                        setSelectedProduct({
                          id: "cart",
                          name: `Đơn hàng giỏ hàng (${selectedCartIds.length} lịch đặt)`,
                          type: "cart",
                          price: total,
                          avatar: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400",
                          category: "cart"
                        });
                        
                        await handleCartCheckoutSubmit(selectedCartIds);
                      }}
                      disabled={selectedCartIds.length === 0 || hookData.bookingLoading}
                      className="bg-photohub-orange hover:bg-photohub-orange/95 text-white font-bold px-6 py-3 rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {hookData.bookingLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Đang gửi đặt lịch...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Đặt lịch & Thanh toán nhóm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Product Selection Modal / Checkout Drawer */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-photohub-teal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-photohub-teal/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-photohub-teal text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Tag className="w-5 h-5 text-photohub-orange" />
                <h3 className="text-lg font-bold font-serif">Xác nhận thanh toán đặt lịch</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Product Brief */}
              <div className="flex gap-4 items-start bg-photohub-sand p-4 rounded-xl border border-photohub-teal/5">
                <img
                  src={selectedProduct.avatar}
                  alt={selectedProduct.name}
                  className="h-16 w-16 object-cover rounded-lg border border-photohub-teal/10 shadow-sm"
                />
                <div className="space-y-1">
                  <span className="text-[9px] bg-photohub-teal text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider font-serif">
                    {selectedProduct.category}
                  </span>
                  <h4 className="font-bold text-base text-photohub-teal font-serif">{selectedProduct.name}</h4>
                  <div className="text-xs font-bold text-photohub-orange font-mono">
                    {selectedProduct.type === "cart" 
                      ? `${selectedProduct.price.toLocaleString('vi-VN')} đ` 
                      : `${selectedProduct.price.toLocaleString('vi-VN')} đ/${selectedProduct.type === "photographer" ? "buổi" : "ngày"}`}
                  </div>
                </div>
              </div>

              {createdBooking ? (
                /* SePay Payment Box */
                (() => {
                  const currentBookingState = hookData.myBookings.find(b => b.id === createdBooking?.id);
                  const isPaid = currentBookingState?.status === "approved" || currentBookingState?.status === "ongoing" || currentBookingState?.status === "completed" || createdBooking?.status === "approved";

                  return (
                    <div className="space-y-6 text-xs text-photohub-teal">
                      {!isPaid ? (
                        <>
                          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-semibold animate-pulse">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                              <span>Đơn đặt lịch đang chờ xác nhận thanh toán...</span>
                            </div>
                            {sepayConfig?.timeoutDurationMs && (
                              <PaymentCountdown
                                createdAt={createdBooking.created_at}
                                timeoutDurationMs={sepayConfig.timeoutDurationMs}
                                onTimeout={() => {
                                  alert("Thời gian giữ chỗ thanh toán cho đơn hàng này đã hết hạn!");
                                  handleCloseModal();
                                }}
                              />
                            )}
                          </div>

                          {/* Payment Method Toggle Tabs */}
                          <div className="flex border border-photohub-teal/10 rounded-lg overflow-hidden bg-photohub-sand/20 text-xs">
                            <button
                              type="button"
                              onClick={() => setCheckoutPaymentMethod("vietqr")}
                              className={`flex-1 py-2 font-bold transition-all duration-200 cursor-pointer ${
                                checkoutPaymentMethod === "vietqr"
                                  ? "bg-photohub-teal text-white shadow-sm"
                                  : "text-photohub-teal/70 hover:bg-photohub-sand/45"
                              }`}
                            >
                              💳 Chuyển khoản VietQR
                            </button>
                            <button
                              type="button"
                              onClick={() => setCheckoutPaymentMethod("cash")}
                              className={`flex-1 py-2 font-bold transition-all duration-200 cursor-pointer ${
                                checkoutPaymentMethod === "cash"
                                  ? "bg-photohub-teal text-white shadow-sm"
                                  : "text-photohub-teal/70 hover:bg-photohub-sand/45"
                              }`}
                            >
                              💵 Tiền mặt tại quầy
                            </button>
                          </div>

                          {checkoutPaymentMethod === "vietqr" ? (
                            // VietQR details block
                            !sepayConfig || !sepayConfig.bankId ? (
                              <div className="flex flex-col items-center justify-center p-8 bg-photohub-sand/30 border border-photohub-teal/10 rounded-xl space-y-3 w-full animate-fadeIn">
                                <Loader className="w-6 h-6 animate-spin text-photohub-orange" />
                                <span className="text-[11px] font-mono text-photohub-muted font-bold">Đang tải cấu hình thanh toán SePay...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col md:flex-row gap-6 items-center bg-photohub-sand/50 p-6 rounded-xl border border-photohub-teal/5 animate-fadeIn">
                                {/* QR VietQR code container */}
                                <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-photohub-teal/10 shadow-sm">
                                  <img
                                    src={`https://img.vietqr.io/image/${sepayConfig.bankId}-${sepayConfig.accountNo}-compact2.png?amount=${Math.round(createdBooking.total_price)}&addInfo=${createdBooking.isBatch ? createdBooking.id : `PH${createdBooking.id.substring(0, 8)}`}&accountName=${encodeURIComponent(sepayConfig.accountName)}`}
                                    alt="VietQR SePay Payment"
                                    className="h-40 w-40 object-contain"
                                  />
                                  <span className="text-[9px] text-photohub-muted font-bold tracking-wider font-mono">{sepayConfig.bankId.toUpperCase()} BANK VIETQR</span>
                                </div>

                                {/* Banking details */}
                                <div className="flex-1 space-y-3 font-semibold leading-relaxed">
                                  <div>
                                    <span className="text-[9px] text-photohub-muted block uppercase font-bold tracking-wide">Ngân hàng thụ hưởng</span>
                                    <span className="text-xs font-serif font-bold">{sepayConfig.bankId} Bank</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-photohub-muted block uppercase font-bold tracking-wide">Số tài khoản</span>
                                    <span className="text-xs font-mono font-bold text-photohub-orange select-all">{sepayConfig.accountNo}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-photohub-muted block uppercase font-bold tracking-wide">Chủ tài khoản</span>
                                    <span className="text-xs font-bold uppercase">{sepayConfig.accountName}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-photohub-muted block uppercase font-bold tracking-wide">Số tiền chuyển khoản</span>
                                    <span className="text-xs font-mono font-bold text-photohub-orange">
                                      {createdBooking.total_price.toLocaleString('vi-VN')} đ
                                    </span>
                                  </div>
                                  <div className="bg-white p-2.5 rounded border border-photohub-teal/5">
                                    <span className="text-[9px] text-photohub-muted block uppercase font-bold tracking-wide">Nội dung chuyển khoản (bắt buộc)</span>
                                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded select-all">
                                      {createdBooking.isBatch ? createdBooking.id : `PH${createdBooking.id.substring(0, 8)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          ) : (
                            // Cash details block
                            <div className="flex flex-col items-center justify-center p-6 bg-photohub-sand/40 border border-photohub-teal/10 rounded-xl space-y-4 text-center animate-fadeIn">
                              <div className="bg-emerald-500/10 text-emerald-600 p-3.5 rounded-full border border-emerald-500/20 shadow-inner">
                                <CircleDollarSign className="w-8 h-8" />
                              </div>
                              <div className="space-y-1">
                                <h5 className="font-bold text-sm text-photohub-teal font-serif">Thanh toán bằng Tiền mặt</h5>
                                <p className="text-[11px] text-photohub-muted max-w-sm leading-relaxed">
                                  Đơn hàng của bạn sẽ được giữ chỗ thành công trên hệ thống. Quý khách vui lòng thanh toán trực tiếp tại PhotoHub Studio khi bắt đầu sử dụng dịch vụ.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleConfirmCashPayment(createdBooking.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs cursor-pointer shadow transition-all duration-200 font-serif"
                              >
                                Xác nhận giữ chỗ & Thanh toán tiền mặt
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-photohub-teal/5 pt-4">
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(createdBooking.id)}
                              className="border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition-colors"
                            >
                              Hủy Đặt Lịch
                            </button>
                            <div className="text-right text-[10px] text-photohub-muted leading-relaxed font-mono font-semibold">
                              {checkoutPaymentMethod === "vietqr" ? (
                                <>
                                  ⏳ Hệ thống đang lắng nghe giao dịch qua SePay...
                                  <br />
                                  Đơn hàng sẽ tự động xác thực khi nhận được chuyển khoản.
                                </>
                              ) : (
                                <>
                                  💵 Bấm nút phía trên để xác nhận giữ chỗ bằng tiền mặt.
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6 space-y-4 animate-scaleUp">
                          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-md">
                            <CheckCircle className="w-8 h-8 font-extrabold" />
                          </div>
                          <h4 className="text-lg font-bold font-serif text-photohub-teal">Thanh Toán Thành Công!</h4>
                          <p className="text-xs text-photohub-muted max-w-sm mx-auto leading-relaxed font-serif">
                            Giao dịch của bạn đã được đối soát tự động qua SePay. Hệ thống đã xác nhận lịch chụp/thuê thiết bị.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              handleCloseModal();
                              setActiveTab("orders"); // Direct to orders history
                            }}
                            className="bg-photohub-teal hover:bg-photohub-teal/95 text-white font-bold px-6 py-2.5 rounded-lg text-xs cursor-pointer shadow"
                          >
                            Xem đơn hàng của tôi
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                /* Form Input Block */
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {selectedProduct.type === "cart" ? (
                    <div className="bg-photohub-sand border border-photohub-teal/5 rounded-xl p-4 space-y-2 text-xs">
                      <div className="text-photohub-muted font-bold uppercase tracking-wider font-serif mb-2">Chi tiết các lịch đặt nhóm</div>
                      <div className="divide-y divide-photohub-teal/5">
                        {hookData.cartItems
                          .filter((item: any) => selectedCartIds.includes(item.cartId))
                          .map((item: any) => (
                            <div key={item.cartId} className="py-2 first:pt-0">
                              <div className="font-bold text-photohub-teal flex justify-between">
                                <span>
                                  {item.photographerName && `📸 ${item.photographerName}`}
                                  {item.photographerName && item.equipmentName && " + "}
                                  {item.equipmentName && `⚙️ ${item.equipmentName}`}
                                </span>
                                <span className="font-mono text-photohub-orange font-bold">
                                  {item.price.toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                              <div className="text-[10px] text-photohub-muted font-mono mt-0.5">
                                📅 {new Date(item.startDate).toLocaleDateString('vi-VN')} - {new Date(item.endDate).toLocaleDateString('vi-VN')} ({item.days} ngày)
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="flex justify-between border-t border-photohub-teal/10 pt-2 font-bold text-sm text-photohub-teal mt-2">
                        <span className="font-serif">Tổng tiền thanh toán nhóm:</span>
                        <span className="text-photohub-orange text-base font-mono font-extrabold">
                          {selectedProduct.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ) : (
                    // standard Single Item Form
                    <>
                      {/* Date Picker Range */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-photohub-teal flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-photohub-orange" />
                            <span>Ngày bắt đầu</span>
                          </label>
                          <input
                            type="date"
                            value={hookData.startDate}
                            onChange={(e) => hookData.setStartDate(e.target.value)}
                            className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal text-xs focus:border-photohub-orange focus:outline-none"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-photohub-teal flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-photohub-orange" />
                            <span>Ngày trả máy / kết thúc</span>
                          </label>
                          <input
                            type="date"
                            value={hookData.endDate}
                            onChange={(e) => hookData.setEndDate(e.target.value)}
                            className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal text-xs focus:border-photohub-orange focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Occupied dates list indicator */}
                      {hookData.unavailableDates.length > 0 && (
                        <div className="text-photohub-teal text-[10px] space-y-1 border border-photohub-teal/10 p-2.5 rounded-lg bg-photohub-sand/50">
                          <span className="font-bold text-photohub-orange font-serif">Các ngày đã bận:</span>
                          <div className="flex flex-wrap gap-1 mt-1 font-mono">
                            {hookData.unavailableDates.map((dateStr: string) => {
                              const [year, month, day] = dateStr.split("-");
                              return (
                                <span key={dateStr} className="bg-white border border-photohub-teal/5 px-1.5 py-0.5 rounded text-[9.5px]">
                                  {day}/{month}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Price Preview calculation box */}
                      {hookData.calculatedDays > 0 && (
                        <div className="bg-photohub-sand border border-photohub-teal/5 rounded-xl p-4 space-y-2 text-xs font-mono">
                          <div className="text-photohub-muted font-bold uppercase tracking-wider font-serif mb-1">Thống kê giá tiền</div>
                          <div className="flex justify-between text-photohub-teal/70">
                            <span>Thời gian đặt:</span>
                            <span className="font-bold">{hookData.calculatedDays} ngày</span>
                          </div>
                          <div className="flex justify-between text-photohub-teal/70">
                            <span>Đơn giá:</span>
                            <span className="font-bold">{selectedProduct.price.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div className="flex justify-between border-t border-photohub-teal/10 pt-2 font-bold text-sm text-photohub-teal">
                            <span className="font-serif">Tổng giá tiền dự kiến:</span>
                            <span className="text-photohub-orange text-base font-extrabold">{hookData.calculatedPrice.toLocaleString('vi-VN')} đ</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Error/Success Feedbacks */}
                  {hookData.successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{hookData.successMsg}</span>
                    </div>
                  )}

                  {hookData.errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs">
                      <span className="font-semibold font-serif">Đặt lịch thất bại:</span> {hookData.errorMsg}
                    </div>
                  )}

                  {/* Confirm actions */}
                  <div className="flex justify-between items-center pt-4 border-t border-photohub-teal/5">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="border border-photohub-teal/15 hover:bg-photohub-sand text-photohub-teal text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Đóng
                    </button>

                    <div className="flex gap-2">
                      {selectedProduct.type !== "cart" && (
                        <button
                          type="button"
                          disabled={!hookData.startDate || !hookData.endDate || hookData.calculatedPrice === 0}
                          onClick={() => {
                            hookData.addToCart();
                            handleCloseModal();
                          }}
                          className="bg-photohub-teal/10 hover:bg-photohub-teal/20 text-photohub-teal text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingBag className="w-4 h-4 text-photohub-orange" />
                          <span>Thêm vào Giỏ</span>
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={hookData.bookingLoading}
                        className="bg-photohub-orange hover:bg-photohub-orange/95 text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center gap-1.5 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md"
                      >
                        {hookData.bookingLoading ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>{selectedProduct.type === "cart" ? "Xác nhận Đặt nhóm" : "Đặt Ngay"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-16 border-t border-photohub-teal/10 bg-photohub-sand flex items-center justify-center text-[11px] text-photohub-muted gap-1">
        <Compass className="w-3.5 h-3.5 text-photohub-orange" />
        <span>PhotoHub E-Commerce Ecosystem &copy; 2026. Hỗ trợ hệ thống đặt lịch tự động.</span>
      </footer>
    </div>
  );
}

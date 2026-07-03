import { useEffect, useState } from "react";
import { supabase } from "../../config/supabase.js";
import { ChatWindow } from "../components/ChatWindow.js";
import { 
  Calendar, 
  User, 
  Phone, 
  CheckCircle, 
  MessageSquare, 
  Loader, 
  Play, 
  LogOut,
  Sparkles,
  X,
  TrendingUp,
  DollarSign,
  Briefcase,
  Settings,
  Clock
} from "lucide-react";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  created_at: string;
  client: { full_name: string; phone: string } | null;
}

interface PhotographerDashboardProps {
  currentUserId: string;
  clientName: string;
}

export function PhotographerDashboard({ currentUserId, clientName }: PhotographerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"bookings" | "stats" | "profile">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Realtime Chat states
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);

  // Profile fields state
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
    bio: "",
    base_price: 150,
    experience_years: 5
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    fetchAssignedBookings();
    fetchProfile();

    // Listen to real-time status updates on bookings assigned to me
    const channel = supabase
      .channel("photographer-bookings-changes")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "bookings", 
          filter: `photographer_id=eq.${currentUserId}` 
        },
        () => {
          fetchAssignedBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchAssignedBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          start_date,
          end_date,
          status,
          total_price,
          created_at,
          client:client_id(full_name, phone)
        `)
        .eq("photographer_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (err) {
      console.error("Error loading assigned bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUserId)
        .single();
      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || clientName,
          phone: data.phone || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
          base_price: data.base_price || 150,
          experience_years: data.experience_years || 5
        });
      }
    } catch (err) {
      console.error("Error loading photographer profile:", err);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update booking status via API.");
      }

      await fetchAssignedBookings();
    } catch (err: any) {
      console.error("Error patching booking status:", err);
      alert(`Lỗi cập nhật trạng thái: ${err.message}`);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          base_price: Number(profile.base_price),
          experience_years: Number(profile.experience_years)
        })
        .eq("id", currentUserId);

      if (error) throw error;
      alert("Lưu hồ sơ cá nhân thành công! Bạn đã được hiển thị trên danh sách đặt lịch.");
      await fetchProfile();
    } catch (err: any) {
      console.error("Error saving photographer profile:", err);
      alert(`Lỗi lưu hồ sơ: ${err.message}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "approved":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "ongoing":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "cancelled":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  // Stats calculation
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const upcomingBookings = bookings.filter((b) => b.status === "approved" || b.status === "ongoing");
  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
  const potentialRevenue = bookings.reduce((sum, b) => b.status !== "cancelled" ? sum + Number(b.total_price) : sum, 0);

  return (
    <div className="min-h-screen bg-photohub-sand flex flex-col font-sans">
      {/* 1. Header Area */}
      <header className="h-20 border-b border-photohub-teal/10 bg-photohub-sand px-8 flex justify-between items-center sticky top-0 z-30 backdrop-blur-sm bg-photohub-sand/95 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-extrabold tracking-tight font-serif text-photohub-teal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-photohub-orange fill-photohub-orange" />
              <span>PhotoHub Photographer Workspace</span>
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-photohub-muted font-bold font-mono">Bảng điều khiển lịch chụp ảnh & Quản lý thu nhập</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-bold text-photohub-teal">{profile.full_name || clientName}</div>
            <div className="text-[9px] uppercase tracking-wider text-photohub-orange font-bold font-mono font-serif">Nhiếp Ảnh Gia</div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-photohub-muted hover:text-photohub-orange transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* 2. Top Navigation Tabs */}
      <div className="bg-white border-b border-photohub-teal/5 px-8 py-3 flex gap-4">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === "bookings"
              ? "bg-photohub-teal text-white shadow"
              : "text-photohub-teal/70 hover:bg-photohub-sand/40"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Lịch chụp được giao ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === "stats"
              ? "bg-photohub-teal text-white shadow"
              : "text-photohub-teal/70 hover:bg-photohub-sand/40"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Thống kê & Lịch hẹn
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === "profile"
              ? "bg-photohub-teal text-white shadow"
              : "text-photohub-teal/70 hover:bg-photohub-sand/40"
          }`}
        >
          <Settings className="w-4 h-4" />
          Thiết lập hồ sơ dịch vụ
        </button>
      </div>

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {activeTab === "bookings" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
            {/* Bookings List Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex justify-between items-center border-b border-photohub-teal/5 pb-4">
                  <h2 className="text-lg font-bold font-serif text-photohub-teal">Lịch chụp được giao</h2>
                  <span className="text-[10px] bg-photohub-sand text-photohub-teal/70 px-2.5 py-1 rounded border border-photohub-teal/10 font-bold font-mono">
                    Realtime Stream Active
                  </span>
                </div>

                {loading && bookings.length === 0 ? (
                  <div className="text-center py-20 text-xs text-photohub-muted animate-pulse">
                    <Loader className="w-5 h-5 animate-spin mx-auto text-photohub-orange mb-2" />
                    <span>Đang tải danh sách lịch chụp...</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-20 text-xs text-photohub-muted border border-dashed border-photohub-teal/10 rounded-xl bg-photohub-sand/20">
                    Bạn chưa có đơn đặt lịch chụp nào được gán. Hãy hoàn thiện hồ sơ để khách hàng bắt đầu tìm thấy bạn!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="border border-photohub-teal/10 rounded-xl p-4 bg-photohub-sand/35 hover:shadow-md transition-shadow space-y-4 animate-scaleUp"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-photohub-orange" />
                              <span className="text-xs font-extrabold text-photohub-teal">
                                {booking.client?.full_name || "Khách Hàng Ẩn Danh"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-photohub-muted font-semibold">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{booking.client?.phone || "Không có SĐT liên hệ"}</span>
                            </div>
                          </div>

                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-4 border-t border-photohub-teal/5 pt-3">
                          <div className="flex items-center gap-2 text-photohub-muted">
                            <Calendar className="w-4 h-4 text-photohub-teal" />
                            <span className="font-mono">
                              {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Action trigger buttons */}
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setActiveChatBooking(booking)}
                              className="bg-white border border-photohub-teal/20 text-photohub-teal hover:border-photohub-orange hover:text-photohub-orange px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Chat với Khách</span>
                            </button>

                            {booking.status === "approved" && (
                              <button
                                onClick={() => handleUpdateStatus(booking.id, "ongoing")}
                                className="bg-photohub-teal hover:bg-photohub-teal/95 text-white px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Bắt đầu chụp</span>
                              </button>
                            )}

                            {booking.status === "ongoing" && (
                              <button
                                onClick={() => handleUpdateStatus(booking.id, "completed")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Hoàn thành</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Active Chat Panel */}
            <div className="space-y-6">
              {activeChatBooking ? (
                <div className="bg-white border border-photohub-teal/10 rounded-2xl overflow-hidden shadow-md p-6 relative space-y-4">
                  <div className="flex justify-between items-center border-b border-photohub-teal/5 pb-2">
                    <h3 className="text-xs font-bold font-serif text-photohub-teal uppercase flex items-center gap-1.5">
                      <User className="w-4 h-4 text-photohub-orange" />
                      <span>{activeChatBooking.client?.full_name || "Khách Hàng"}</span>
                    </h3>
                    <button
                      onClick={() => setActiveChatBooking(null)}
                      className="text-photohub-muted hover:text-photohub-orange transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <ChatWindow
                    bookingId={activeChatBooking.id}
                    currentUserId={currentUserId}
                    recipientName={activeChatBooking.client?.full_name || "Khách Hàng"}
                  />
                </div>
              ) : (
                <div className="bg-white border border-photohub-teal/10 rounded-2xl p-8 shadow-md text-center text-photohub-muted flex flex-col justify-center items-center space-y-4 h-[300px]">
                  <MessageSquare className="w-12 h-12 text-photohub-teal/15 animate-bounce" />
                  <div className="font-bold text-sm text-photohub-teal font-serif">Khu vực Chat liên hệ</div>
                  <p className="text-xs text-photohub-muted max-w-[200px] leading-relaxed font-mono">
                    Chọn nút "Chat với Khách" bên cạnh lịch chụp tương ứng để trao đổi công việc thời gian thực.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Statistics and Earnings */}
        {activeTab === "stats" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Overview Stats Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-photohub-muted uppercase tracking-wider block">Doanh thu tích lũy</span>
                  <span className="text-lg font-bold font-mono text-photohub-teal">${totalRevenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-photohub-muted uppercase tracking-wider block">Doanh thu dự kiến</span>
                  <span className="text-lg font-bold font-mono text-emerald-600">${potentialRevenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-photohub-muted uppercase tracking-wider block">Buổi chụp hoàn thành</span>
                  <span className="text-lg font-bold font-mono text-photohub-teal">{completedBookings.length}</span>
                </div>
              </div>

              <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-photohub-muted uppercase tracking-wider block">Lịch chụp sắp tới</span>
                  <span className="text-lg font-bold font-mono text-blue-600">{upcomingBookings.length}</span>
                </div>
              </div>
            </div>

            {/* Scheduled Timeline Calendar details */}
            <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 shadow-md space-y-4">
              <div className="border-b border-photohub-teal/5 pb-4">
                <h3 className="text-md font-bold font-serif text-photohub-teal">Lịch hẹn chụp cụ thể (Sắp diễn ra)</h3>
                <p className="text-[10px] text-photohub-muted font-semibold uppercase tracking-wider font-mono">Dưới dạng timeline chi tiết</p>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="text-center py-10 text-xs text-photohub-muted font-semibold">
                  Không có lịch hẹn chụp nào sắp tới.
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((b) => (
                    <div key={b.id} className="flex gap-4 items-start bg-photohub-sand/20 border border-photohub-teal/5 p-4 rounded-xl">
                      <div className="bg-photohub-teal text-white p-2.5 rounded-lg font-bold font-mono text-[10px] text-center flex flex-col justify-center min-w-[60px] shadow-sm">
                        <span className="text-[8px] uppercase tracking-wider opacity-70">Tháng</span>
                        <span className="text-xs leading-none mt-0.5">{new Date(b.start_date).getMonth() + 1}</span>
                        <span className="text-sm font-extrabold leading-none mt-1">{new Date(b.start_date).getDate()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-photohub-teal">{b.client?.full_name || "Khách Hàng"}</span>
                          <span className={`px-2 py-0.2 rounded text-[8px] font-extrabold uppercase ${getStatusStyle(b.status)}`}>
                            {b.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-photohub-muted font-semibold font-mono mt-1">
                          📅 {new Date(b.start_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(b.end_date).toLocaleDateString()} {new Date(b.end_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-[10px] text-photohub-muted font-semibold mt-0.5">
                          📞 Liên hệ: {b.client?.phone || "Chưa cung cấp SĐT"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-photohub-muted block font-semibold">Giá trị buổi</span>
                        <span className="text-xs font-bold text-photohub-orange font-mono">${b.total_price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Personal Profile Settings */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto animate-fadeIn">
            <div className="bg-white border border-photohub-teal/10 rounded-2xl p-8 shadow-md space-y-6">
              <div className="border-b border-photohub-teal/5 pb-4">
                <h3 className="text-lg font-bold font-serif text-photohub-teal">Hồ Sơ Nhiếp Ảnh Gia</h3>
                <p className="text-xs text-photohub-muted font-mono leading-relaxed mt-1">
                  💡 Điền đầy đủ thông tin bên dưới giúp bạn xuất hiện công khai trên trang **Thuê người chụp** và nhận các lượt đặt lịch từ khách hàng.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal">Họ và tên hiển thị</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Tên nghệ danh chụp ảnh"
                      className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal">Số điện thoại liên hệ</label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="09xx xxx xxx"
                      className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal">Giá thuê cơ bản (USD/buổi)</label>
                    <input
                      type="number"
                      value={profile.base_price}
                      onChange={(e) => setProfile({ ...profile, base_price: Number(e.target.value) })}
                      min="10"
                      className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-photohub-teal">Kinh nghiệm chụp (số năm)</label>
                    <input
                      type="number"
                      value={profile.experience_years}
                      onChange={(e) => setProfile({ ...profile, experience_years: Number(e.target.value) })}
                      min="1"
                      className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-photohub-teal">Đường dẫn ảnh đại diện (URL)</label>
                  <input
                    type="url"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-xxx"
                    className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none"
                  />
                  {profile.avatar_url && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={profile.avatar_url}
                        alt="Preview Avatar"
                        className="h-12 w-12 object-cover rounded-full border border-photohub-teal/15 shadow-sm"
                        onError={(e) => {
                          (e.target as any).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100";
                        }}
                      />
                      <span className="text-[10px] text-photohub-muted">Xem trước ảnh đại diện hiển thị</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-photohub-teal">Giới thiệu bản thân & phong cách chụp</label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Ví dụ: Chuyên chụp ảnh chân dung ngoại cảnh, chụp Lookbook thời trang phong cách cinematic..."
                    rows={4}
                    className="w-full bg-photohub-sand border border-photohub-teal/10 rounded-lg p-3 text-photohub-teal focus:border-photohub-orange focus:outline-none leading-relaxed"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full bg-photohub-orange hover:bg-photohub-orange/95 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md text-sm mt-6"
                >
                  {profileSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu và kích hoạt hồ sơ công khai</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

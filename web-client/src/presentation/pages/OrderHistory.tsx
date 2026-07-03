import { useEffect, useState } from "react";
import { User, Calendar, CircleDollarSign, MessageSquare, X } from "lucide-react";
import { supabase } from "../../config/supabase.js";
import { ChatWindow } from "../components/ChatWindow.js";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  created_at: string;
  equipment: { id: string; name: string; avatar_url?: string; price_per_day?: number; category?: string } | null;
  photographer: { id: string; full_name: string; avatar_url?: string; role?: string } | null;
}

interface OrderHistoryProps {
  clientId: string;
  bookings: Booking[];
  refreshBookings: () => Promise<void>;
  onSelectBookingForPayment: (booking: any) => void;
  timeoutDurationMs: number;
}

function BookingHoldingTimer({
  createdAt,
  timeoutDurationMs,
  onExpired
}: {
  createdAt: string;
  timeoutDurationMs: number;
  onExpired: () => void;
}) {
  const calculateRemaining = () => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diff = createdTime + timeoutDurationMs - now;
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateRemaining());

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setSecondsLeft(rem);
      if (rem <= 0) {
        clearInterval(timer);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt, timeoutDurationMs]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="text-[10px] font-mono text-photohub-orange font-bold bg-photohub-orange/10 px-2 py-0.5 rounded border border-photohub-orange/15 inline-flex items-center gap-1 select-none animate-pulse">
      ⏳ Giữ hàng: {formattedTime}
    </div>
  );
}

export function OrderHistory({ clientId, bookings, refreshBookings, onSelectBookingForPayment, timeoutDurationMs }: OrderHistoryProps) {
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);

  useEffect(() => {
    // 1. Initialize Realtime subscription for this client's bookings
    const channel = supabase
      .channel(`realtime-client-orders-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          console.log("Realtime event received in OrderHistory:", payload);
          // Trigger the state refresh to dynamically update the status badge
          refreshBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, refreshBookings]);

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

  return (
    <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 space-y-6 shadow-md">
      <div className="flex justify-between items-center border-b border-photohub-teal/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-photohub-teal font-serif">Đơn Hàng Của Tôi</h2>
          <p className="text-xs text-photohub-muted">Danh sách hóa đơn cập nhật thời gian thực</p>
        </div>
        <span className="text-[10px] bg-photohub-sand text-photohub-teal/70 px-2.5 py-1 rounded border border-photohub-teal/10 font-bold font-mono">
          Realtime Stream Enabled
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center text-photohub-muted text-sm py-20 border border-dashed border-photohub-teal/10 rounded-xl bg-photohub-sand/20">
          Bạn chưa thực hiện giao dịch nào. Hãy thuê thiết bị hoặc chọn nhiếp ảnh gia để tạo đơn đầu tiên.
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-photohub-sand/35 border border-photohub-teal/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:border-photohub-teal/20"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-photohub-teal font-extrabold font-serif">
                    {b.equipment?.name || "Dịch vụ Thuê Nhiếp Ảnh Gia"}
                  </span>
                  {b.status === "pending" && (
                    <BookingHoldingTimer
                      createdAt={b.created_at}
                      timeoutDurationMs={timeoutDurationMs}
                      onExpired={refreshBookings}
                    />
                  )}
                </div>

                <div className="space-y-1 text-[11px] text-photohub-muted font-semibold">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-photohub-orange" />
                    <span>Nhiếp ảnh gia: {b.photographer?.full_name || "Không thuê thợ chụp"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-photohub-teal" />
                    <span className="font-mono">
                      {new Date(b.start_date).toLocaleDateString()} -{" "}
                      {new Date(b.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none border-photohub-teal/5 pt-3 md:pt-0">
                {/* Pay now action for pending orders */}
                {b.status === "pending" && (
                  <button
                    onClick={() => onSelectBookingForPayment(b)}
                    className="bg-photohub-orange border border-photohub-orange text-white hover:bg-photohub-orange/95 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow transition-colors"
                  >
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    <span>Thanh toán ngay</span>
                  </button>
                )}

                {/* Chat action for client */}
                {b.photographer && (
                  <button
                    onClick={() => setActiveChatBooking(b)}
                    className="bg-white border border-photohub-teal/20 text-photohub-teal hover:border-photohub-orange hover:text-photohub-orange px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat với Thợ</span>
                  </button>
                )}

                <div className="text-right font-mono">
                  <div className="text-[9px] text-photohub-muted font-bold uppercase tracking-wider">Tổng cộng</div>
                  <div className="text-xs font-bold text-photohub-teal flex items-center justify-end gap-0.5">
                    <span>{(Number(b.total_price)).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(
                    b.status
                  )}`}
                >
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Chat Modal Panel */}
      {activeChatBooking && (
        <div className="fixed inset-0 bg-photohub-teal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-photohub-teal/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4 animate-scaleUp">
            <div className="flex justify-between items-center border-b border-photohub-teal/5 pb-2">
              <h3 className="text-sm font-bold font-serif text-photohub-teal uppercase">Liên hệ với Photographer</h3>
              <button
                onClick={() => setActiveChatBooking(null)}
                className="text-photohub-muted hover:text-photohub-orange transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <ChatWindow
              bookingId={activeChatBooking.id}
              currentUserId={clientId}
              recipientName={activeChatBooking.photographer?.full_name || "Photographer"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../config/supabase.js";
import { Send, Loader, User } from "lucide-react";

interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatWindowProps {
  bookingId: string;
  currentUserId: string;
  recipientName: string;
}

export function ChatWindow({ bookingId, currentUserId, recipientName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch initial message history and listen to realtime updates
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-room-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as Message;
          // Avoid appending duplicate messages if sent by current user (since insert handles it locally or via realtime)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // 2. Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          booking_id: bookingId,
          sender_id: currentUserId,
          content: textToSend,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setMessages((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <div className="flex flex-col h-[420px] bg-photohub-sand border border-photohub-teal/10 rounded-xl overflow-hidden shadow-inner">
      {/* Header Info */}
      <div className="bg-photohub-teal text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-photohub-orange/20 border border-photohub-orange text-photohub-orange font-bold text-xs flex items-center justify-center">
            {recipientName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold font-serif">{recipientName}</div>
            <div className="text-[9px] text-white/60 font-semibold uppercase tracking-wider font-mono">Đang kết nối trực tiếp</div>
          </div>
        </div>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
      </div>

      {/* Chat Area Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/70">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-photohub-muted">
            <Loader className="w-4 h-4 animate-spin text-photohub-orange" />
            <span className="ml-1.5 font-mono">Đang tải lịch sử hội thoại...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <User className="w-8 h-8 text-photohub-muted/40" />
            <div className="text-[11px] font-bold text-photohub-teal font-serif">Chưa có tin nhắn nào</div>
            <p className="text-[10px] text-photohub-muted max-w-[200px] leading-normal font-mono">
              Bắt đầu nhập nội dung bên dưới để liên hệ trao đổi công việc.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm font-semibold ${
                    isMe
                      ? "bg-photohub-teal text-white rounded-tr-none"
                      : "bg-photohub-sand text-photohub-teal border border-photohub-teal/5 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[8px] text-photohub-muted font-bold font-mono mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Submit Bar */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-photohub-teal/10 bg-photohub-sand flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập nội dung tin nhắn..."
          className="flex-1 bg-white border border-photohub-teal/15 rounded-lg px-3 text-xs text-photohub-teal focus:border-photohub-orange focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-photohub-orange hover:bg-photohub-orange/95 text-white p-2.5 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}

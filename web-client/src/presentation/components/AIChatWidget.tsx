import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, ArrowRight } from "lucide-react";

interface RecommendationItem {
  type: "equipment" | "photographer";
  item: any;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: RecommendationItem[];
  timestamp: string;
}

interface AIChatWidgetProps {
  onSelectProduct?: (product: any) => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function AIChatWidget({ onSelectProduct }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "Xin chào! Tôi là Trợ lý AI của PhoTohub 🤖✨. Tôi có thể tư vấn máy ảnh, thấu kính, đèn studio hoặc gợi ý thợ chụp phù hợp nhất với nhu cầu và ngân sách của bạn!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  const quickPrompts = [
    "📸 Nên thuê máy gì chụp ảnh cưới?",
    "🎬 Tư vấn combo quay phim 4K 120fps",
    "👗 Cần thợ chụp lookbook thời trang",
    "💡 Tư vấn bộ đèn studio livestream",
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query.trim() }),
      });

      if (!response.ok) {
        throw new Error("Không thể kết nối đến máy chủ AI.");
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "Tôi đã nhận được thông tin từ bạn.",
        recommendations: data.recommendations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Rất tiếc, đã có gián đoạn kết nối với trợ lý AI. Vui lòng thử lại sau giây lát!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSelectRecommendation = (rec: RecommendationItem) => {
    if (!onSelectProduct) return;

    if (rec.type === "equipment") {
      onSelectProduct({
        id: rec.item.id,
        name: rec.item.name,
        type: "equipment",
        price: Number(rec.item.price_per_day),
        avatar: rec.item.image_url || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
        category: rec.item.category === "body" ? "CHỤP ẢNH 📸" : rec.item.category === "lens" ? "LENS CHUYÊN DỤNG 🔋" : "THIẾT BỊ ÁNH SÁNG 🎧",
        desc: "Thiết bị chụp ảnh studio cao cấp bảo dưỡng định kỳ.",
        specs: ["Bảo hành trách nhiệm", "Đầy đủ phụ kiện đi kèm"],
      });
    } else {
      onSelectProduct({
        id: rec.item.id,
        name: rec.item.full_name,
        type: "photographer",
        price: Number(rec.item.base_price || 1500000),
        avatar: rec.item.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        category: rec.item.role === "admin" ? "Master Director" : "Senior Portraitist",
        desc: rec.item.bio || "Nhiếp ảnh gia chuyên nghiệp sở hữu nhiều năm kinh nghiệm.",
        specs: [`Kinh nghiệm: ${rec.item.experience_years || 5} năm`, "Trả file ảnh gốc chất lượng cao"],
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-photohub-teal to-photohub-teal/90 text-white px-4 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-white/20 active:scale-95"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-photohub-orange animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold font-serif tracking-wide hidden sm:inline">Hỏi AI Tư Vấn 🤖</span>
        </button>
      )}

      {/* Floating Chat Box Drawer */}
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-xl border border-photohub-teal/15 rounded-3xl shadow-2xl w-[92vw] sm:w-[420px] h-[580px] flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-photohub-teal text-white p-4 px-5 flex justify-between items-center border-b border-photohub-teal/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-photohub-orange/20 border border-photohub-orange/40 flex items-center justify-center">
                <Bot className="w-5 h-5 text-photohub-orange" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-serif tracking-wide flex items-center gap-1.5">
                  PhoTohub AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-photohub-orange" />
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-photohub-sand/80 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online | Tư vấn trực tuyến
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-photohub-sand/80 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-photohub-sand/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-photohub-teal text-white flex items-center justify-center text-xs shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-photohub-orange" />
                  </div>
                )}

                <div className={`max-w-[82%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-photohub-teal text-white rounded-br-none shadow-sm"
                        : "bg-white text-photohub-teal border border-photohub-teal/10 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span
                      className={`block text-[9px] mt-1.5 text-right font-mono ${
                        msg.role === "user" ? "text-white/60" : "text-photohub-muted"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Recommendations Cards */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] uppercase font-bold text-photohub-orange tracking-wider block font-mono">
                        🔥 Sản phẩm / Thợ gợi ý:
                      </span>
                      {msg.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-photohub-teal/15 rounded-xl p-2.5 flex items-center gap-3 shadow-sm hover:border-photohub-orange/40 transition-colors"
                        >
                          <img
                            src={rec.item.image_url || rec.item.avatar_url || "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=100"}
                            alt={rec.item.name || rec.item.full_name}
                            className="w-12 h-12 rounded-lg object-cover border border-photohub-teal/10 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-photohub-teal truncate font-serif">
                              {rec.item.name || rec.item.full_name}
                            </h4>
                            <span className="text-[10px] text-photohub-muted block font-mono">
                              {rec.type === "equipment"
                                ? `${Number(rec.item.price_per_day).toLocaleString("vi-VN")} đ/ngày`
                                : `${Number(rec.item.base_price || 1500000).toLocaleString("vi-VN")} đ/buổi`}
                            </span>
                          </div>
                          {onSelectProduct && (
                            <button
                              onClick={() => handleSelectRecommendation(rec)}
                              className="bg-photohub-orange hover:bg-photohub-orange/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-sm flex items-center gap-1 active:scale-95"
                            >
                              <span>{rec.type === "equipment" ? "Thuê" : "Đặt"}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-photohub-orange text-white flex items-center justify-center text-xs shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 items-center text-xs text-photohub-muted">
                <div className="h-7 w-7 rounded-full bg-photohub-teal text-white flex items-center justify-center">
                  <Bot className="w-4 h-4 text-photohub-orange" />
                </div>
                <div className="bg-white border border-photohub-teal/10 p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-photohub-teal/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-photohub-teal/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-photohub-teal rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2 px-3 bg-white border-t border-photohub-teal/10 flex gap-2 overflow-x-auto no-scrollbar text-[10px]">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isTyping}
                className="whitespace-nowrap bg-photohub-sand/60 hover:bg-photohub-orange/10 hover:text-photohub-orange border border-photohub-teal/10 text-photohub-teal font-semibold px-2.5 py-1 rounded-full transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-photohub-teal/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập câu hỏi cần tư vấn..."
              disabled={isTyping}
              className="flex-1 bg-photohub-sand/40 border border-photohub-teal/15 rounded-xl px-3.5 py-2.5 text-xs text-photohub-teal focus:outline-none focus:border-photohub-orange transition-all placeholder:text-photohub-muted/70 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="bg-photohub-teal hover:bg-photohub-teal/90 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4 text-photohub-orange" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

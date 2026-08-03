import { Request, Response } from "express";
import { getServiceRoleClient } from "../shared/supabase-client.js";

export async function handleAIChat(req: Request, res: Response): Promise<void> {
  try {
    const { message, messages } = req.body;
    const userPrompt = message || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1].content : "");

    if (!userPrompt || typeof userPrompt !== "string") {
      res.status(400).json({ error: "Vui lòng nhập nội dung câu hỏi." });
      return;
    }

    const supabase = getServiceRoleClient();

    // 1. Fetch live database context (equipment & photographers)
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, category, price_per_day, image_url")
      .eq("status", "available")
      .limit(100);

    const { data: photographers } = await supabase
      .from("profiles")
      .select("id, full_name, role, experience_years, base_price, bio, avatar_url")
      .eq("role", "photographer")
      .limit(20);

    const context = {
      total_equipment_count: (equipment || []).length,
      total_photographer_count: (photographers || []).length,
      equipment: equipment || [],
      photographers: photographers || [],
    };

    const aiEndpoint = process.env.AI_ENDPOINT_URL;
    const aiApiKey = process.env.AI_API_KEY || process.env.NGROK_AUTHTOKEN;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // 2. Attempt calling Ngrok AI Service if configured & online
    if (aiEndpoint) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        };

        if (aiApiKey) {
          headers["Authorization"] = `Bearer ${aiApiKey}`;
        }

        const response = await fetch(aiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: userPrompt,
            message: userPrompt,
            messages,
            context,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const aiData = await response.json();
          res.json({
            success: true,
            reply: aiData.reply || aiData.response || aiData.text || "Tôi đã nhận được thông tin từ bạn.",
            recommendations: aiData.recommendations || [],
            source: "ngrok-ai-llm",
          });
          return;
        }
      } catch (err: any) {
        console.warn("Notice: ngrok AI endpoint offline, falling back to Google Gemini LLM API...", err.message);
      }
    }

    // 3. 100% LLM Call: Google Gemini 2.5 Flash API
    if (geminiApiKey && geminiApiKey.trim().length > 10) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey.trim()}`;

        const systemInstructionText = `Bạn là Trợ lý AI Chuyên Nghiệp của hệ sinh thái thương mại điện tử PhoTohub (Cho thuê máy ảnh & Đặt lịch thợ chụp).
Nhiệm vụ: Dùng trí tuệ nhân tạo để phân tích BẤT KỲ câu hỏi nào của người dùng (từ đi chơi, du lịch, chụp cưới, phượt, chụp đêm, hỏi giá cả, tổng số sản phẩm, so sánh máy ảnh...).
Trả lời thân thiện, chính xác bằng Tiếng Việt và gợi ý đúng sản phẩm / thợ chụp từ kho dữ liệu Supabase dưới đây:

DỮ LIỆU KHO THỰC TẾ (SUPABASE CONTEXT):
- Tổng số thiết bị cho thuê: ${context.total_equipment_count} sản phẩm
- Tổng số nhiếp ảnh gia: ${context.total_photographer_count} thợ chụp
- Danh sách thiết bị: ${JSON.stringify((equipment || []).map(e => ({ id: e.id, name: e.name, category: e.category, price_per_day: e.price_per_day })), null, 1)}
- Danh sách thợ chụp: ${JSON.stringify((photographers || []).map(p => ({ id: p.id, name: p.full_name, exp: p.experience_years, price: p.base_price, bio: p.bio })), null, 1)}

QUY TẮC TRẢ VỀ:
Bắt buộc trả về đúng cấu trúc JSON sau (không chứa Markdown bọc bên ngoài hay ký tự thừa):
{
  "reply": "Lời tư vấn tự nhiên, thông minh, chi tiết bằng Tiếng Việt cho câu hỏi...",
  "recommended_equipment_ids": ["id_thiet_bi_1", "id_thiet_bi_2"],
  "recommended_photographer_ids": ["id_tho_chup_1"]
}`;

        const gController = new AbortController();
        const gTimeout = setTimeout(() => gController.abort(), 8000); // 8s timeout

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemInstructionText}\n\nCâu hỏi khách hàng: "${userPrompt}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
          signal: gController.signal,
        });

        clearTimeout(gTimeout);

        if (response.ok) {
          const geminiData = await response.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawText) {
            const parsed = JSON.parse(rawText);
            const recommendations: any[] = [];

            if (Array.isArray(parsed.recommended_equipment_ids)) {
              parsed.recommended_equipment_ids.forEach((id: string) => {
                const found = (equipment || []).find((e) => e.id === id);
                if (found) recommendations.push({ type: "equipment", item: found });
              });
            }

            if (Array.isArray(parsed.recommended_photographer_ids)) {
              parsed.recommended_photographer_ids.forEach((id: string) => {
                const found = (photographers || []).find((p) => p.id === id);
                if (found) recommendations.push({ type: "photographer", item: found });
              });
            }

            res.json({
              success: true,
              reply: parsed.reply,
              recommendations,
              source: "google-gemini-llm",
            });
            return;
          }
        }
      } catch (geminiErr: any) {
        console.error("Gemini LLM call timed out or failed, switching to fast local fallback:", geminiErr.message);
      }
    }

    // 4. Fast Local Fallback Response (Guarantees instant answer under 100ms)
    const lowerPrompt = userPrompt.toLowerCase();
    const recommendations: any[] = [];
    let replyText = "";

    const topEquip = (equipment || []).find(e => lowerPrompt.includes("cưới") ? e.name.includes("A7 IV") : e.name.includes("FX3") || e.name.includes("A6700")) || equipment?.[0];
    const topPhoto = (photographers || [])[0];

    replyText = `PhoTohub AI Assistant đã ghi nhận nhu cầu của bạn! 🤖

Hiện tại kho hàng PhoTohub đang có **${context.total_equipment_count} thiết bị máy ảnh/phụ kiện** và **${context.total_photographer_count} nhiếp ảnh gia chuyên nghiệp** sẵn sàng phục vụ bạn:

📸 **Thiết bị nổi bật**: ${topEquip ? topEquip.name : "Sony A7 IV Full-Frame"}
👨‍🎨 **Thợ chụp gợi ý**: ${topPhoto ? `Nhiếp ảnh gia ${topPhoto.full_name}` : "Nhiếp ảnh gia PhoTohub"}

Bạn có thể ấn trực tiếp vào sản phẩm bên dưới để tiến hành đặt lịch thuê ngay!`;

    if (topEquip) recommendations.push({ type: "equipment", item: topEquip });
    if (topPhoto) recommendations.push({ type: "photographer", item: topPhoto });

    res.json({
      success: true,
      reply: replyText,
      recommendations,
      source: "photohub-fast-fallback",
    });
  } catch (error: any) {
    console.error("AI Controller error:", error);
    res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý AI." });
  }
}

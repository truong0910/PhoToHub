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
      .limit(30);

    const { data: photographers } = await supabase
      .from("profiles")
      .select("id, full_name, role, experience_years, base_price, bio, avatar_url")
      .eq("role", "photographer")
      .limit(15);

    const context = {
      equipment: equipment || [],
      photographers: photographers || [],
    };

    const aiEndpoint = process.env.AI_ENDPOINT_URL;
    const aiApiKey = process.env.AI_API_KEY || process.env.NGROK_AUTHTOKEN;

    // 2. Attempt calling ngrok AI Service if configured
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
            source: "ngrok-ai",
          });
          return;
        }
      } catch (err: any) {
        console.warn("Notice: ngrok AI endpoint fetch timed out or offline, switching to PhoTohub AI fallback engine.", err.message);
      }
    }

    // 3. Fallback PhoTohub AI Recommendation Engine
    const lowerPrompt = userPrompt.toLowerCase();
    let replyText = "";
    const recommendations: any[] = [];

    if (lowerPrompt.includes("cưới") || lowerPrompt.includes("pre-wedding") || lowerPrompt.includes("đám cưới")) {
      const matchPhotographer = (photographers || []).find((p) => p.bio?.toLowerCase().includes("cưới") || p.bio?.toLowerCase().includes("pre-wedding")) || photographers?.[0];
      const matchCamera = (equipment || []).find((e) => e.name.includes("Sony A7 IV") || e.name.includes("Canon EOS R5") || e.name.includes("Nikon Z8"));

      replyText = `Chào bạn! Để chụp ảnh cưới / Pre-wedding chất lượng điện ảnh màu sắc sang trọng, PhoTohub xin tư vấn cho bạn bộ combo tối ưu nhất:

📸 **Máy ảnh gợi ý**: ${matchCamera ? matchCamera.name : "Sony A7 IV Full-Frame"} (Cho chi tiết cực nét, dynamic range rộng xử lý váy cưới màu trắng mượt mà).
👨‍🎨 **Thợ chụp gợi ý**: Nhiếp ảnh gia ${matchPhotographer ? matchPhotographer.full_name : "Nguyễn Anh Tuấn"} (${matchPhotographer ? matchPhotographer.experience_years : 8} năm kinh nghiệm chuyên ảnh cưới cinematic).

Bạn có thể ấn nút xem chi tiết ở bên dưới để tiến hành đặt lịch thuê ngay!`;

      if (matchCamera) recommendations.push({ type: "equipment", item: matchCamera });
      if (matchPhotographer) recommendations.push({ type: "photographer", item: matchPhotographer });
    } else if (lowerPrompt.includes("quay phim") || lowerPrompt.includes("video") || lowerPrompt.includes("reels") || lowerPrompt.includes("tiktok") || lowerPrompt.includes("4k")) {
      const matchFX3 = (equipment || []).find((e) => e.name.includes("FX3") || e.name.includes("A7S III") || e.name.includes("C70")) || equipment?.[1];
      const matchMic = (equipment || []).find((e) => e.name.includes("Rode") || e.name.includes("Wireless") || e.name.includes("Gimbal")) || equipment?.[2];

      replyText = `Chào bạn! Đối với nhu cầu quay phim video 4K sắc nét và chống rung chuyên nghiệp, PhoTohub đề xuất combo sản phẩm hot nhất hiện nay:

🎥 **Body Cinema**: ${matchFX3 ? matchFX3.name : "Sony FX3 Cinema Camera"} (Hỗ trợ 4K 120fps quay slow-motion không giới hạn).
🎙️ **Thiết bị phụ trợ**: ${matchMic ? matchMic.name : "Bộ Mic Rode Wireless PRO"} & Gimbal chống rung DJI RS 3.

Combo này sẵn sàng đồng hành cùng bạn trong mọi góc quay sáng tạo!`;

      if (matchFX3) recommendations.push({ type: "equipment", item: matchFX3 });
      if (matchMic) recommendations.push({ type: "equipment", item: matchMic });
    } else if (lowerPrompt.includes("lookbook") || lowerPrompt.includes("thời trang") || lowerPrompt.includes("quần áo") || lowerPrompt.includes("mẫu")) {
      const matchLookbookPhotographer = (photographers || []).find((p) => p.bio?.toLowerCase().includes("lookbook") || p.bio?.toLowerCase().includes("thời trang")) || photographers?.[1];
      const matchLens = (equipment || []).find((e) => e.name.includes("85mm") || e.name.includes("50mm") || e.name.includes("24-70")) || equipment?.[3];

      replyText = `Chào bạn! Chụp ảnh Lookbook thời trang cần độ nổi khối và màu sắc chuẩn chỉnh cho trang phục. PhoTohub tư vấn cho bạn:

👗 **Nhiếp ảnh gia chuyên thời trang**: ${matchLookbookPhotographer ? matchLookbookPhotographer.full_name : "Trần Bảo Nam"} (Chuyên làm việc với các thương hiệu thời trang cao cấp).
🔋 **Ống kính khuyên dùng**: ${matchLens ? matchLens.name : "Sony FE 85mm f/1.4 GM"} (Xóa phông mượt mà, làm nổi bật phom dáng quần áo).`;

      if (matchLookbookPhotographer) recommendations.push({ type: "photographer", item: matchLookbookPhotographer });
      if (matchLens) recommendations.push({ type: "equipment", item: matchLens });
    } else if (lowerPrompt.includes("đèn") || lowerPrompt.includes("studio") || lowerPrompt.includes("ánh sáng") || lowerPrompt.includes("livestream")) {
      const matchLight = (equipment || []).find((e) => e.category === "lighting" || e.name.includes("Aputure") || e.name.includes("Godox") || e.name.includes("Nanlite")) || equipment?.[4];

      replyText = `Chào bạn! Ánh sáng là linh hồn của ảnh Studio & Video. PhoTohub gợi ý thiết bị ánh sáng phù hợp cho bạn:

💡 **Thiết bị ánh sáng**: ${matchLight ? matchLight.name : "Aputure LS 600d Pro / Godox AD600Pro"}
Chỉ số hoàn màu CRI > 96+, công suất cực mạnh giúp da mẫu sáng mịn tự nhiên và màu sắc sản phẩm lên chuẩn nhất!`;

      if (matchLight) recommendations.push({ type: "equipment", item: matchLight });
    } else {
      const randomEquip = equipment?.[0];
      const randomPhoto = photographers?.[0];

      replyText = `Cảm ơn bạn đã liên hệ PhoTohub AI Assistant! 🤖

PhoTohub hiện đang quản lý kho 100 thiết bị máy ảnh, lens chuyên dụng, đèn studio cùng 20 thợ chụp chuyên nghiệp. 
Bạn có thể hỏi tôi chi tiết theo nhu cầu:
- *"Nên thuê máy ảnh nào chụp sự kiện?"*
- *"Tư vấn thợ chụp ảnh kỷ yếu / tốt nghiệp"*
- *"Gợi ý ống kính xóa phông chân dung"*

Dưới đây là thiết bị & thợ chụp nổi bật đang sẵn sàng cho thuê:`;

      if (randomEquip) recommendations.push({ type: "equipment", item: randomEquip });
      if (randomPhoto) recommendations.push({ type: "photographer", item: randomPhoto });
    }

    res.json({
      success: true,
      reply: replyText,
      recommendations,
      source: "photohub-ai-local",
    });
  } catch (error: any) {
    console.error("AI Controller error:", error);
    res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý AI." });
  }
}

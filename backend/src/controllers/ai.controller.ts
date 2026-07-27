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
      .limit(60);

    const { data: photographers } = await supabase
      .from("profiles")
      .select("id, full_name, role, experience_years, base_price, bio, avatar_url")
      .eq("role", "photographer")
      .limit(20);

    const context = {
      equipment: equipment || [],
      photographers: photographers || [],
    };

    const aiEndpoint = process.env.AI_ENDPOINT_URL;
    const aiApiKey = process.env.AI_API_KEY || process.env.NGROK_AUTHTOKEN;
    const geminiApiKey = process.env.GEMINI_API_KEY;

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
        console.warn("Notice: ngrok AI endpoint offline, trying Google Gemini LLM API...", err.message);
      }
    }

    // 3. Attempt calling Google Gemini LLM API directly if GEMINI_API_KEY is configured
    if (geminiApiKey && geminiApiKey.trim().length > 10) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`;

        const systemInstructionText = `Bạn là Trợ lý AI Chuyên Nghiệp của hệ thống thương mại điện tử PhoTohub (Studio & Thuê thiết bị máy ảnh/Thợ chụp).
Nhiệm vụ của bạn: Trả lời tự nhiên, thân thiện bằng Tiếng Việt cho BẤT KỲ nhu cầu nào của người dùng (đi chơi, đi phượt, du lịch, chụp cưới, quay video 4k, kinh phí thấp/cao, chụp đêm, chụp em bé...).
Hãy tư vấn chân thực và chọn ra tối đa 2 thiết bị và 1 thợ chụp phù hợp nhất từ danh mục kho hàng Supabase sau:

DANH MỤC THIẾT BỊ HIỆN CÓ:
${JSON.stringify((equipment || []).map(e => ({ id: e.id, name: e.name, category: e.category, price: e.price_per_day })), null, 1)}

DANH SÁCH THỢ CHỤP HIỆN CÓ:
${JSON.stringify((photographers || []).map(p => ({ id: p.id, name: p.full_name, exp: p.experience_years, price: p.base_price, bio: p.bio })), null, 1)}

BẠN BẮT BUỘC PHẢI TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON SAU (không kèm ký tự thừa):
{
  "reply": "Lời tư vấn tự nhiên thân thiện bằng Tiếng Việt...",
  "recommended_equipment_ids": ["id_thiet_bi_1", "id_thiet_bi_2"],
  "recommended_photographer_ids": ["id_tho_chup_1"]
}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemInstructionText}\n\nCâu hỏi của khách hàng: "${userPrompt}"` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json",
            },
          }),
        });

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
        console.warn("Notice: Gemini API call error, switching to PhoTohub Semantic Engine.", geminiErr.message);
      }
    }

    // 4. Fallback PhoTohub Semantic Engine
    const lowerPrompt = userPrompt.toLowerCase();
    let replyText = "";
    const recommendations: any[] = [];

    const findPhoto = (keywords: string[]) => (photographers || []).filter(p => keywords.some(k => p.bio?.toLowerCase().includes(k) || p.full_name?.toLowerCase().includes(k)));

    // Travel / Going out / Outdoor / Compact / Casual
    if (lowerPrompt.includes("đi chơi") || lowerPrompt.includes("du lịch") || lowerPrompt.includes("dã ngoại") || lowerPrompt.includes("gọn nhẹ") || lowerPrompt.includes("phượt") || lowerPrompt.includes("ngoại cảnh") || lowerPrompt.includes("đà lạt") || lowerPrompt.includes("mang đi") || lowerPrompt.includes("chơi")) {
      const compactCam = (equipment || []).find(e => e.name.includes("GoPro") || e.name.includes("Insta360") || e.name.includes("X-T5") || e.name.includes("A6700") || e.name.includes("Leica Q3")) || equipment?.[0];
      const travelPhoto = findPhoto(["du lịch", "dã ngoại", "outdoor", "street"])[0] || photographers?.[0];

      replyText = `Chào bạn! Với nhu cầu **đi chơi / du lịch**, bạn nên ưu tiên thiết bị nhỏ gọn, chống rung tốt và màu sắc tươi sáng để thoải mái di chuyển:

📸 **Camera nhỏ gọn khuyên dùng**: ${compactCam ? compactCam.name : "GoPro HERO12 / Fujifilm X-T5"} (Màu sắc rực rỡ, gọn nhẹ).
👨‍🎨 **Thợ chụp gợi ý**: ${travelPhoto ? `Nhiếp ảnh gia ${travelPhoto.full_name} (${travelPhoto.experience_years} năm kinh nghiệm outdoor & du lịch)` : "Nhiếp ảnh gia chuyên outdoor"}.`;

      if (compactCam) recommendations.push({ type: "equipment", item: compactCam });
      if (travelPhoto) recommendations.push({ type: "photographer", item: travelPhoto });
    }
    // Wedding / Pre-wedding
    else if (lowerPrompt.includes("cưới") || lowerPrompt.includes("pre-wedding") || lowerPrompt.includes("đám cưới")) {
      const matchPhotographer = findPhoto(["cưới", "pre-wedding"])[0] || photographers?.[0];
      const matchCamera = (equipment || []).find((e) => e.name.includes("Sony A7 IV") || e.name.includes("Canon EOS R5") || e.name.includes("Nikon Z8")) || equipment?.[0];

      replyText = `Chào bạn! Để chụp ảnh cưới / Pre-wedding chất lượng điện ảnh màu sắc sang trọng:

📸 **Máy ảnh gợi ý**: ${matchCamera ? matchCamera.name : "Sony A7 IV Full-Frame"}
👨‍🎨 **Thợ chụp gợi ý**: Nhiếp ảnh gia ${matchPhotographer ? matchPhotographer.full_name : "Nguyễn Anh Tuấn"} (${matchPhotographer ? matchPhotographer.experience_years : 8} năm kinh nghiệm chuyên ảnh cưới cinematic).`;

      if (matchCamera) recommendations.push({ type: "equipment", item: matchCamera });
      if (matchPhotographer) recommendations.push({ type: "photographer", item: matchPhotographer });
    }
    // Video / 4K / Vlog
    else if (lowerPrompt.includes("quay phim") || lowerPrompt.includes("video") || lowerPrompt.includes("reels") || lowerPrompt.includes("tiktok") || lowerPrompt.includes("4k")) {
      const matchFX3 = (equipment || []).find((e) => e.name.includes("FX3") || e.name.includes("A7S III") || e.name.includes("C70")) || equipment?.[1];
      const matchMic = (equipment || []).find((e) => e.name.includes("Rode") || e.name.includes("Wireless") || e.name.includes("Gimbal")) || equipment?.[2];

      replyText = `Chào bạn! Đối với nhu cầu quay phim video 4K sắc nét và chống rung chuyên nghiệp:

🎥 **Body Cinema**: ${matchFX3 ? matchFX3.name : "Sony FX3 Cinema Camera"} (Hỗ trợ 4K 120fps quay slow-motion).
🎙️ **Phụ kiện**: ${matchMic ? matchMic.name : "Bộ Mic Rode Wireless PRO"} & Gimbal RS 3.`;

      if (matchFX3) recommendations.push({ type: "equipment", item: matchFX3 });
      if (matchMic) recommendations.push({ type: "equipment", item: matchMic });
    }
    // Budget queries
    else if (lowerPrompt.includes("100k") || lowerPrompt.includes("200k") || lowerPrompt.includes("500k") || lowerPrompt.includes("kinh phí") || lowerPrompt.includes("ngân sách") || lowerPrompt.includes("rẻ")) {
      const sortedEquipment = [...(equipment || [])].sort((a, b) => Number(a.price_per_day) - Number(b.price_per_day));
      let targetBudget = 500000;

      if (lowerPrompt.includes("100k") || lowerPrompt.includes("100.000")) targetBudget = 100000;
      else if (lowerPrompt.includes("200k")) targetBudget = 200000;

      const matchingEquip = sortedEquipment.filter((e) => Number(e.price_per_day) <= targetBudget);

      if (matchingEquip.length > 0) {
        replyText = `Chào bạn! Với ngân sách tầm ${targetBudget.toLocaleString("vi-VN")} đ/ngày, PhoTohub xin gợi ý các thiết bị phù hợp nhất:`;
        matchingEquip.slice(0, 3).forEach((e) => recommendations.push({ type: "equipment", item: e }));
      } else {
        const cheapest = sortedEquipment.slice(0, 3);
        replyText = `Chào bạn! Với kinh phí ${targetBudget.toLocaleString("vi-VN")} đ/ngày, thiết bị máy ảnh & phụ kiện studio tiết kiệm nhất tại PhoTohub khởi điểm từ ${Number(cheapest[0]?.price_per_day || 90000).toLocaleString("vi-VN")} đ/ngày:`;
        cheapest.forEach((e) => recommendations.push({ type: "equipment", item: e }));
      }
    }
    // Generic fallback for any other prompt
    else {
      const topEquip = equipment?.[0];
      const topPhoto = photographers?.[0];

      replyText = `Cảm ơn bạn đã liên hệ PhoTohub AI Assistant về nhu cầu: "${userPrompt}"! 🤖

Để phục vụ tốt nhất cho nhu cầu của bạn, PhoTohub đề xuất bộ thiết bị và thợ chụp nổi bật sẵn sàng cho thuê:

📸 **Máy ảnh nổi bật**: ${topEquip ? topEquip.name : "Sony A7 IV Full-Frame"}
👨‍🎨 **Thợ chụp chuyên nghiệp**: ${topPhoto ? `Nhiếp ảnh gia ${topPhoto.full_name}` : "Nhiếp ảnh gia PhoTohub"}`;

      if (topEquip) recommendations.push({ type: "equipment", item: topEquip });
      if (topPhoto) recommendations.push({ type: "photographer", item: topPhoto });
    }

    res.json({
      success: true,
      reply: replyText,
      recommendations,
      source: "photohub-semantic-engine",
    });
  } catch (error: any) {
    console.error("AI Controller error:", error);
    res.status(500).json({ error: "Có lỗi xảy ra trong quá trình xử lý AI." });
  }
}

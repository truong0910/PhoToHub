import { Queue } from "bullmq";
import { redisConnection, isRedisAvailable } from "../shared/redis.js";
import { getServiceRoleClient } from "../shared/supabase-client.js";
import { sendEmail } from "../shared/email-sender.js";

let queueInstance: Queue | null = null;

export function initializeEmailQueue() {
  if (isRedisAvailable && !queueInstance) {
    try {
      queueInstance = new Queue("email-queue", {
        connection: redisConnection as any
      });
      console.log("📥 BullMQ 'email-queue' queue initialized successfully.");
    } catch (err: any) {
      console.warn("⚠️ Failed to initialize BullMQ 'email-queue' queue:", err.message);
    }
  }
}

// Call initially
initializeEmailQueue();

export const emailQueue = {
  async add(name: string, data: { bookingId: string; type: string }) {
    initializeEmailQueue();

    if (isRedisAvailable && queueInstance) {
      try {
        await queueInstance.add(name, data);
        console.log(`📥 [BullMQ Queue] Enqueued email job of type '${data.type}' for Booking ID: ${data.bookingId}`);
        return;
      } catch (err: any) {
        console.warn("⚠️ BullMQ queue add failed. Falling back to In-Memory email dispatcher.");
      }
    }

    // In-Memory Fallback Email dispatch
    console.log(`📥 [In-Memory Queue] Enqueued email job of type '${data.type}' for Booking ID: ${data.bookingId}`);

    setTimeout(async () => {
      console.log(`⏳ [In-Memory Queue] Running email job of type '${data.type}' for Booking ID: ${data.bookingId}`);
      try {
        const supabase = getServiceRoleClient();
        const { data: booking, error: selectError } = await supabase
          .from("bookings")
          .select("id, total_price, client_id")
          .eq("id", data.bookingId)
          .single();

        if (selectError || !booking) return;

        const { data: client } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", booking.client_id)
          .single();

        const clientEmail = client?.email || "unknown@client.com";
        const clientName = client?.full_name || "Khách hàng";

        const subject = `[PhotoHub] Thông báo trạng thái Đơn đặt lịch #${booking.id.substring(0, 8)}`;
        let statusMessageHtml = "";
        
        if (data.type === "created") {
          statusMessageHtml = `
            <p>Đơn đặt lịch chụp/thuê thiết bị <strong>#${booking.id}</strong> của bạn đã được ghi nhận thành công trên hệ thống!</p>
            <p><strong>Tổng tiền:</strong> ${(Number(booking.total_price)).toLocaleString('vi-VN')} đ</p>
            <p style="color: #E06C45; font-weight: bold;">⚠️ Vui lòng hoàn tất thanh toán trong vòng 1 phút để giữ lịch hẹn của bạn.</p>
          `;
        } else if (data.type === "approved") {
          statusMessageHtml = `
            <p>Chúc mừng! Đơn đặt lịch chụp/thuê thiết bị <strong>#${booking.id}</strong> của bạn đã được <strong>XÁC NHẬN THÀNH CÔNG</strong>!</p>
            <p>Chúng tôi đang chuẩn bị tốt nhất cho buổi làm việc của bạn. Hẹn gặp lại bạn sớm!</p>
          `;
        } else if (data.type === "cancelled") {
          statusMessageHtml = `
            <p>Rất tiếc, đơn đặt lịch <strong>#${booking.id}</strong> đã bị <strong>HỦY TỰ ĐỘNG</strong> do quá thời gian thanh toán quy định (hoặc do khách hàng chủ động hủy).</p>
            <p>Nếu đây là nhầm lẫn, bạn hoàn toàn có thể thực hiện đặt lịch mới trên website của chúng tôi.</p>
          `;
        }

        const htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid rgba(0, 128, 128, 0.1); border-radius: 16px; background-color: #FAF6F0; color: #005F5F;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #005F5F; font-family: serif; margin-bottom: 4px;">PhotoHub Studio</h2>
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #E06C45; font-weight: bold;">Hệ thống thông báo thời gian thực</span>
            </div>
            <div style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); line-height: 1.6;">
              <h3 style="color: #005F5F; margin-top: 0; border-bottom: 1px solid rgba(0, 128, 128, 0.05); padding-bottom: 8px;">Xin chào ${clientName},</h3>
              ${statusMessageHtml}
              <hr style="border: 0; border-top: 1px dashed rgba(0, 128, 128, 0.1); margin: 20px 0;" />
              <p style="font-size: 11px; color: #888; text-align: center;">Đây là email tự động từ hệ thống PhotoHub. Vui lòng không trả lời email này.</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: clientEmail,
          subject,
          html: htmlContent
        });
      } catch (err: any) {
        console.error("❌ [In-Memory Queue] Error executing fallback email dispatch:", err.message);
      }
    }, 100);
  }
};

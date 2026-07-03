import { Worker } from "bullmq";
import { redisConnection } from "../shared/redis.js";
import { getServiceRoleClient } from "../shared/supabase-client.js";
import { sendEmail } from "../shared/email-sender.js";

export let emailWorker: Worker | null = null;

export function startEmailWorker() {
  if (emailWorker) return; // Already initialized

  try {
    emailWorker = new Worker(
      "email-queue",
      async (job) => {
        const { bookingId, type } = job.data;
        console.log(`✉️ Sending async email notification of type '${type}' for Booking ID: ${bookingId}`);

        try {
          const supabase = getServiceRoleClient();

          // Retrieve booking details and client profile
          const { data: booking, error: selectError } = await supabase
            .from("bookings")
            .select(`
              id,
              total_price,
              start_date,
              end_date,
              client_id
            `)
            .eq("id", bookingId)
            .single();

          if (selectError) {
            throw new Error(`Failed to query booking details: ${selectError.message}`);
          }

          if (!booking) {
            console.warn(`⚠️ Booking ID ${bookingId} not found. Skipping email.`);
            return;
          }

          // Query client profile to get email and name
          const { data: client, error: clientError } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", booking.client_id)
            .single();

          const clientEmail = client?.email || "unknown@client.com";
          const clientName = client?.full_name || "Khách hàng";

          const subject = `[PhotoHub] Thông báo trạng thái Đơn đặt lịch #${bookingId.substring(0, 8)}`;
          let statusMessageHtml = "";
          
          if (type === "created") {
            statusMessageHtml = `
              <p>Đơn đặt lịch chụp/thuê thiết bị <strong>#${bookingId}</strong> của bạn đã được ghi nhận thành công trên hệ thống!</p>
              <p><strong>Tổng tiền:</strong> ${(Number(booking.total_price)).toLocaleString('vi-VN')} đ</p>
              <p style="color: #E06C45; font-weight: bold;">⚠️ Vui lòng hoàn tất thanh toán trong vòng 1 phút để giữ lịch hẹn của bạn.</p>
            `;
          } else if (type === "approved") {
            statusMessageHtml = `
              <p>Chúc mừng! Đơn đặt lịch chụp/thuê thiết bị <strong>#${bookingId}</strong> của bạn đã được <strong>XÁC NHẬN THÀNH CÔNG</strong>!</p>
              <p>Chúng tôi đang chuẩn bị tốt nhất cho buổi làm việc của bạn. Hẹn gặp lại bạn sớm!</p>
            `;
          } else if (type === "cancelled") {
            statusMessageHtml = `
              <p>Rất tiếc, đơn đặt lịch <strong>#${bookingId}</strong> đã bị <strong>HỦY TỰ ĐỘNG</strong> do quá thời gian thanh toán quy định (hoặc do khách hàng chủ động hủy).</p>
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
          console.error(`❌ Error in email worker for job ${job.id}:`, err.message);
          throw err;
        }
      },
      {
        connection: redisConnection as any
      }
    );

    emailWorker.on("completed", (job) => {
      console.log(`✅ Email job ${job.id} dispatched successfully.`);
    });

    emailWorker.on("failed", (job, err) => {
      console.error(`❌ Email job ${job?.id} failed:`, err);
    });

    console.log("⚙️ BullMQ 'email-queue' worker started dynamically.");
  } catch (err: any) {
    console.warn("⚠️ Failed to initialize BullMQ 'email-queue' worker:", err.message);
  }
}

// Attempt starting immediately if connection is already ready
if (redisConnection.status === "ready" || redisConnection.status === "connect") {
  startEmailWorker();
}

// Bind to connection events for reactive startup
redisConnection.on("connect", () => {
  startEmailWorker();
});

import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const sender = process.env.SMTP_SENDER || `"PhotoHub Studio" <${user}>`;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials not set. Skipping real email dispatch.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // True for 465, false for 587
    auth: {
      user,
      pass
    }
  });

  try {
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject,
      html
    });
    console.log(`✉️ Email dispatched successfully: ${info.messageId}`);
    return info;
  } catch (err: any) {
    console.error("❌ Failed to dispatch email via Nodemailer:", err.message);
    throw err;
  }
}

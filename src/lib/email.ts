import nodemailer from "nodemailer";

const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null;

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> {
  if (!transporter) {
    console.log(`[EMAIL] OTP for ${email} (${purpose}): ${otp}`);
    return true;
  }

  const subject =
    purpose === "verify"
      ? `${otp} is your Techie Shorts verification code`
      : `${otp} is your Techie Shorts password reset code`;

  const html =
    purpose === "verify"
      ? `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Welcome to Techie Shorts! 🚀</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Enter this code to verify your email:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't sign up for Techie Shorts, ignore this email.</p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">— Techie Shorts Team</p>
      </div>
      `
      : `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Enter this code to reset your Techie Shorts password:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">— Techie Shorts Team</p>
      </div>
      `;

  try {
    await transporter.sendMail({
      from: `"Techie Shorts" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return false;
  }
}

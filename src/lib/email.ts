import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<boolean> {
  if (!resend) {
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
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Welcome to Techie Shorts!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Enter this code to verify your email:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't sign up for Techie Shorts, ignore this email.</p>
      </div>
      `
      : `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Enter this code to reset your password:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't request a password reset, ignore this email.</p>
      </div>
      `;

  try {
    await resend.emails.send({
      from: "Techie Shorts <onboarding@resend.dev>",
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

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

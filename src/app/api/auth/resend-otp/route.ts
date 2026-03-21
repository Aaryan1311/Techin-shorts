import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { generateOTP, sendOTPEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "auth");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const email = typeof body.email === "string" ? sanitize(body.email) : undefined;
  const purpose = body.purpose === "reset" ? "reset" : "verify";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't leak whether user exists
    return NextResponse.json({ success: true, message: "New code sent" });
  }

  // Prevent spam: if OTP was set less than 60s ago, reject
  if (user.otpExpiry) {
    const otpSetAt = new Date(user.otpExpiry.getTime() - 10 * 60 * 1000); // otpExpiry - 10min = when it was set
    if (Date.now() - otpSetAt.getTime() < 60_000) {
      return NextResponse.json(
        { error: "Please wait before requesting a new code" },
        { status: 429 }
      );
    }
  }

  const otp = generateOTP();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpPurpose: purpose,
    },
  });

  await sendOTPEmail(email, otp, purpose as "verify" | "reset");

  return NextResponse.json({ success: true, message: "New code sent" });
}

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

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to not leak user existence
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const otp = generateOTP();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        otpPurpose: "reset",
      },
    });
    await sendOTPEmail(email, otp, "reset");
  }

  return NextResponse.json({
    message: "If an account exists, a reset code has been sent.",
  });
}

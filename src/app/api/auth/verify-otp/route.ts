import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "auth");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const email = typeof body.email === "string" ? sanitize(body.email) : undefined;
  const otp = typeof body.otp === "string" ? sanitize(body.otp) : undefined;

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      otp,
      otpPurpose: "verify",
      otpExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please try again." },
      { status: 400 }
    );
  }

  // Generate one-time login token for seamless auto-login
  const loginToken = crypto.randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      otp: null,
      otpExpiry: null,
      otpPurpose: null,
      resetToken: loginToken,
      resetTokenExpiry: new Date(Date.now() + 60 * 1000), // 60 seconds
    },
  });

  return NextResponse.json({ success: true, loginToken, email });
}

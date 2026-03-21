import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, "auth");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const email = typeof body.email === "string" ? sanitize(body.email) : undefined;
  const otp = typeof body.otp === "string" ? sanitize(body.otp) : undefined;
  const { password } = body;

  if (!email || !otp || !password) {
    return NextResponse.json({ error: "Email, OTP, and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Verify OTP again
  const user = await prisma.user.findFirst({
    where: {
      email,
      otp,
      otpPurpose: "reset",
      otpExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
      otpPurpose: null,
    },
  });

  return NextResponse.json({ success: true });
}

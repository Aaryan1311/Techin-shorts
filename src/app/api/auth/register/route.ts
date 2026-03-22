import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rateLimit";
import { sanitize } from "@/lib/sanitize";
import { generateOTP, sendOTPEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  // Rate limit auth endpoints strictly
  const rateLimited = await applyRateLimit(request, "auth");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const name = typeof body.name === "string" ? sanitize(body.name) : undefined;
  const email = typeof body.email === "string" ? sanitize(body.email) : undefined;
  const { password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);

  // First user becomes admin automatically
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  const user = await prisma.user.create({
    data: {
      name: name || null,
      email,
      password: hashed,
      isAdmin: isFirstUser,
      emailVerified: false,
    },
  });

  // Generate and send OTP
  const otp = generateOTP();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpPurpose: "verify",
    },
  });
  await sendOTPEmail(email, otp, "verify");

  return NextResponse.json(
    { success: true, requiresVerification: true, email },
    { status: 201 }
  );
}

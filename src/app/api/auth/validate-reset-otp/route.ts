import { NextRequest, NextResponse } from "next/server";
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
      otpPurpose: "reset",
      otpExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}

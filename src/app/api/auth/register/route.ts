import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, password } = body;

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
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

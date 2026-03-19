import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LANG_MAP: Record<string, "ENGLISH" | "HINDI" | "HINGLISH"> = {
  EN: "ENGLISH",
  HI: "HINDI",
  HINGLISH: "HINGLISH",
};

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = await request.json();
  const { preferredLanguage } = body;

  const dbLang = LANG_MAP[preferredLanguage];
  if (!dbLang) {
    return NextResponse.json(
      { error: "Invalid language. Use EN, HI, or HINGLISH" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { preferredLanguage: dbLang },
  });

  return NextResponse.json({ preferredLanguage: dbLang });
}

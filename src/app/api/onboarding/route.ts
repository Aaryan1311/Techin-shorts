import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { tagIds } = await request.json();

  if (!Array.isArray(tagIds) || tagIds.length < 3) {
    return NextResponse.json(
      { error: "Select at least 3 tags" },
      { status: 400 }
    );
  }

  // Delete existing follows and replace
  await prisma.userTagFollow.deleteMany({ where: { userId } });

  await prisma.userTagFollow.createMany({
    data: tagIds.map((tagId: string) => ({ userId, tagId })),
  });

  await prisma.user.update({
    where: { id: userId },
    data: { onboarded: true },
  });

  return NextResponse.json({ success: true });
}

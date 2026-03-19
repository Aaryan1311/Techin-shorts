import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { type } = body;

  if (type !== "LIKE" && type !== "DISLIKE") {
    return NextResponse.json(
      { error: "type must be LIKE or DISLIKE" },
      { status: 400 }
    );
  }

  const field = type === "LIKE" ? "likeCount" : "dislikeCount";

  const news = await prisma.news.update({
    where: { id: params.id },
    data: { [field]: { increment: 1 } },
    select: { likeCount: true, dislikeCount: true },
  });

  return NextResponse.json(news);
}

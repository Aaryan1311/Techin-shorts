import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const body = await request.json();
  const { type } = body;

  if (type !== "LIKE" && type !== "DISLIKE" && type !== "REMOVE") {
    return NextResponse.json(
      { error: "type must be LIKE, DISLIKE, or REMOVE" },
      { status: 400 }
    );
  }

  const newsId = params.id;

  // Verify news exists
  const newsItem = await prisma.news.findUnique({ where: { id: newsId } });
  if (!newsItem) {
    return NextResponse.json({ error: "News not found" }, { status: 404 });
  }

  if (userId) {
    // Authenticated: use UserNewsInteraction table
    const existing = await prisma.userNewsInteraction.findUnique({
      where: { userId_newsId: { userId, newsId } },
    });

    if (type === "REMOVE") {
      // Remove existing interaction
      if (existing) {
        const field =
          existing.type === "LIKE" ? "likeCount" : "dislikeCount";
        await prisma.$transaction([
          prisma.userNewsInteraction.delete({
            where: { id: existing.id },
          }),
          prisma.news.update({
            where: { id: newsId },
            data: { [field]: { decrement: 1 } },
          }),
        ]);
      }
    } else if (existing) {
      if (existing.type === type) {
        // Toggle off: same type clicked again
        const field = type === "LIKE" ? "likeCount" : "dislikeCount";
        await prisma.$transaction([
          prisma.userNewsInteraction.delete({
            where: { id: existing.id },
          }),
          prisma.news.update({
            where: { id: newsId },
            data: { [field]: { decrement: 1 } },
          }),
        ]);
      } else {
        // Switch: e.g., from LIKE to DISLIKE
        const oldField =
          existing.type === "LIKE" ? "likeCount" : "dislikeCount";
        const newField = type === "LIKE" ? "likeCount" : "dislikeCount";
        await prisma.$transaction([
          prisma.userNewsInteraction.update({
            where: { id: existing.id },
            data: { type },
          }),
          prisma.news.update({
            where: { id: newsId },
            data: {
              [oldField]: { decrement: 1 },
              [newField]: { increment: 1 },
            },
          }),
        ]);
      }
    } else {
      // New interaction
      const field = type === "LIKE" ? "likeCount" : "dislikeCount";
      await prisma.$transaction([
        prisma.userNewsInteraction.create({
          data: { userId, newsId, type },
        }),
        prisma.news.update({
          where: { id: newsId },
          data: { [field]: { increment: 1 } },
        }),
      ]);
    }
  } else {
    // Unauthenticated: just increment the count (no toggle support)
    if (type === "REMOVE") {
      return NextResponse.json(
        { error: "Login required to remove interactions" },
        { status: 401 }
      );
    }
    const field = type === "LIKE" ? "likeCount" : "dislikeCount";
    await prisma.news.update({
      where: { id: newsId },
      data: { [field]: { increment: 1 } },
    });
  }

  // Re-fetch updated counts
  const updated = await prisma.news.findUnique({
    where: { id: newsId },
    select: { likeCount: true, dislikeCount: true },
  });

  // Auto-hide: dislikes > 10 AND dislikes > 3x likes
  if (
    updated &&
    updated.dislikeCount > 10 &&
    updated.dislikeCount > updated.likeCount * 3
  ) {
    await prisma.news.update({
      where: { id: newsId },
      data: { isActive: false },
    });
  }

  // Return current user interaction state
  let userInteraction: string | null = null;
  if (userId) {
    const interaction = await prisma.userNewsInteraction.findUnique({
      where: { userId_newsId: { userId, newsId } },
    });
    userInteraction = interaction?.type || null;
  }

  return NextResponse.json({
    likeCount: updated!.likeCount,
    dislikeCount: updated!.dislikeCount,
    userInteraction,
  });
}

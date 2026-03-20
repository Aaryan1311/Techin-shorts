import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BehaviorType } from "@prisma/client";
import { updateTopicScores } from "@/lib/recommendation";

const VALID_BEHAVIORS: Set<string> = new Set([
  "VIEW",
  "READ_SUMMARY",
  "CLICK_DETAIL",
  "CLICK_FUTURE",
  "CLICK_BUILD",
  "READ_DETAIL",
  "SHARE",
]);

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { newsId?: string; type?: string; durationSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { newsId, type, durationSeconds } = body;

  if (!newsId || !type || !VALID_BEHAVIORS.has(type)) {
    return NextResponse.json(
      { error: "Invalid newsId or type" },
      { status: 400 }
    );
  }

  // Verify news exists
  const news = await prisma.news.findUnique({ where: { id: newsId } });
  if (!news) {
    return NextResponse.json({ error: "News not found" }, { status: 404 });
  }

  // Dedup VIEW events: don't save duplicate VIEW for same user+news within 1 hour
  if (type === "VIEW") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentView = await prisma.userBehavior.findFirst({
      where: {
        userId,
        newsId,
        type: "VIEW",
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentView) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }
  }

  // Save behavior
  await prisma.userBehavior.create({
    data: {
      userId,
      newsId,
      type: type as BehaviorType,
      durationSeconds: durationSeconds ?? null,
    },
  });

  // Update topic scores (fire-and-forget style but we await to ensure consistency)
  try {
    await updateTopicScores(userId, newsId, type as BehaviorType);
  } catch (err) {
    console.error("Failed to update topic scores:", err);
    // Don't fail the request — tracking was saved successfully
  }

  return NextResponse.json({ ok: true });
}

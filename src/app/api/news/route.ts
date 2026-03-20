import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tagSlug = searchParams.get("tag");
  const feed = searchParams.get("feed"); // "personal" or "all" (default)

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const where: Record<string, unknown> = { isActive: true };

  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
  }

  // For personal feed, gather followed tags + tags from liked news
  let followedTagIds: string[] = [];
  let likedTagIds: string[] = [];

  if (userId && feed === "personal") {
    const [follows, likedInteractions] = await Promise.all([
      prisma.userTagFollow.findMany({
        where: { userId },
        select: { tagId: true },
      }),
      prisma.userNewsInteraction.findMany({
        where: { userId, type: "LIKE" },
        select: {
          news: {
            select: {
              tags: { select: { tagId: true } },
            },
          },
        },
      }),
    ]);

    followedTagIds = follows.map((f) => f.tagId);
    likedTagIds = likedInteractions.flatMap((i) =>
      i.news.tags.map((t) => t.tagId)
    );

    const allRelevantTagIds = Array.from(new Set(followedTagIds.concat(likedTagIds)));

    if (allRelevantTagIds.length > 0 && !tagSlug) {
      where.tags = { some: { tagId: { in: allRelevantTagIds } } };
    }
  }

  const news = await prisma.news.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
    },
  });

  // Fetch user interactions if logged in
  let userInteractions: Record<string, string> = {};
  if (userId) {
    const interactions = await prisma.userNewsInteraction.findMany({
      where: {
        userId,
        newsId: { in: news.map((n) => n.id) },
      },
      select: { newsId: true, type: true },
    });
    userInteractions = Object.fromEntries(
      interactions.map((i) => [i.newsId, i.type])
    );
  }

  // Sort: if logged in and not filtering by tag slug, boost followed/liked tag news
  let sorted = news;
  if (userId && !tagSlug && feed !== "personal") {
    // For the "all" feed when logged in, show followed-tag news first
    if (followedTagIds.length === 0 && userId) {
      const follows = await prisma.userTagFollow.findMany({
        where: { userId },
        select: { tagId: true },
      });
      followedTagIds = follows.map((f) => f.tagId);
    }

    if (followedTagIds.length > 0) {
      const followedSet = new Set(followedTagIds);
      const likedSet = new Set(likedTagIds);

      sorted = [...news].sort((a, b) => {
        const aFollowed = a.tags.some((t) => followedSet.has(t.tagId));
        const bFollowed = b.tags.some((t) => followedSet.has(t.tagId));
        const aLiked = a.tags.some((t) => likedSet.has(t.tagId));
        const bLiked = b.tags.some((t) => likedSet.has(t.tagId));

        const aScore = (aFollowed ? 2 : 0) + (aLiked ? 1 : 0);
        const bScore = (bFollowed ? 2 : 0) + (bLiked ? 1 : 0);

        if (aScore !== bScore) return bScore - aScore;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
  }

  const result = sorted.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl,
    source: item.source || null,
    imageUrl: item.imageUrl,
    likeCount: item.likeCount,
    dislikeCount: item.dislikeCount,
    viewCount: item.viewCount,
    publishedAt: item.publishedAt,
    createdAt: item.createdAt,
    userInteraction: userInteractions[item.id] || null,
    tags: item.tags.map((nt) => ({
      id: nt.tag.id,
      name: nt.tag.name,
      slug: nt.tag.slug,
      color: nt.tag.color,
    })),
  }));

  return NextResponse.json(result);
}

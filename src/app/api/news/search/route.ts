import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const sort = searchParams.get("sort") || "relevant";

  if (!query) {
    return NextResponse.json([]);
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id || null;

  // Split query into words for AND matching
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return NextResponse.json([]);
  }

  // Build AND conditions: each word must appear in title OR summary
  const whereConditions = words.map((word) => ({
    OR: [
      { title: { contains: word, mode: "insensitive" as const } },
      { summary: { contains: word, mode: "insensitive" as const } },
    ],
  }));

  try {
    // Determine ordering
    let orderBy: Record<string, string>[];
    switch (sort) {
      case "recent":
        orderBy = [{ createdAt: "desc" }];
        break;
      case "trending":
        orderBy = [{ trendingScore: "desc" }, { createdAt: "desc" }];
        break;
      default: // "relevant"
        // Order by viewCount as a proxy for relevance, then recency
        orderBy = [{ viewCount: "desc" }, { createdAt: "desc" }];
        break;
    }

    const results = await prisma.news.findMany({
      where: {
        isActive: true,
        AND: whereConditions,
      },
      orderBy,
      take: 20,
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Get user interactions if logged in
    let userInteractions: Record<string, string> = {};
    if (userId && results.length > 0) {
      const interactions = await prisma.userNewsInteraction.findMany({
        where: {
          userId,
          newsId: { in: results.map((r) => r.id) },
        },
        select: { newsId: true, type: true },
      });
      userInteractions = Object.fromEntries(
        interactions.map((i) => [i.newsId, i.type])
      );
    }

    const formatted = results.map((item) => ({
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
      isTrending: (item.trendingScore || 0) >= 8,
      tags: item.tags.map((nt) => ({
        id: nt.tag.id,
        name: nt.tag.name,
        slug: nt.tag.slug,
        color: nt.tag.color,
      })),
      summaryHi: item.summaryHi || null,
      summaryHinglish: item.summaryHinglish || null,
      audioUrlEn: item.audioUrlEn || null,
      audioUrlHi: item.audioUrlHi || null,
      audioUrlHinglish: item.audioUrlHinglish || null,
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Search failed:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

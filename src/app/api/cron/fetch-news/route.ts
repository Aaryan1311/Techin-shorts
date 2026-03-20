import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/newsFetcher";
import { classifyArticle, summarizeArticle } from "@/lib/aiCurator";
import { prisma } from "@/lib/prisma";
import he from "he";

function ensureString(value: unknown): string {
  if (typeof value === "string") return he.decode(value);
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return (value as unknown[])
        .map((item, i) => {
          if (typeof item === "string") return `${i + 1}. ${item}`;
          if (typeof item === "object" && item !== null) {
            return Object.entries(item as Record<string, unknown>)
              .map(([k, v]) => `**${k}**: ${v}`)
              .join("\n");
          }
          return String(item);
        })
        .join("\n\n");
    }
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const cleanKey = key.replace(/([A-Z])/g, " $1").trim();
        return `**${cleanKey}**\n${val}`;
      })
      .join("\n\n");
  }
  return String(value);
}

// GET endpoint for cron jobs — processes one article per invocation
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Ensure pending articles exist
    let pendingCount = await prisma.pendingArticle.count();

    if (pendingCount === 0) {
      const feedItems = await fetchAllFeeds();
      const existingUrls = new Set(
        (
          await prisma.news.findMany({
            where: { sourceUrl: { in: feedItems.map((f) => f.link).filter(Boolean) } },
            select: { sourceUrl: true },
          })
        ).map((n) => n.sourceUrl)
      );

      const newItems = feedItems.filter((item) => item.link && !existingUrls.has(item.link));

      for (const item of newItems.slice(0, 20)) {
        try {
          await prisma.pendingArticle.create({
            data: {
              title: item.title,
              description: item.contentSnippet || item.content || null,
              sourceUrl: item.link,
              source: item.source,
              imageUrl: item.imageUrl || null,
              pubDate: item.pubDate ? new Date(item.pubDate) : null,
            },
          });
        } catch {
          // skip duplicates
        }
      }

      pendingCount = await prisma.pendingArticle.count();
      if (pendingCount === 0) {
        return NextResponse.json({ added: 0, remaining: 0, status: "No new articles" });
      }
    }

    // Process one pending article
    const pending = await prisma.pendingArticle.findFirst({ orderBy: { createdAt: "asc" } });
    if (!pending) {
      return NextResponse.json({ added: 0, remaining: 0, status: "No pending" });
    }

    let added = 0;
    let statusMsg = "";

    try {
      const classification = await classifyArticle(
        pending.title,
        pending.description || pending.title,
        pending.sourceUrl,
        pending.source
      );

      if (!classification || !classification.isNews || classification.qualityScore < 6 || classification.relevanceForDevs < 5) {
        statusMsg = `filtered: "${pending.title}"`;
      } else {
        const summarized = await summarizeArticle(pending.title, pending.description || pending.title, classification);
        if (summarized) {
          const finalTags = [...summarized.tags];
          if (classification.isTrending && !finalTags.includes("trending")) finalTags.push("trending");
          const tagConnections = [];
          for (const slug of finalTags) {
            const tag = await prisma.tag.findUnique({ where: { slug } });
            if (tag) tagConnections.push({ tag: { connect: { slug } } });
          }
          await prisma.news.create({
            data: {
              title: ensureString(pending.title),
              summary: ensureString(summarized.summary),
              detailContent: ensureString(summarized.detailContent) || null,
              futureImpact: ensureString(summarized.futureImpact) || null,
              buildOnThis: ensureString(summarized.buildOnThis) || null,
              sourceUrl: pending.sourceUrl,
              source: pending.source || null,
              imageUrl: pending.imageUrl || null,
              trendingScore: classification.trendingScore,
              qualityScore: classification.qualityScore,
              relevanceScore: classification.relevanceForDevs,
              publishedAt: pending.pubDate || new Date(),
              tags: { create: tagConnections },
            },
          });
          added = 1;
          statusMsg = `added: "${pending.title}"`;
        } else {
          statusMsg = `summarization failed: "${pending.title}"`;
        }
      }
    } catch (err) {
      statusMsg = `error: ${err instanceof Error ? err.message : "unknown"}`;
    }

    await prisma.pendingArticle.delete({ where: { id: pending.id } });
    const remaining = await prisma.pendingArticle.count();

    return NextResponse.json({ added, remaining, status: statusMsg });
  } catch (err) {
    console.error("Cron fetch error:", err);
    return NextResponse.json(
      { error: "Pipeline failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

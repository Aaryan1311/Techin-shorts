import { NextRequest, NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/newsFetcher";
import {
  classifyArticle,
  summarizeArticle,
} from "@/lib/aiCurator";
import { prisma } from "@/lib/prisma";
import he from "he";

/** Ensure a value is a plain string — handles JSON objects/arrays from AI output */
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret } = body;

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if we have pending articles. If not, fetch fresh RSS and populate.
    let pendingCount = await prisma.pendingArticle.count();

    if (pendingCount === 0) {
      // Fetch all feeds and populate pending_articles
      const feedItems = await fetchAllFeeds();

      // Deduplicate against existing news
      const existingUrls = new Set(
        (
          await prisma.news.findMany({
            where: {
              sourceUrl: {
                in: feedItems.map((f) => f.link).filter(Boolean),
              },
            },
            select: { sourceUrl: true },
          })
        ).map((n) => n.sourceUrl)
      );

      const newItems = feedItems.filter(
        (item) => item.link && !existingUrls.has(item.link)
      );

      if (newItems.length === 0) {
        return NextResponse.json({
          added: 0,
          remaining: 0,
          status: "No new articles found",
        });
      }

      // Insert into pending_articles (skip duplicates)
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
          // Skip duplicates (unique constraint on sourceUrl)
        }
      }

      pendingCount = await prisma.pendingArticle.count();

      if (pendingCount === 0) {
        return NextResponse.json({
          added: 0,
          remaining: 0,
          status: "All articles already processed",
        });
      }
    }

    // Pick the oldest pending article
    const pending = await prisma.pendingArticle.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!pending) {
      return NextResponse.json({
        added: 0,
        remaining: 0,
        status: "No pending articles",
      });
    }

    // Process this single article through Stage 1 (classify) + Stage 2 (summarize)
    let added = 0;
    let statusMsg = "";

    try {
      // Stage 1: Classify
      const classification = await classifyArticle(
        pending.title,
        pending.description || pending.title,
        pending.sourceUrl,
        pending.source
      );

      if (!classification) {
        statusMsg = `skipped: classification parse failed — "${pending.title}"`;
      } else if (!classification.isNews) {
        statusMsg = `filtered: ${classification.category} — "${pending.title}"`;
      } else if (classification.qualityScore < 6) {
        statusMsg = `filtered: low quality (${classification.qualityScore}/10) — "${pending.title}"`;
      } else if (classification.relevanceForDevs < 5) {
        statusMsg = `filtered: low relevance (${classification.relevanceForDevs}/10) — "${pending.title}"`;
      } else {
        // Stage 2: Summarize
        const summarized = await summarizeArticle(
          pending.title,
          pending.description || pending.title,
          classification
        );

        if (!summarized) {
          statusMsg = `skipped: summarization failed — "${pending.title}"`;
        } else {
          // Ensure tags include "trending" if isTrending
          const finalTags = [...summarized.tags];
          if (classification.isTrending && !finalTags.includes("trending")) {
            finalTags.push("trending");
          }

          // Ensure tags exist in DB
          const tagConnections = [];
          for (const slug of finalTags) {
            const tag = await prisma.tag.findUnique({ where: { slug } });
            if (tag) {
              tagConnections.push({ tag: { connect: { slug } } });
            }
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
        }
      }
    } catch (err) {
      statusMsg = `error processing "${pending.title}": ${err instanceof Error ? err.message : "unknown"}`;
      console.error("[fetch-news]", statusMsg);
    }

    // Remove processed article from pending
    await prisma.pendingArticle.delete({ where: { id: pending.id } });

    const remaining = await prisma.pendingArticle.count();

    return NextResponse.json({
      added,
      remaining,
      status: statusMsg,
    });
  } catch (err) {
    console.error("Fetch pipeline error:", err);
    return NextResponse.json(
      {
        error: "Pipeline failed",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}

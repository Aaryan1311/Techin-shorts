import { fetchAllFeeds, type FeedItem } from "@/lib/newsFetcher";
import {
  classifyArticle,
  summarizeArticle,
  type ClassificationResult,
} from "@/lib/aiCurator";
import { prisma } from "@/lib/prisma";

export interface PipelineResult {
  fetched: number;
  new: number;
  classified: number;
  filtered: number;
  processed: number;
  filterBreakdown: string;
  results: { title: string; status: string }[];
}

interface ClassifiedItem {
  item: FeedItem;
  classification: ClassificationResult;
}

export async function runFetchPipeline(): Promise<PipelineResult> {
  // 1. Fetch all feeds
  const feedItems = await fetchAllFeeds();
  console.log(`Fetched ${feedItems.length} feed items`);

  // 2. Deduplicate against existing news (by source URL)
  const existingUrls = new Set(
    (
      await prisma.news.findMany({
        where: {
          sourceUrl: { in: feedItems.map((f) => f.link).filter(Boolean) },
        },
        select: { sourceUrl: true },
      })
    ).map((n) => n.sourceUrl)
  );

  const newItems = feedItems.filter(
    (item) => item.link && !existingUrls.has(item.link)
  );
  console.log(`${newItems.length} new items after deduplication`);

  // Limit to 15 items per run for classification (cheap/fast Stage 1)
  const toClassify = newItems.slice(0, 15);
  const results: { title: string; status: string }[] = [];

  // ── Stage 1: Classification (3s delay between calls) ──
  console.log(`\n── Stage 1: Classifying ${toClassify.length} articles ──`);
  const classified: ClassifiedItem[] = [];
  const filterReasons: Record<string, number> = {
    tutorials: 0,
    low_quality: 0,
    not_news: 0,
    low_relevance: 0,
    parse_failed: 0,
  };

  for (let i = 0; i < toClassify.length; i++) {
    const item = toClassify[i];

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 3_000));
    }

    try {
      const classification = await classifyArticle(
        item.title,
        item.contentSnippet || item.content || item.title,
        item.link,
        item.source
      );

      if (!classification) {
        filterReasons.parse_failed++;
        results.push({
          title: item.title,
          status: "skipped: classification parse failed",
        });
        continue;
      }

      // Apply quality filters
      if (!classification.isNews) {
        const cat = classification.category;
        if (cat === "tutorial" || cat === "blog_post" || cat === "opinion") {
          filterReasons.tutorials++;
        } else {
          filterReasons.not_news++;
        }
        results.push({
          title: item.title,
          status: `filtered: ${classification.category} (score: ${classification.qualityScore}, reason: ${classification.reasoning})`,
        });
        continue;
      }

      if (classification.qualityScore < 6) {
        filterReasons.low_quality++;
        results.push({
          title: item.title,
          status: `filtered: low quality (${classification.qualityScore}/10 — ${classification.reasoning})`,
        });
        continue;
      }

      if (classification.relevanceForDevs < 5) {
        filterReasons.low_relevance++;
        results.push({
          title: item.title,
          status: `filtered: low relevance (${classification.relevanceForDevs}/10)`,
        });
        continue;
      }

      classified.push({ item, classification });
      console.log(
        `  ✓ "${item.title}" → quality:${classification.qualityScore} relevance:${classification.relevanceForDevs} trending:${classification.isTrending}`
      );
    } catch (err) {
      filterReasons.parse_failed++;
      console.error(`[Stage 1] Error classifying "${item.title}":`, err);
      results.push({
        title: item.title,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  const totalFiltered = toClassify.length - classified.length;
  const filterBreakdown = `Filtered ${totalFiltered}/${toClassify.length} articles: ${filterReasons.tutorials} tutorials, ${filterReasons.low_quality} low quality, ${filterReasons.not_news} not news, ${filterReasons.low_relevance} low relevance, ${filterReasons.parse_failed} parse errors`;
  console.log(`\n${filterBreakdown}`);
  console.log(`${classified.length} articles passed to Stage 2\n`);

  // ── Stage 2: Summarization (5s delay between calls) ──
  // Limit to 5 for summarization (heavier API calls)
  const toSummarize = classified.slice(0, 5);
  console.log(`── Stage 2: Summarizing ${toSummarize.length} articles ──`);

  for (let i = 0; i < toSummarize.length; i++) {
    const { item, classification } = toSummarize[i];

    if (i > 0) {
      console.log("Waiting 5s before next summarization...");
      await new Promise((r) => setTimeout(r, 5_000));
    }

    try {
      const articleContent =
        item.contentSnippet || item.content || item.title;
      const summarized = await summarizeArticle(
        item.title,
        articleContent,
        classification
      );

      if (!summarized) {
        results.push({
          title: item.title,
          status: "skipped: summarization parse failed",
        });
        continue;
      }

      // Ensure tags include "trending" if isTrending
      const finalTags = [...summarized.tags];
      if (
        classification.isTrending &&
        !finalTags.includes("trending")
      ) {
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
          title: item.title,
          summary: summarized.summary,
          detailContent: summarized.detailContent,
          futureImpact: summarized.futureImpact,
          buildOnThis: summarized.buildOnThis,
          sourceUrl: item.link,
          source: item.source || null,
          imageUrl: item.imageUrl || null,
          trendingScore: classification.trendingScore,
          qualityScore: classification.qualityScore,
          relevanceScore: classification.relevanceForDevs,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          tags: {
            create: tagConnections,
          },
        },
      });

      results.push({
        title: item.title,
        status: `success (quality:${classification.qualityScore} tags:${finalTags.join(",")})`,
      });
      console.log(`  ✓ Saved: "${item.title}"`);
    } catch (err) {
      console.error(`[Stage 2] Failed to process "${item.title}":`, err);
      results.push({
        title: item.title,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return {
    fetched: feedItems.length,
    new: newItems.length,
    classified: toClassify.length,
    filtered: totalFiltered,
    processed: toSummarize.length,
    filterBreakdown,
    results,
  };
}

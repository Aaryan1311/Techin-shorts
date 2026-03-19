import { fetchAllFeeds } from "@/lib/newsFetcher";
import { summarizeArticle } from "@/lib/aiSummarizer";
import { prisma } from "@/lib/prisma";

export interface PipelineResult {
  fetched: number;
  new: number;
  processed: number;
  results: { title: string; status: string }[];
}

export async function runFetchPipeline(): Promise<PipelineResult> {
  // 1. Fetch RSS feeds
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

  // Limit to 15 items per run to avoid API rate limits
  const toProcess = newItems.slice(0, 15);
  const results: { title: string; status: string }[] = [];

  // 3. Summarize and save each article
  for (const item of toProcess) {
    try {
      const articleContent = item.contentSnippet || item.content || item.title;
      const summarized = await summarizeArticle(item.title, articleContent);

      // Ensure tags exist in DB
      const tagConnections = [];
      for (const slug of summarized.tags) {
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
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          tags: {
            create: tagConnections,
          },
        },
      });

      results.push({ title: item.title, status: "success" });
    } catch (err) {
      console.error(`Failed to process "${item.title}":`, err);
      results.push({
        title: item.title,
        status: `error: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  return {
    fetched: feedItems.length,
    new: newItems.length,
    processed: toProcess.length,
    results,
  };
}

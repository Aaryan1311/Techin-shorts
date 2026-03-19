import Parser from "rss-parser";

export interface FeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  categories?: string[];
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "TechieShorts/1.0",
  },
});

const RSS_FEEDS = [
  { name: "Hacker News", url: "https://hnrss.org/newest?points=50&count=10" },
  { name: "Dev.to", url: "https://dev.to/feed" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "GitHub Blog", url: "https://github.blog/feed/" },
];

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  const feedResults = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.slice(0, 10).map((item) => ({
          title: item.title || "Untitled",
          link: item.link || "",
          contentSnippet: item.contentSnippet || item.content || "",
          content: item.content || item.contentSnippet || "",
          pubDate: item.pubDate,
          categories: item.categories || [],
        }));
      } catch (err) {
        console.error(`Failed to fetch ${feed.name}:`, err);
        return [];
      }
    })
  );

  for (const result of feedResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}

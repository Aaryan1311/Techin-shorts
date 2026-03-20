import Parser from "rss-parser";

export interface FeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  categories?: string[];
  source: string;
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "TechieShorts/1.0",
  },
});

const RSS_FEEDS = [
  { name: "Hacker News", source: "hackernews", url: "https://hnrss.org/newest?points=50&count=10" },
  { name: "Dev.to", source: "devto", url: "https://dev.to/feed" },
  { name: "TechCrunch", source: "techcrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", source: "theverge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "GitHub Blog", source: "github", url: "https://github.blog/feed/" },
];

const REDDIT_FEEDS = [
  { subreddit: "programming", url: "https://www.reddit.com/r/programming/top.json?t=day&limit=10" },
  { subreddit: "webdev", url: "https://www.reddit.com/r/webdev/top.json?t=day&limit=10" },
  { subreddit: "javascript", url: "https://www.reddit.com/r/javascript/top.json?t=day&limit=10" },
  { subreddit: "python", url: "https://www.reddit.com/r/python/top.json?t=day&limit=10" },
  { subreddit: "devops", url: "https://www.reddit.com/r/devops/top.json?t=day&limit=10" },
  { subreddit: "machinelearning", url: "https://www.reddit.com/r/machinelearning/top.json?t=day&limit=10" },
];

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    url: string;
    selftext: string;
    ups: number;
    created_utc: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

async function fetchRedditFeeds(): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  const fetches = await Promise.allSettled(
    REDDIT_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "TechieShorts/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];

        const json: RedditResponse = await res.json();
        return json.data.children
          .filter((post) => post.data.ups >= 100)
          .map((post) => ({
            title: post.data.title,
            link: `https://www.reddit.com${post.data.permalink}`,
            contentSnippet: post.data.selftext?.slice(0, 500) || post.data.url || "",
            content: post.data.selftext || post.data.url || "",
            pubDate: new Date(post.data.created_utc * 1000).toISOString(),
            categories: [] as string[],
            source: "reddit",
          }));
      } catch (err) {
        console.error(`Failed to fetch r/${feed.subreddit}:`, err);
        return [];
      }
    })
  );

  for (const result of fetches) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results: FeedItem[] = [];

  const [rssResults, redditResults] = await Promise.all([
    Promise.allSettled(
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
            source: feed.source,
          }));
        } catch (err) {
          console.error(`Failed to fetch ${feed.name}:`, err);
          return [];
        }
      })
    ),
    fetchRedditFeeds(),
  ]);

  for (const result of rssResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  results.push(...redditResults);

  // Deduplicate by URL within the batch
  const seen = new Set<string>();
  return results.filter((item) => {
    if (!item.link || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

import Parser from "rss-parser";
import he from "he";

export interface FeedItem {
  title: string;
  link: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  categories?: string[];
  source: string;
  imageUrl?: string;
}

// Custom fields to extract media content from RSS
type CustomItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  categories?: string[];
  enclosure?: { url?: string; type?: string };
  "media:content"?: { $: { url?: string } };
  "media:thumbnail"?: { $: { url?: string } };
  "content:encoded"?: string;
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  timeout: 10000,
  headers: {
    "User-Agent": "TechieShorts/1.0",
  },
  customFields: {
    item: [
      ["media:content", "media:content"],
      ["media:thumbnail", "media:thumbnail"],
      ["content:encoded", "content:encoded"],
    ],
  },
});

const RSS_FEEDS = [
  { name: "Hacker News", source: "hackernews", url: "https://hnrss.org/newest?points=200&count=10" },
  { name: "TechCrunch", source: "techcrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", source: "theverge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "GitHub Blog", source: "github", url: "https://github.blog/feed/" },
  { name: "SD Times", source: "sdtimes", url: "https://sdtimes.com/feed/" },
  { name: "BleepingComputer", source: "bleepingcomputer", url: "https://www.bleepingcomputer.com/feed/" },
  { name: "Product Hunt", source: "producthunt", url: "https://www.producthunt.com/feed" },
  { name: "TechMeme", source: "techmeme", url: "https://www.techmeme.com/feed.xml" },
  { name: "Lobsters", source: "lobsters", url: "https://lobste.rs/rss" },
  { name: "Ars Technica", source: "arstechnica", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
];

const REDDIT_FEEDS = [
  { subreddit: "programming", url: "https://www.reddit.com/r/programming/top.json?t=day&limit=10" },
  { subreddit: "webdev", url: "https://www.reddit.com/r/webdev/top.json?t=day&limit=10" },
  { subreddit: "machinelearning", url: "https://www.reddit.com/r/machinelearning/top.json?t=day&limit=10" },
  { subreddit: "developersIndia", url: "https://www.reddit.com/r/developersIndia/top.json?t=day&limit=10" },
  { subreddit: "AI_India", url: "https://www.reddit.com/r/AI_India/top.json?t=day&limit=10" },
];

interface RedditPost {
  data: {
    title: string;
    permalink: string;
    url: string;
    selftext: string;
    is_self: boolean;
    ups: number;
    created_utc: number;
    thumbnail: string;
    preview?: {
      images?: Array<{
        source?: { url?: string };
      }>;
    };
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

/** Extract the best image URL from an RSS item */
function extractRssImage(item: CustomItem): string | undefined {
  // 1. enclosure (common in podcasts/news feeds)
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }

  // 2. media:content
  const mediaContent = item["media:content"];
  if (mediaContent && typeof mediaContent === "object") {
    const url = (mediaContent as { $?: { url?: string } }).$?.url;
    if (url) return url;
  }

  // 3. media:thumbnail
  const mediaThumbnail = item["media:thumbnail"];
  if (mediaThumbnail && typeof mediaThumbnail === "object") {
    const url = (mediaThumbnail as { $?: { url?: string } }).$?.url;
    if (url) return url;
  }

  // 4. First <img> in content or content:encoded
  const html = item["content:encoded"] || item.content || "";
  if (typeof html === "string") {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch?.[1]) return imgMatch[1];
  }

  return undefined;
}

/** Extract the best image URL from a Reddit post */
function extractRedditImage(post: RedditPost["data"]): string | undefined {
  // 1. preview images (best quality)
  const previewUrl = post.preview?.images?.[0]?.source?.url;
  if (previewUrl) {
    // Reddit HTML-encodes the URL in preview
    return previewUrl.replace(/&amp;/g, "&");
  }

  // 2. thumbnail (if it's a valid URL, not a placeholder)
  const invalidThumbnails = ["self", "default", "nsfw", "spoiler", "image", ""];
  if (post.thumbnail && !invalidThumbnails.includes(post.thumbnail) && post.thumbnail.startsWith("http")) {
    return post.thumbnail;
  }

  return undefined;
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
          .filter((post) => post.data.ups >= 500 && !post.data.is_self)
          .map((post) => ({
            title: he.decode(post.data.title),
            link: post.data.url || `https://www.reddit.com${post.data.permalink}`,
            contentSnippet: he.decode(post.data.selftext?.slice(0, 500) || post.data.url || ""),
            content: he.decode(post.data.selftext || post.data.url || ""),
            pubDate: new Date(post.data.created_utc * 1000).toISOString(),
            categories: [] as string[],
            source: "reddit",
            imageUrl: extractRedditImage(post.data),
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
            title: he.decode(item.title || "Untitled"),
            link: item.link || "",
            contentSnippet: he.decode(item.contentSnippet || item.content || ""),
            content: he.decode(item.content || item.contentSnippet || ""),
            pubDate: item.pubDate,
            categories: item.categories || [],
            source: feed.source,
            imageUrl: extractRssImage(item),
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

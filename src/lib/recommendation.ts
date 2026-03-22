import { prisma } from "@/lib/prisma";
import { BehaviorType, UserRole } from "@prisma/client";

// ── Behavior score weights ──

const BEHAVIOR_WEIGHTS: Record<BehaviorType, number> = {
  VIEW: 0.5,
  READ_SUMMARY: 1.0,
  CLICK_DETAIL: 2.0,
  CLICK_FUTURE: 2.0,
  CLICK_BUILD: 3.0,
  READ_DETAIL: 2.5,
  SHARE: 5.0,
};

const INTERACTION_WEIGHTS = {
  LIKE: 3.0,
  DISLIKE: -3.0,
};

// ── Role → tag affinity mapping ──
// Each role has weighted affinity for certain tag slugs (0.5 = minor, 1.0 = strong)

export const ROLE_TAG_AFFINITY: Record<string, Record<string, number>> = {
  DEVELOPER: {
    backend: 1.0,
    frontend: 1.0,
    devops: 0.7,
    databases: 0.8,
    "open-source": 0.7,
    javascript: 0.8,
    python: 0.8,
    nodejs: 0.8,
  },
  QA_TESTER: {
    cybersecurity: 1.0,
    devops: 0.8,
    backend: 0.6,
    frontend: 0.6,
    "open-source": 0.5,
  },
  DESIGNER: {
    frontend: 1.0,
    javascript: 0.7,
    "ai-ml": 0.5,
    "career-jobs": 0.6,
  },
  PRODUCT_MANAGER: {
    "career-jobs": 1.0,
    "ai-ml": 0.8,
    cloud: 0.5,
    "open-source": 0.5,
  },
  DATA_ANALYST: {
    "ai-ml": 1.0,
    python: 0.9,
    databases: 0.8,
    cloud: 0.6,
  },
  DEVOPS_ENGINEER: {
    devops: 1.0,
    cloud: 1.0,
    cybersecurity: 0.8,
    databases: 0.7,
    backend: 0.6,
  },
  ENGINEERING_MANAGER: {
    "career-jobs": 1.0,
    "ai-ml": 0.7,
    devops: 0.6,
    cloud: 0.6,
    "open-source": 0.5,
  },
  FOUNDER: {
    "ai-ml": 0.9,
    "career-jobs": 0.8,
    cloud: 0.7,
    "open-source": 0.6,
    backend: 0.5,
    frontend: 0.5,
  },
};

// ── Topic score update (called after each behavior event) ──

export async function updateTopicScores(
  userId: string,
  newsId: string,
  behaviorType: BehaviorType
): Promise<void> {
  // Get article tags
  const newsTags = await prisma.newsTag.findMany({
    where: { newsId },
    include: { tag: true },
  });

  if (newsTags.length === 0) return;

  const weight = BEHAVIOR_WEIGHTS[behaviorType];

  // Check if user has a like/dislike on this article for additional scoring
  const interaction = await prisma.userNewsInteraction.findUnique({
    where: { userId_newsId: { userId, newsId } },
  });

  const interactionWeight = interaction
    ? INTERACTION_WEIGHTS[interaction.type]
    : 0;

  // Upsert score for each tag
  for (const nt of newsTags) {
    const increment = weight + interactionWeight;

    await prisma.userTopicScore.upsert({
      where: {
        userId_tagSlug: { userId, tagSlug: nt.tag.slug },
      },
      create: {
        userId,
        tagSlug: nt.tag.slug,
        score: Math.max(0, increment),
      },
      update: {
        score: { increment },
      },
    });
  }
}

// ── Decay all scores by 0.98 (should be run daily via cron) ──
// TODO: Wire this to a cron job (e.g., /api/cron/decay-scores)

export async function decayAllTopicScores(): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE user_topic_scores SET score = score * 0.98, "updatedAt" = NOW()
    WHERE score > 0.01
  `;
  return result;
}

// ── Feed scoring ──

function recencyScore(createdAt: Date): number {
  const hoursAgo =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 6) return 1.0;
  if (hoursAgo <= 24) return 0.7;
  if (hoursAgo <= 48) return 0.4;
  return 0.2;
}

function roleRelevance(
  tagSlugs: string[],
  role: UserRole | null
): number {
  if (!role) return 0;
  const affinities = ROLE_TAG_AFFINITY[role] || {};
  let total = 0;
  for (const slug of tagSlugs) {
    total += affinities[slug] || 0;
  }
  return total;
}

function topicInterest(
  tagSlugs: string[],
  scores: Record<string, number>
): number {
  let total = 0;
  for (const slug of tagSlugs) {
    total += scores[slug] || 0;
  }
  return total;
}

export interface ScoredNewsItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  source: string | null;
  imageUrl: string | null;
  likeCount: number;
  dislikeCount: number;
  viewCount: number;
  trendingScore: number;
  publishedAt: Date;
  createdAt: Date;
  userInteraction: string | null;
  isTrending: boolean;
  tags: { id: string; name: string; slug: string; color: string }[];
  summaryHi: string | null;
  summaryHinglish: string | null;
  audioUrlEn: string | null;
  audioUrlHi: string | null;
  audioUrlHinglish: string | null;
}

export interface FeedResponse {
  articles: ScoredNewsItem[];
  allSeen: boolean;
}

export async function getPersonalizedFeed(
  userId: string | null,
  tagSlug?: string | null
): Promise<FeedResponse> {
  const where: Record<string, unknown> = { isActive: true };

  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug } } };
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
  let userTopicScores: Record<string, number> = {};
  let userRole: UserRole | null = null;
  let dislikedTagSlugs = new Set<string>();
  let viewedNewsIds = new Set<string>();

  if (userId) {
    const [interactions, topicScoreRows, user, dislikedInteractions, viewBehaviors] =
      await Promise.all([
        prisma.userNewsInteraction.findMany({
          where: { userId, newsId: { in: news.map((n) => n.id) } },
          select: { newsId: true, type: true },
        }),
        prisma.userTopicScore.findMany({
          where: { userId },
          select: { tagSlug: true, score: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        }),
        prisma.userNewsInteraction.findMany({
          where: { userId, type: "DISLIKE" },
          select: {
            news: { select: { tags: { select: { tag: { select: { slug: true } } } } } },
          },
        }),
        // Fetch VIEW behaviors to determine seen articles
        prisma.userBehavior.findMany({
          where: { userId, type: "VIEW", newsId: { in: news.map((n) => n.id) } },
          select: { newsId: true },
          distinct: ["newsId"],
        }),
      ]);

    userInteractions = Object.fromEntries(
      interactions.map((i) => [i.newsId, i.type])
    );
    userTopicScores = Object.fromEntries(
      topicScoreRows.map((s) => [s.tagSlug, s.score])
    );
    userRole = user?.role || null;
    dislikedTagSlugs = new Set(
      dislikedInteractions.flatMap((i) =>
        i.news.tags.map((t) => t.tag.slug)
      )
    );
    viewedNewsIds = new Set(viewBehaviors.map((v) => v.newsId));
  }

  // Score and sort
  const scored = news.map((item) => {
    const tagSlugs = item.tags.map((t) => t.tag.slug);
    const isDisliked = userInteractions[item.id] === "DISLIKE";
    const isSeen = viewedNewsIds.has(item.id);

    let personalScore: number;

    if (!userId) {
      // Anonymous: trending * 0.4 + recency * 0.6
      personalScore =
        (item.trendingScore || 0) * 0.4 +
        recencyScore(item.createdAt) * 0.6;
    } else {
      // Dislike penalty for similar tags
      let tagDislikePenalty = 0;
      for (const slug of tagSlugs) {
        if (dislikedTagSlugs.has(slug)) {
          tagDislikePenalty += 0.5;
        }
      }

      personalScore =
        roleRelevance(tagSlugs, userRole) * 3.0 +
        topicInterest(tagSlugs, userTopicScores) * 2.0 +
        (item.trendingScore || 0) * 0.15 +
        recencyScore(item.createdAt) * 1.0 -
        (isDisliked ? 10.0 : 0) -
        tagDislikePenalty * 2.0;
    }

    return {
      ...item,
      personalScore,
      isSeen,
    };
  });

  // Sort: unseen first (by personalScore), then seen (by recency)
  if (userId) {
    scored.sort((a, b) => {
      if (a.isSeen !== b.isSeen) return a.isSeen ? 1 : -1; // unseen first
      if (!a.isSeen) return b.personalScore - a.personalScore; // unseen: by score
      return b.createdAt.getTime() - a.createdAt.getTime(); // seen: by recency
    });
  } else {
    scored.sort((a, b) => b.personalScore - a.personalScore);
  }

  const allSeen = userId ? scored.length > 0 && scored.every((s) => s.isSeen) : false;

  const articles = scored.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl,
    source: item.source || null,
    imageUrl: item.imageUrl,
    likeCount: item.likeCount,
    dislikeCount: item.dislikeCount,
    viewCount: item.viewCount,
    trendingScore: item.trendingScore,
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

  return { articles, allSeen };
}

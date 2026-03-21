import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPersonalizedFeed } from "@/lib/recommendation";
import { cached } from "@/lib/redis";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Rate limit
  const rateLimited = await applyRateLimit(request, "feed");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const tagSlug = searchParams.get("tag");

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id || null;

  try {
    const cacheKey = `feed:${userId || "anon"}:${tagSlug || "all"}`;
    const { data: feed, hit } = await cached(cacheKey, 30, () =>
      getPersonalizedFeed(userId, tagSlug)
    );

    const response = NextResponse.json(feed);
    response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
    response.headers.set("X-Cache", hit ? "HIT" : "MISS");
    return response;
  } catch (err) {
    console.error("Failed to fetch personalized feed:", err);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

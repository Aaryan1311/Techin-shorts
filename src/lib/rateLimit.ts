import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";
import { NextRequest, NextResponse } from "next/server";

type RateLimitTier = "auth" | "feed" | "translate" | "audio" | "search" | "track";

const LIMITS: Record<RateLimitTier, { requests: number; window: string }> = {
  auth: { requests: 10, window: "1m" },
  feed: { requests: 60, window: "1m" },
  translate: { requests: 20, window: "1m" },
  audio: { requests: 10, window: "1m" },
  search: { requests: 30, window: "1m" },
  track: { requests: 60, window: "1m" },
};

const limiters = new Map<RateLimitTier, Ratelimit>();

function getLimiter(tier: RateLimitTier): Ratelimit | null {
  if (!redis) return null;

  if (!limiters.has(tier)) {
    const config = LIMITS[tier];
    limiters.set(
      tier,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window as `${number} ${"s" | "m" | "h" | "d"}`),
        prefix: `rl:${tier}`,
      })
    );
  }

  return limiters.get(tier)!;
}

/** Get client identifier from request */
function getIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "anonymous";
  return ip;
}

/**
 * Apply rate limiting to a request.
 * Returns null if allowed, or a NextResponse if rate limited.
 */
export async function applyRateLimit(
  request: NextRequest,
  tier: RateLimitTier
): Promise<NextResponse | null> {
  const limiter = getLimiter(tier);
  if (!limiter) return null; // No Redis = no rate limiting

  const identifier = getIdentifier(request);

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }

    return null; // Allowed
  } catch (err) {
    console.warn("Rate limit check failed, allowing request:", err);
    return null; // Fail open
  }
}

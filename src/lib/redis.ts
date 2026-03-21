import { Redis } from "@upstash/redis";

// Optional Redis — works without env vars (gracefully degrades)
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export { redis };

/** Cache helper: get from Redis or compute and store */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<{ data: T; hit: boolean }> {
  if (redis) {
    try {
      const raw = await redis.get<T>(key);
      if (raw !== null && raw !== undefined) {
        return { data: raw, hit: true };
      }
    } catch (err) {
      console.warn("Redis GET failed, falling through:", err);
    }
  }

  const data = await compute();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    } catch (err) {
      console.warn("Redis SET failed:", err);
    }
  }

  return { data, hit: false };
}

/** Invalidate a cache key */
export async function invalidateCache(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("Redis DEL failed:", err);
    }
  }
}

/** Invalidate all keys matching a pattern prefix */
export async function invalidateCachePrefix(prefix: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn("Redis prefix invalidation failed:", err);
  }
}

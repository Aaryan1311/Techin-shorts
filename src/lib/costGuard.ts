import { redis } from "./redis";

interface CostConfig {
  dailyLimit: number;
  redisKey: string;
}

const COST_CONFIGS: Record<string, CostConfig> = {
  elevenlabs: { dailyLimit: 100, redisKey: "cost:elevenlabs" },
  groq: { dailyLimit: 500, redisKey: "cost:groq" },
};

/** Get today's date key for daily tracking */
function todayKey(prefix: string): string {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${prefix}:${d}`;
}

/**
 * Check if we're under the daily limit for a service.
 * Returns true if allowed, false if limit reached.
 * Increments the counter if allowed.
 */
export async function checkCostGuard(service: "elevenlabs" | "groq"): Promise<boolean> {
  const config = COST_CONFIGS[service];
  if (!redis) return true; // No Redis = no cost tracking (allow all)

  const key = todayKey(config.redisKey);

  try {
    const current = await redis.get<number>(key);
    if (current !== null && current >= config.dailyLimit) {
      console.warn(`Cost guard: ${service} daily limit (${config.dailyLimit}) reached`);
      return false;
    }

    // Increment and set TTL to 25 hours (covers timezone edge)
    await redis.incr(key);
    await redis.expire(key, 90000); // 25 hours

    return true;
  } catch (err) {
    console.warn("Cost guard check failed, allowing:", err);
    return true; // Fail open
  }
}

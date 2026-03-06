import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }

  return redisClient;
}

export async function withRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();

  if (!redis) {
    return { allowed: true, remaining: limit };
  }

  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, windowSec);
  const result = await multi.exec();

  const count = Number(result?.[0]?.[1] ?? 1);
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count <= limit,
    remaining,
  };
}

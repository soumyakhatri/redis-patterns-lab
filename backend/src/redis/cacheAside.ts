import { redis } from "./client.js";

/** How the response was resolved relative to Redis. */
export type CacheResult = "hit" | "miss" | "bypass";

export interface CacheAsideOutcome<T> {
  data: T;
  cache: CacheResult;
}

/** Default TTL for derived product/category cache entries (Phase 2 basics). */
export const DEFAULT_CACHE_TTL_SECONDS = 300;

async function isRedisReady(): Promise<boolean> {
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cache-aside read: check Redis, on miss load from Postgres and populate cache.
 * Falls through to the loader when Redis is unavailable (graceful degradation).
 */
export async function cacheAside<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS,
): Promise<CacheAsideOutcome<T>> {
  const redisOk = await isRedisReady();

  if (redisOk) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return { data: JSON.parse(cached) as T, cache: "hit" };
      }
    } catch (error) {
      console.warn(`[redis] GET failed for ${key}:`, (error as Error).message);
    }
  }

  const data = await loader();

  if (redisOk) {
    try {
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch (error) {
      console.warn(`[redis] SET failed for ${key}:`, (error as Error).message);
    }
  }
  // miss means that the data was not found in the cache and we had to load it from the database
  return { data, cache: redisOk ? "miss" : "bypass" };
}

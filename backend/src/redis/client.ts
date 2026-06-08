import { Redis } from "ioredis";
import { env } from "../config/env.js";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis;
};

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  client.on("error", (error: Error) => {
    console.warn("[redis] connection error:", error.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function pingRedis(): Promise<boolean> {
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

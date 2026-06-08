import { prisma } from "../lib/prisma.js";
import { pingRedis } from "../redis/client.js";

export type DependencyStatus = "connected" | "unavailable";

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  postgres: DependencyStatus;
  redis: DependencyStatus;
}

async function checkPostgres(): Promise<DependencyStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "connected";
  } catch {
    return "unavailable";
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const [postgres, redisOk] = await Promise.all([
    checkPostgres(),
    pingRedis(),
  ]);

  const redis: DependencyStatus = redisOk ? "connected" : "unavailable";
  const status = postgres === "connected" ? "ok" : "degraded";

  return {
    status: redis === "unavailable" ? "degraded" : status,
    timestamp: new Date().toISOString(),
    postgres,
    redis,
  };
}

import type { CacheStatus } from "../api/client";

const labels: Record<CacheStatus, string> = {
  hit: "Redis HIT",
  miss: "Redis MISS (populated from Postgres)",
  bypass: "Redis BYPASS (Postgres only)",
};

const badgeClass: Record<CacheStatus, string> = {
  hit: "cache-hit",
  miss: "cache-miss",
  bypass: "cache-bypass",
};

interface CacheBadgeProps {
  status: CacheStatus;
}

export function CacheBadge({ status }: CacheBadgeProps) {
  return (
    <span className={`cache-badge ${badgeClass[status]}`} title={labels[status]}>
      X-Cache: {status}
    </span>
  );
}

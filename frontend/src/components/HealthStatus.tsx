import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";

function statusClass(value: string): string {
  return value === "connected" ? "status-ok" : "status-bad";
}

export function HealthStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <p className="muted">Checking dependencies...</p>;
  }

  if (isError || !data) {
    return (
      <div className="card card-error">
        <p>Unable to reach the API.</p>
        <button type="button" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>System Health</h2>
        <span className={`badge badge-${data.status}`}>{data.status}</span>
      </div>
      <dl className="health-grid">
        <div>
          <dt>PostgreSQL</dt>
          <dd className={statusClass(data.postgres)}>{data.postgres}</dd>
        </div>
        <div>
          <dt>Redis</dt>
          <dd className={statusClass(data.redis)}>{data.redis}</dd>
        </div>
        <div>
          <dt>Checked at</dt>
          <dd>{new Date(data.timestamp).toLocaleString()}</dd>
        </div>
      </dl>
      <button type="button" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

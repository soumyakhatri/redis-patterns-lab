import { HealthStatus } from "../components/HealthStatus";
import { ProductCatalog } from "../components/ProductCatalog";

export function HomePage() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Phase 2 — Cache-Aside Pattern</p>
        <h1>Redis Patterns Lab</h1>
        <p className="lead">
          Product and category reads use cache-aside: check Redis, fall through
          to PostgreSQL on miss, populate cache on the way out. Watch the{" "}
          <code>X-Cache</code> header on each response.
        </p>
      </header>

      <HealthStatus />
      <ProductCatalog />

      <section className="card">
        <h2>Cache-aside read path</h2>
        <pre className="flow-diagram">{`GET /api/products/:id
     |
     v
  Redis GET product:{id}
     |
     +-- hit  -----------------> return JSON (X-Cache: hit)
     |
     +-- miss / Redis down
            |
            v
        Prisma -> PostgreSQL
            |
            v
        Redis SET (if available) -> return JSON (X-Cache: miss | bypass)`}</pre>
      </section>
    </main>
  );
}

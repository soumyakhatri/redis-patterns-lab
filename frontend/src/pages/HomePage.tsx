import { HealthStatus } from "../components/HealthStatus";

export function HomePage() {
  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Phase 1 — Project Scaffolding</p>
        <h1>Redis Patterns Lab</h1>
        <p className="lead">
          A production-inspired E-Commerce platform for learning Redis. The stack
          is wired; caching patterns start in Phase 2.
        </p>
      </header>

      <HealthStatus />

      <section className="card">
        <h2>Stack</h2>
        <ul className="stack-list">
          <li>React + React Router + TanStack Query + Axios</li>
          <li>Express + Prisma + PostgreSQL</li>
          <li>Redis via ioredis (connected, not yet used for caching)</li>
          <li>Docker Compose for local Postgres and Redis</li>
        </ul>
      </section>
    </main>
  );
}

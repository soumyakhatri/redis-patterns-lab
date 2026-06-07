# Redis Patterns Lab - Project Context

> Living document. Updated at the end of every phase.

---

## Project Overview

| Field | Value |
|---|---|
| **Repository** | `redis-patterns-lab` |
| **Title** | Redis Patterns Lab: Building a Production-Inspired E-Commerce Platform |
| **Learner profile** | MERN stack developer, Prisma ORM experience |
| **Primary goal** | Redis mastery through a production-inspired E-Commerce backend |
| **Secondary goal** | Stronger backend engineering judgment and system design reasoning |

The E-Commerce application is a **vehicle for learning Redis**, not the end product. Complexity budget is spent on Redis concepts and architectural tradeoffs, not production perfection.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, TanStack Query, Axios |
| Backend | Node.js, Express.js |
| Database (source of truth) | PostgreSQL |
| ORM | Prisma |
| Cache | Redis via **ioredis** |
| Infrastructure | Docker Compose |
| Validation | Zod |

### Explicitly Out of Scope

- BullMQ / job queues
- Redis Streams
- Generic repository abstractions
- Kubernetes, CI/CD, enterprise monitoring
- Unit test suites
- Large local infrastructure deployments

### Already Familiar (Not Re-Taught)

- Redis Pub/Sub (revisited only in Phase 13 for distributed cache invalidation)
- BullMQ concepts

---

## Core Architectural Principles

1. **PostgreSQL is the source of truth for durable business data.** Users, products, orders, and inventory live in Postgres.
2. **Redis holds two distinct categories of data** - derived cache entries and ephemeral operational state. Treat them differently.
3. **Derived data in Redis is reconstructable.** Cache entries are copies of Postgres data. If lost, rebuild from the source of truth.
4. **Ephemeral operational state is intentionally temporary.** Sessions, rate limit counters, and distributed locks are not durable business data - Redis is the right place to own them while they live.
5. **Redis is an optimization layer, not a hard dependency.** The app should degrade gracefully when Redis is unavailable.
6. **Measure before and after.** Every Redis optimization must show measurable improvement (throughput, latency, DB load).
7. **Prefer understanding over memorization.** Architectural reasoning beats command recall.
8. **Teach concepts before implementation.** Theory precedes code in every phase.

---

## Redis Data Classification

Not everything in Redis is a cache. This project uses two categories:

### 1. Derived Data (Reconstructable from PostgreSQL)

Copies or computed views of durable business data. Postgres remains authoritative.

| Examples in this project | Phases |
|---|---|
| Product detail cache entries | 2, 3, 8, 9, 10 |
| Category listings | 2, 3 |
| Trending / best-selling rankings (computed from orders) | 6 |
| Negative cache entries (known-miss markers) | 8 |
| L1 in-process cache of product data | 12 |

**If Redis loses derived data:** slower reads, higher PostgreSQL load - but no durable data is lost. Rebuild on demand.

**Degradation strategy:** fall through to PostgreSQL on cache miss or Redis outage.

### 2. Ephemeral Operational State (Intentionally Temporary)

Short-lived coordination and runtime state. Not reconstructable from a single Postgres query - and that is by design.

| Examples in this project | Phases |
|---|---|
| User sessions | 4 |
| Login rate limit counters | 5 |
| Distributed inventory locks | 7 |
| Cache stampede rebuild locks | 9 |
| Pub/Sub invalidation messages | 13 |

**If Redis loses ephemeral state:** users may need to re-login, rate limits may reset, locks may need re-acquisition. Acceptable for temporary state.

**Degradation strategy:** depends on the feature - sessions treat as logged-out, rate limits fail open, locks fall back to database-level locking.

### Source of Truth Summary

| Data | Authoritative Store | Nature | If Redis Is Lost |
|---|---|---|---|
| Users, products, orders, inventory | PostgreSQL | Durable business data | Unaffected - always in Postgres |
| Product/category cache entries | PostgreSQL (reconstructable) | Derived data | Slower reads; rebuild from Postgres |
| Trending rankings | PostgreSQL (reconstructable) | Derived computed view | Recompute from order data |
| Sessions | Redis while active | Ephemeral operational state | Users re-authenticate |
| Rate limit counters | Redis while active | Ephemeral operational state | Counters reset; fail-open policy |
| Distributed locks | Redis while held | Ephemeral operational state | Fall back to DB locking |

---

## Backend Architecture

```
Request
  |
  v
Routes
  |
  v
Controllers
  |
  v
Services
  |
  v
Prisma (PostgreSQL)  and/or  Redis (ioredis)
```

### Additional Layers

- **Validation layer** - Zod schemas at API boundaries
- **Centralized error handling** - consistent error responses
- **Redis helper modules** - thin modules under `src/redis/` when extraction improves readability

### Deliberate Omissions

- **No mandatory repository pattern.** Prisma Client is called directly from Services.
- Redis logic lives in Services or thin `src/redis/` modules - whichever reads better.

---

## Graceful Degradation Policy

Redis failures should **not** take down the application when reasonably avoidable. Degradation behavior depends on which category of Redis data is affected.

### Derived Data (Reconstructable)

| Scenario | Expected behavior |
|---|---|
| Redis unavailable on cache read | Fall through to PostgreSQL |
| Redis unavailable on cache write (populate) | Log warning, continue without caching |
| Redis flush / restart | Cache cold start; Postgres serves all reads until cache warms |

### Ephemeral Operational State

| Scenario | Expected behavior |
|---|---|
| Redis unavailable on session read | Treat as unauthenticated; user re-logins |
| Redis unavailable on rate limit check | Fail open (allow request) with logging |
| Redis unavailable on distributed lock | Fall back to database-level locking where critical |
| Redis flush / restart | Sessions lost, counters reset, locks released - acceptable for ephemeral state |

Specific degradation decisions are documented per phase as patterns are introduced.

---

## Verification Strategy

No unit tests. Verification relies on:

- Manual testing (browser, Postman/Bruno)
- `redis-cli` inspection
- `autocannon` and `k6` load tests

### Metrics to Compare (Before/After Redis)

| Metric | Tool |
|---|---|
| Throughput (req/s) | autocannon / k6 |
| Average latency | autocannon / k6 |
| P95 latency | autocannon / k6 |
| PostgreSQL query count / load | Prisma query logging, `pg_stat_statements` |

---

## Target Folder Structure

```
redis-patterns-lab/
├── backend/
├── frontend/
├── PROJECT_CONTEXT.md          <- this file
├── REDIS_LEARNING_JOURNAL.md
├── docker-compose.yml
└── README.md
```

*Folders `backend/`, `frontend/`, and `docker-compose.yml` will be created in Phase 1.*

---

## Redis Patterns Roadmap

| Phase | Topic | Status |
|---|---|---|
| 0 | Orientation | Complete |
| 1 | Project Scaffolding | Not started |
| 2 | Cache-Aside Pattern | Not started |
| 3 | TTL and Cache Invalidation | Not started |
| 4 | Session Storage | Not started |
| 5 | Rate Limiting | Not started |
| 6 | Sorted Sets (Trending / Best-selling) | Not started |
| 7 | Distributed Locks (Inventory) | Not started |
| 8 | Cache Penetration Prevention | Not started |
| 9 | Cache Stampede Prevention | Not started |
| 10 | Hot Keys and Cache Breakdown | Not started |
| 11 | Cache Consistency Models | Not started |
| 12 | Multi-Level Caching (L1/L2/L3) | Not started |
| 13 | Pub/Sub for Distributed Cache Invalidation | Not started |
| 14 | Persistence (RDB / AOF) | Not started |
| 15 | Replication | Not started |
| 16 | Sentinel | Not started |
| 17 | Cluster | Not started |
| 18 | Production Hardening | Not started |
| 19 | System Design Review | Not started |

**Rule:** One phase per chat. Do not proceed unless explicitly requested.

---

## Redis Keys Registry

> Keys are documented here as they are introduced in each phase.

| Key Pattern | Type | Purpose | Phase | TTL |
|---|---|---|---|---|
| *(none yet)* | - | - | - | - |

---

## Redis Patterns Implemented

| Pattern | Phase | Location | Notes |
|---|---|---|---|
| *(none yet)* | - | - | - |

---

## Performance Observations

> Baseline and post-optimization measurements recorded per phase.

| Phase | Endpoint | Before (req/s / avg / p95) | After (req/s / avg / p95) | PG Query Reduction |
|---|---|---|---|---|
| *(none yet)* | - | - | - | - |

---

## E-Commerce Domain Model (Planned)

A minimal but realistic domain to support Redis patterns:

| Entity | Redis Data Category | Purpose in Redis Learning |
|---|---|---|
| **Product** | Derived | Cache-aside, TTL, invalidation, penetration, stampede, hot keys |
| **User** | Ephemeral (+ durable in Postgres) | Session storage, rate limiting on login |
| **Order** | Derived + Ephemeral | Sorted sets for trending/best-selling (derived); inventory locks (ephemeral) |
| **Inventory** | Ephemeral | Distributed locks, overselling prevention |
| **Category** | Derived | Secondary caching examples |

Authentication remains **minimal** - enough to demonstrate sessions, not a full auth tutorial.

---

## Important Constraints

1. One phase per chat session.
2. Theory before implementation in every phase.
3. Wait for learner confirmation before advancing.
4. Both markdown files updated at the end of every phase.
5. AI assistance is assumed - emphasis on **why**, not boilerplate.
6. Interview-relevant framing included in every phase.

---

## Phase Progress Log

### Phase 0 - Orientation (Complete)

**Completed:** Project architecture established, principles documented, roadmap defined, markdown files created. Clarified derived data vs ephemeral operational state in Redis. Clarified derived data vs ephemeral operational state in Redis.

**Deliverables:**
- `PROJECT_CONTEXT.md`
- `REDIS_LEARNING_JOURNAL.md`

**No application code written.**

---

*Last updated: Phase 0 - Orientation (clarified derived vs ephemeral Redis data)*

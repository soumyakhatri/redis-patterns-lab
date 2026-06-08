# Redis Learning Journal

> Personal learning record for the Redis Patterns Lab project.
> Updated at the end of every phase.

---

## Learning Principles

1. **Classify Redis data first** - is it derived (reconstructable from Postgres) or ephemeral operational state (intentionally temporary)?
2. **Postgres is truth for durable business data** - users, products, orders, inventory always live in PostgreSQL.
3. **Derived Redis data is a fast copy** - cache entries can be rebuilt from Postgres. Ask: "what happens if this cache entry disappears?"
4. **Ephemeral Redis data is owned by Redis while it lives** - sessions, rate limits, and locks are not Postgres rows. Losing them has different consequences than losing a cache entry.
5. **Measure, don't assume** - benchmark before claiming an optimization works.
6. **Tradeoffs over absolutes** - every pattern has a cost; name it explicitly.
7. **Commands are tools, patterns are the lesson** - know *when* and *why*, not just *what*.
8. **Interview fluency comes from reasoning** - explain decisions, not recite docs.

---

## Phase Summaries

### Phase 0 - Orientation

**What we established:**

- This project teaches Redis through a production-inspired E-Commerce backend.
- PostgreSQL is the source of truth for durable business data; Redis is an optimization and coordination layer.
- The backend follows Routes -> Controllers -> Services -> Prisma/Redis.
- No repository pattern, no BullMQ, no unit tests.
- Verification is manual + load testing (autocannon/k6) + redis-cli.
- 20 phases (0-19) cover caching patterns through production hardening and system design review.

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| ioredis over node-redis | Mature, Promise-friendly, widely used in production Node.js backends |
| Prisma called directly from Services | Avoids unnecessary abstraction; keeps focus on Redis |
| Graceful degradation by default | Redis is optimization, not dependency |
| Zod for validation | Type-safe input validation at API boundaries |
| Docker Compose for local infra | Postgres + Redis without complex setup |

**Concepts introduced (theoretical):**

- Cache-aside vs write-through vs write-behind (preview - deep dive in Phase 11)
- TTL strategies (preview - Phase 2-3)
- Two categories of Redis data: derived (reconstructable) vs ephemeral operational state
- Graceful degradation patterns
- Before/after performance verification mindset

**Redis commands introduced:**

*None yet - Phase 0 is orientation only.*
### Phase 1 - Project Scaffolding

**What we built:**

- Docker Compose for PostgreSQL (port 5433) and Redis (port 6380)
- Express backend with layered architecture: Routes -> Controllers -> Services
- Prisma schema for User, Category, Product, Inventory, Order, OrderItem
- ioredis client with lazy connect and graceful error logging
- Zod-validated environment configuration
- Centralized error handling middleware
- Health endpoint reporting Postgres and Redis connectivity
- React frontend with TanStack Query polling the health endpoint

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| TypeScript on backend | Type safety for services and API contracts; matches modern Node.js practice |
| ioredis with lazyConnect | App starts even if Redis is momentarily unavailable; aligns with graceful degradation |
| Health returns "degraded" not 503 when Redis alone is down | Postgres is hard dependency for durable data; Redis outage is survivable in Phase 1 |
| Non-default Docker ports (5433, 6380) | Avoids conflicts with other local Postgres/Redis instances |
| Prisma seed with sample products | Gives realistic data ready for cache-aside benchmarks in Phase 2 |

**Concepts introduced:**

- Layered backend architecture as foundation for Redis integration points
- Environment validation at startup (fail fast on misconfiguration)
- Dependency health checks as operational baseline before adding cache logic
- Singleton clients for Prisma and Redis (connection reuse in dev)

**Redis commands introduced:**

| Command | Purpose | Phase Introduced |
|---|---|---|
| `PING` | Verify Redis connectivity | 1 |
### Phase 2 - Cache-Aside Pattern

**What we built:**

- Generic `cacheAside()` helper: Redis GET → on miss, load from Postgres → Redis SET EX
- Product endpoints: list all products, get product by id
- Category endpoints: list categories, get category by slug (with products)
- `X-Cache` header on every cached response: `hit`, `miss`, or `bypass`
- Frontend catalog and product detail pages surface cache status
- 300-second TTL on cache keys (TTL basics; invalidation deferred to Phase 3)

**Key architectural decisions:**

| Decision | Rationale |
|---|---|
| Cache-aside in Services layer | Business logic owns orchestration; Redis helpers stay thin |
| Graceful bypass on Redis failure | App continues via Postgres; logs warning on SET failures |
| JSON string values in Redis | Simple serialization for Prisma DTOs; Decimal stored as string |
| `X-Cache` header for observability | Makes hit/miss/bypass visible without redis-cli during development |
| No negative caching yet | 404s not cached until Phase 8 (cache penetration) |
| TTL without write invalidation | Phase 2 teaches read path; Phase 3 adds invalidation on updates |

**Concepts introduced:**

- Cache-aside (lazy loading) read path
- Cache hit vs cache miss vs bypass semantics
- Derived data classification in practice (products/categories = reconstructable)
- TTL as a safety net (not a substitute for invalidation)
- Measuring before/after with autocannon

**Redis commands introduced:**

| Command | Purpose | Phase Introduced |
|---|---|---|
| `GET` | Read cached JSON by key | 2 |
| `SET key value EX seconds` | Populate cache with TTL | 2 |
| `KEYS pattern` | Inspect cache keys during verification | 2 |
| `FLUSHDB` | Clear cache for cold-start benchmarks | 2 |


---

## Concepts Learned

### Phase 0

#### Two Categories of Redis Data

Redis is not just a cache. In this project, data in Redis falls into two categories with different rules:

**1. Derived Data (Reconstructable)**

- Cache entries for products, categories, rankings
- Copies or computed views of durable Postgres data
- Postgres remains authoritative; Redis is a performance shortcut
- Lost data = slower reads, not lost business data

**2. Ephemeral Operational State (Intentionally Temporary)**

- Sessions, rate limit counters, distributed locks
- Not durable business data; not meant to be reconstructed from a single Postgres query
- Redis is the right place to own this state while it is active
- Lost data = users re-login, counters reset, locks re-acquired - acceptable tradeoffs

```
+----------------------------------------------------------+
|                      Application                          |
+----------------------------------------------------------+
|  L1: In-process memory (Phase 12) - derived data only    |
+----------------------------------------------------------+
|  L2: Redis                                                |
|    - Derived: product cache, rankings (from Postgres)     |
|    - Ephemeral: sessions, rate limits, locks              |
+----------------------------------------------------------+
|  L3: PostgreSQL - source of truth for durable business    |
|      data (users, products, orders, inventory)            |
+----------------------------------------------------------+
```

### Phase 2

#### Cache-Aside (Lazy Loading)

The application — not Redis — owns the cache. On a read:

1. Check Redis for the key
2. **Hit:** deserialize and return (`X-Cache: hit`)
3. **Miss:** query PostgreSQL, serialize result, write to Redis, return (`X-Cache: miss`)
4. **Redis unavailable:** skip steps 1 and 3, query PostgreSQL only (`X-Cache: bypass`)

```
Read Request
     |
     v
+---------+   hit    +----------+
|  Redis  |-------->| Response |
+----+----+
     | miss / down
     v
+------------+  populate (if Redis up)  +---------+
| PostgreSQL |------------------------>|  Redis  |
+------------+                         +---------+
```

**Why cache-aside over write-through for reads?** Writes always go to Postgres (source of truth). Cache is populated on demand — only hot data consumes Redis memory. Simpler than synchronizing every write to Redis.

**Tradeoffs:**
- First reader after expiry pays full DB cost (thundering herd — Phase 9)
- Stale data possible until TTL expires (invalidation — Phase 3)
- Application must implement fallback logic (not built into Redis)

#### Hit / Miss / Bypass

| Result | Meaning | Postgres queried? |
|---|---|---|
| hit | Key found in Redis | No |
| miss | Key absent; loaded from Postgres and cached | Yes |
| bypass | Redis unavailable; served from Postgres only | Yes |

Bypass is graceful degradation in action: Redis failure increases latency and DB load, but the app stays up.

**Key distinction:** Losing derived data is a performance problem. Losing ephemeral state is an operational inconvenience - not a data integrity problem.

#### Why Learn Redis Through E-Commerce?

E-Commerce hits nearly every Redis use case in production:

| Business Problem | Redis Pattern |
|---|---|
| Product page loads slowly | Cache-aside (derived) |
| Stale prices after update | Cache invalidation + TTL (derived) |
| User stays logged in | Session storage (ephemeral) |
| Brute-force login attacks | Rate limiting (ephemeral) |
| "Trending products" widget | Sorted sets |
| Flash sale overselling | Distributed locks |
| Scraping non-existent product IDs | Cache penetration prevention |
| Viral product crashes DB on cache miss | Cache stampede prevention |
| One product goes viral | Hot key mitigation |
| Multiple API servers, stale local cache | Pub/Sub invalidation |


### Phase 1

#### Why Scaffold Before Caching?

Redis patterns need a realistic application context. Phase 1 establishes:

1. **Where Redis plugs in** - Services layer, via `src/redis/` helpers
2. **What Postgres owns** - Durable e-commerce entities in Prisma schema
3. **How we verify things work** - Health endpoint before cache hit/miss metrics
4. **Graceful degradation hooks** - Redis client logs errors but does not crash the app

#### Backend Layer Responsibilities

```
Request -> Routes -> Controllers -> Services -> Prisma / Redis
```

- **Routes** - URL mapping only
- **Controllers** - HTTP request/response handling
- **Services** - Business logic; where Redis cache-aside will live (Phase 2+)
- **Prisma** - Source of truth for durable data
- **Redis** - Connected but unused for caching until Phase 2

#### The Teaching Loop (Every Phase)

1. Explain the problem
2. Explain why PostgreSQL alone is insufficient
3. Explain how Redis solves it
4. Discuss tradeoffs
5. Discuss production considerations
6. Discuss interview considerations
7. Implement incrementally
8. Verify with measurements
9. Confirm understanding
10. Wait for explicit go-ahead to next phase

---

## Redis Commands Reference

> Accumulated across phases. Empty until commands are used in practice.

| Command | Purpose | Phase Introduced |
|---|---|---|
| `PING` | Verify Redis server is reachable | 1 |
| `GET` | Read cached value | 2 |
| `SET EX` | Write value with TTL | 2 |
| `KEYS` | List keys (dev/debug only) | 2 |
| `FLUSHDB` | Clear current database | 2 |

---

## Production Lessons

### Phase 0

1. **Never make Redis a single point of failure for reads.** Always have a Postgres fallback path.
2. **Cache invalidation is one of the two hard problems in CS** (along with naming things). Plan invalidation strategy *before* caching, not after.
3. **TTL is not a substitute for invalidation** - it's a safety net. Relying only on TTL means accepting stale data for the TTL duration.
4. **Operational awareness matters.** Know your eviction policy, memory limits, and connection pool sizes before production.
5. **Hot keys can negate Redis benefits.** A single key receiving millions of requests per second will bottleneck even Redis.
6. **Do not conflate derived data with ephemeral state.**

### Phase 2

1. **Implement bypass before optimizing hits.** If Redis goes down and every request errors, you have a hard dependency — not an optimization layer.
2. **Log SET failures, don't fail the request.** A cache write failure means the next reader hits Postgres again — acceptable.
3. **Expose cache status during development.** `X-Cache` headers (or metrics) make hit rates visible without redis-cli.
4. **Benchmark warm vs cold separately.** First request after flush is always a miss; sustained load tests show cache benefit.
5. **TTL prevents unbounded growth but not staleness.** Phase 3 adds explicit invalidation on writes.

1. **Validate environment at startup** - Misconfigured DATABASE_URL or REDIS_URL should fail immediately, not at first request.
2. **Health checks should reflect dependency criticality** - Postgres down = 503; Redis down = degraded (200) in this scaffold.
3. **Use non-default ports in Docker Compose when developing locally** - Port conflicts with existing Postgres/Redis are common.
4. **Keep Redis client connection lazy** - Avoid blocking app startup on Redis availability. Sessions are not cache entries. Treating them the same leads to wrong fallback logic and wrong interview answers.

---

## Interview Questions

### Phase 0 - Warm-up / Foundational

1. **What is Redis and when would you choose it over PostgreSQL for reads?**
   - *Hint: In-memory, sub-millisecond latency, rich data structures. Not a replacement for durable relational storage.*

2. **What does "Redis is a derived layer" mean in practice?**
   - *Hint: Data in Redis can be rebuilt from the source of truth. Redis failure = slower app, not broken app.*

3. **What is cache-aside (lazy loading)? Walk through a read path.**
   - *Hint: App checks cache -> miss -> read DB -> write cache -> return. Most common pattern.*

4. **What happens when Redis goes down in a cache-aside architecture?**
   - *Hint: Every request becomes a DB hit. Need circuit breaker / fallback logic. DB load spikes.*

5. **How would you verify that adding Redis actually improved performance?**
   - *Hint: Benchmark before/after - throughput, avg latency, P95, DB query count. Use load testing tools.*

6. **What is the difference between cache-aside, write-through, and write-behind?**
   - *Hint: Who writes to cache and when relative to the DB write. Tradeoffs in consistency and complexity.*

7. **Why is TTL alone insufficient for cache invalidation?**
   - *Hint: Stale data window, unpredictable update timing, no immediate consistency after writes.*

8. **What is graceful degradation in the context of Redis?**
   - *Hint: App continues functioning with reduced performance or reduced features when Redis is unavailable.*

9. **What is the difference between derived Redis data and ephemeral operational state?**
   - *Hint: Derived = reconstructable from Postgres (cache). Ephemeral = temporary runtime state Redis owns (sessions, counters, locks).*

10. **Why should sessions NOT be treated as cache entries?**
   - *Hint: Sessions are not copies of Postgres rows. Losing them means re-login, not a DB fallback read. Different degradation logic.*

### Phase 2 - Cache-Aside

1. **Walk through a cache-aside read for GET /api/products/:id.**
   - *Hint: Redis GET → miss → Prisma query → Redis SET EX → return. Mention X-Cache header.*

2. **What happens when Redis is down mid-request in cache-aside?**
   - *Hint: Bypass path. Every request hits Postgres. Log warnings on failed SET. App stays up; latency and DB load increase.*

3. **Why use SET EX instead of SET alone?**
   - *Hint: TTL prevents unbounded memory growth. 300s is a safety net; explicit invalidation comes on writes (Phase 3).*

4. **Why not cache 404 responses in Phase 2?**
   - *Hint: Negative caching is a separate concern (Phase 8). Blindly caching nulls can hide new data or poison cache.*

5. **How did we verify Redis improved performance?**
   - *Hint: autocannon with Redis warm (~4,373 req/s) vs Redis stopped (~898 req/s). Same endpoint, same hardware.*

11. **PostgreSQL is the source of truth for what kinds of data? What does Redis legitimately own?**
### Phase 1 - Scaffolding / Infrastructure

1. **Why separate Routes, Controllers, and Services? Where will Redis logic go?**
   - *Hint: Separation of concerns. Redis orchestration belongs in Services (or thin redis/ modules), not in route handlers.*

2. **Why validate environment variables with Zod at startup?**
   - *Hint: Fail fast. Better to crash on boot with a clear message than serve 500s on every request.*

3. **Why use lazyConnect for ioredis?**
   - *Hint: App can start and serve Postgres-backed responses even if Redis is temporarily down.*

4. **What should a health check report in a Redis-backed application?**
   - *Hint: Per-dependency status. Distinguish hard dependencies (Postgres) from optimization layers (Redis).*

5. **Why is Docker Compose sufficient for this learning project?**
   - *Hint: Focus budget on Redis patterns, not Kubernetes. Two containers cover source of truth + cache.*


   - *Hint: Postgres owns durable business data. Redis owns derived copies (rebuildable) and ephemeral operational state (temporary by design).*

---

## Common Pitfalls

### Phase 0 - Awareness (Prevention Starts in Phase 2+)

| Pitfall | Why It's Dangerous | When We'll Address It |
|---|---|---|
| Treating Redis as source of truth | Data loss on flush/crash | Phase 2+ |
| Treating sessions like cache entries | Wrong fallback logic; confused degradation | Phase 4 |
| Treating ephemeral state as reconstructable | Incorrect recovery assumptions | Phase 4-7 |
| No TTL on cached keys | Memory grows unbounded | Phase 2-3 |
| Caching without invalidation strategy | Stale data bugs | Phase 3 |
| No fallback when Redis is down | Total outage instead of slow down | Phase 2 |
| Caching error responses incorrectly | Poisoned cache | Phase 8 |
| Thundering herd on cache expiry | DB overload | Phase 9 |
| Using Redis locks without expiration | Deadlocks on crash | Phase 7 |
| Ignoring hot key problem | Redis becomes bottleneck | Phase 10 |

---

## Revision Notes

### Phase 0 - Quick Revision

**Four sentences to remember:**

1. PostgreSQL = source of truth for durable business data.
2. Redis derived data = fast, reconstructable copies of Postgres data.
3. Redis ephemeral state = temporary operational data (sessions, counters, locks) that Redis owns while active.
4. Classify before you cache - derived data and ephemeral state have different fallback strategies.

**Diagram to recall:**

```
Read Request
     |
     v
+---------+   hit    +----------+
|  Redis  |-------->| Response |
|  (L2)   |         +----------+
+----+----+
     | miss
     v
+------------+  populate  +---------+
| PostgreSQL |----------->|  Redis  |
|   (truth)  |            +---------+
+------------+
```

**Questions to ask yourself before putting data in Redis:**

- [ ] Is this derived (reconstructable from Postgres) or ephemeral operational state?
- [ ] What is the source of truth for durable business data?
- [ ] What TTL is appropriate?
- [ ] How will I invalidate or expire this data?
- [ ] What happens if Redis is down? (Different answer for derived vs ephemeral)
- [ ] How will I measure the improvement?


### Phase 1 - Quick Revision

**Three sentences to remember:**

1. Scaffold establishes *where* Redis plugs in (Services layer), not *how* to cache yet.
2. Postgres health = hard dependency; Redis health = soft dependency (degraded, not dead).
3. Environment validation and health checks are prerequisites for meaningful cache benchmarks.

**Commands introduced:** `PING`

### Phase 2 - Quick Revision

**Three sentences to remember:**

1. Cache-aside = app checks Redis first, loads Postgres on miss, populates cache on the way out.
2. hit / miss / bypass describe how the response was resolved — bypass means Redis was skipped entirely.
3. Derived product data is reconstructable; losing Redis keys means slower reads, not lost business data.

**Commands introduced:** `GET`, `SET EX`, `KEYS`, `FLUSHDB`

**Verify cache-aside:**
```
curl -D - http://localhost:3001/api/products -o NUL   # miss, then hit
docker exec redis-patterns-redis redis-cli KEYS "*"
npx autocannon -c 50 -d 10 http://localhost:3001/api/products
```

**Run the stack:**
```
docker compose up -d
cd backend && npm run dev
cd frontend && npm run dev
```


---

## Roadmap At-a-Glance

```
Phase 0  [==========] Orientation
Phase 1  [==========] Scaffolding
Phase 2  [==========] Cache-Aside
Phase 3  [          ] TTL & Invalidation
Phase 4  [          ] Sessions
Phase 5  [          ] Rate Limiting
Phase 6  [          ] Sorted Sets
Phase 7  [          ] Distributed Locks
Phase 8  [          ] Cache Penetration
Phase 9  [          ] Cache Stampede
Phase 10 [          ] Hot Keys
Phase 11 [          ] Consistency Models
Phase 12 [          ] Multi-Level Cache
Phase 13 [          ] Pub/Sub Invalidation
Phase 14 [          ] Persistence
Phase 15 [          ] Replication
Phase 16 [          ] Sentinel
Phase 17 [          ] Cluster
Phase 18 [          ] Production Hardening
Phase 19 [          ] System Design Review
```

---

*Last updated: Phase 2 - Cache-Aside Pattern*

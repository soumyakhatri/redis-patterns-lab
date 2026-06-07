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
| *(none yet)* | - | - |

---

## Production Lessons

### Phase 0

1. **Never make Redis a single point of failure for reads.** Always have a Postgres fallback path.
2. **Cache invalidation is one of the two hard problems in CS** (along with naming things). Plan invalidation strategy *before* caching, not after.
3. **TTL is not a substitute for invalidation** - it's a safety net. Relying only on TTL means accepting stale data for the TTL duration.
4. **Operational awareness matters.** Know your eviction policy, memory limits, and connection pool sizes before production.
5. **Hot keys can negate Redis benefits.** A single key receiving millions of requests per second will bottleneck even Redis.
6. **Do not conflate derived data with ephemeral state.** Sessions are not cache entries. Treating them the same leads to wrong fallback logic and wrong interview answers.

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

11. **PostgreSQL is the source of truth for what kinds of data? What does Redis legitimately own?**
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

---

## Roadmap At-a-Glance

```
Phase 0  [==========] Orientation
Phase 1  [          ] Scaffolding
Phase 2  [          ] Cache-Aside
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

*Last updated: Phase 0 - Orientation (clarified derived vs ephemeral Redis data)*

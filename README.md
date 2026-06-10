# Redis Patterns Lab

**Building a Production-Inspired E-Commerce Platform to Master Redis**

A hands-on learning project for backend engineers. Redis concepts are the lesson; E-Commerce is the vehicle.

## Documentation

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - Architecture, decisions, phase progress, Redis keys registry
- [REDIS_LEARNING_JOURNAL.md](./REDIS_LEARNING_JOURNAL.md) - Concepts, commands, interview prep, revision notes

## Quick Start

```bash
# Start infrastructure (Postgres on 5433, Redis on 6380)
docker compose up -d

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev          # http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Product catalog (cache-aside): [http://localhost:3001/api/products](http://localhost:3001/api/products)

Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Status

**Phase 2 - Cache-Aside Pattern** — implementation and hands-on verification complete

- Architecture review, concept Q&A, and live `curl.exe` + `redis-cli` trace documented in [REDIS_LEARNING_JOURNAL.md](./REDIS_LEARNING_JOURNAL.md)
- Optional before Phase 3: `autocannon` warm vs bypass benchmark

Next: **Phase 3 - TTL and Cache Invalidation** (awaiting explicit go-ahead)

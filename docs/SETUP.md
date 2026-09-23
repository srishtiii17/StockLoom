# StockLoom — Setup Instructions

## Prerequisites

- PostgreSQL 18 (or compatible) running locally, with a superuser you can
  connect as once (to create the app role/database below).
- Node.js 18+ (developed against Node 24).

## 1. Database

Create a dedicated application role and database (**do not** use the
Postgres superuser credentials in the backend):

```sql
-- as the postgres superuser (psql -U postgres):
CREATE ROLE stockloom_app WITH LOGIN PASSWORD '<choose a password>';
CREATE DATABASE stockloom OWNER stockloom_app;
```

Apply the schema, in this exact order (each file depends on objects from
the previous one):

```bash
psql -U stockloom_app -h localhost -d stockloom -f database/schema.sql
psql -U stockloom_app -h localhost -d stockloom -f database/seed.sql
psql -U stockloom_app -h localhost -d stockloom -f database/functions.sql
psql -U stockloom_app -h localhost -d stockloom -f database/triggers.sql
psql -U stockloom_app -h localhost -d stockloom -f database/views.sql
psql -U stockloom_app -h localhost -d stockloom -f database/indexes.sql
```

This gives you a small, deterministic dev dataset (3 suppliers, 5 raw
materials, 3 products, 3 production batches, 3 customers, 3 orders, 1
dispatch — see `database/seed.sql` for exact values).

**To reset to a clean state** at any point (e.g. after running tests that
mutate data): `dropdb`, `createdb ... OWNER stockloom_app`, then re-run the
six files above in order.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in PGPASSWORD with the stockloom_app password
npm start               # listens on PORT (default 4000)
```

Verify: `curl http://localhost:4000/health` → `{"status":"ok"}`

Run the backend test suite (hits the real dev database — see the note at
the top of `backend/tests/api/backend.test.js` about resetting afterward):

```bash
npm test
```

## 3. Frontend (teammate's branch)

Not implemented on this branch (`feature/database-backend`) by design —
see `docs/FRONTEND_HANDOFF.md`.

## 4. Reproducing the concurrency proof

```bash
cd database/tests/concurrency
PGPASSWORD=<stockloom_app password> ./run.sh
```

See `docs/CONCURRENCY_PROOF.md` for the expected/actual output.

## 5. Reproducing the indexing benchmark

```bash
psql -U stockloom_app -h localhost -d stockloom -f database/benchmarks/generate_data.sql
# run EXPLAIN ANALYZE queries -- see docs/INDEXING_BENCHMARK.md for the exact queries
psql -U stockloom_app -h localhost -d stockloom -f database/benchmarks/teardown.sql
```

`database/indexes.sql` is already applied as part of step 1 above, so by
default you'll be benchmarking *with* the indexes present; drop one
(`DROP INDEX idx_...`) first if you want a fresh before/after comparison.

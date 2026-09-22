# STOCKLOOM — AGENT HANDOFF

Use this file to communicate completed work between Claude Code, optional
Antigravity agents, and the human project owner.

---

## Current Phase

`DATABASE + BACKEND COMPLETE — awaiting frontend integration`

## Current Owner

`Claude Code` (branch `feature/database-backend`)

## Last Updated

`2026-09-22`

---

## Completed Work

- [x] Repository structure
- [x] PostgreSQL schema
- [x] Seed data
- [x] Functions/procedures
- [x] Triggers
- [x] Views
- [x] Indexes
- [x] Transaction-safe order flow
- [x] Concurrency tests
- [x] Backend APIs
- [ ] Frontend — owned by `feature/frontend`, see `docs/FRONTEND_HANDOFF.md`
- [ ] End-to-end browser testing — blocked on frontend existing
- [x] Benchmarking
- [x] Documentation
- [x] Viva preparation

---

## Latest Change

### Feature

Complete database + backend + DBMS-proof implementation, Checkpoints 1–6
(schema, transactions/triggers, concurrency proof, indexing/benchmark,
Express API, integration docs).

### Files Changed

```text
.gitignore
backend/.env.example
backend/package.json, package-lock.json
backend/src/app.js, server.js
backend/src/config/db.js
backend/src/middleware/errorHandler.js
backend/src/routes/{suppliers,materials,products,inventory,batches,customers,orders,dispatches,stockLogs,reports}.js
backend/src/utils/asyncHandler.js
backend/tests/api/backend.test.js
database/schema.sql, seed.sql, functions.sql, triggers.sql, views.sql, indexes.sql
database/benchmarks/generate_data.sql, teardown.sql
database/tests/concurrency/{setup,session_a,session_b}.sql, run.sh
docs/API_CONTRACT.md
docs/ARCHITECTURE_DECISIONS.md (ADR-006–009 added)
docs/ARCHITECTURE.md (concurrency/transaction sections updated to reflect ADR-006)
docs/CONCURRENCY_PROOF.md
docs/DBMS_NOTES.md
docs/ER_DIAGRAM.md
docs/ER_MODEL_PROPOSAL.md
docs/FRONTEND_HANDOFF.md
docs/INDEXING_BENCHMARK.md
docs/SETUP.md
docs/TESTING_EVIDENCE.md
docs/VIVA_NOTES.md
```

### What Was Implemented

**Data model resolution.** The original project documentation
(`StockLoom_Documentation.pdf`, `DBMS_Project_Documentation.md`) had a real
gap: `OrderItem` references `Product`, but only `RawMaterial` had a stock
field, and the documented trigger/locking language pointed at
`RawMaterial.current_stock` in a way that would have double-counted
consumption against what's already deducted at batch completion. This was
reconciled explicitly with the project owner (not silently invented) —
see `ARCHITECTURE_DECISIONS.md` ADR-006 through ADR-009 and
`docs/ER_MODEL_PROPOSAL.md` for the full interpretation analysis. Resolved
as: `Product.current_stock` (finished goods) is the order-time
concurrency-critical row; `RawMaterial.current_stock` is only touched at
production time; `StockLog` supports both via two nullable FKs with a
`CHECK` enforcing exactly one set; `LowStockAlert` is a persisted table.

**Database (Checkpoints 1–4).** Full schema with PK/FK/CHECK/UNIQUE
constraints for all 12 tables (11 documented entities +
`LowStockAlert`); three triggers (`trg_order_item_after_insert`,
`trg_production_batch_completion`, `trg_low_stock_alert`); one stored
function (`fn_materials_below_reorder`); one reporting view
(`v_batch_material_consumption`); two indexes (B-tree on
`customer_order.order_date`, hash on `raw_material.material_id`).

**Backend (Checkpoint 5).** Express + parameterized `pg` (no ORM, per
ADR-002) implementing every required endpoint plus
`POST /api/batches/:id/complete` and `GET /api/orders/:id` (needed to
actually reach the production/order transactions over HTTP). Structured
error responses (`{ error: { code, message } }`) map trigger-raised and
Postgres error codes to HTTP status codes, keeping the database the
authority on business rules (ADR-003/ADR-004).

**Integration docs (Checkpoint 6).** `docs/API_CONTRACT.md`,
`docs/FRONTEND_HANDOFF.md`, `docs/SETUP.md`, `docs/ER_DIAGRAM.md`,
`docs/DBMS_NOTES.md`, `docs/TESTING_EVIDENCE.md`, `docs/VIVA_NOTES.md`.

### Tests Executed

```text
Checkpoint 1: dropdb/createdb + schema.sql + seed.sql, twice; constraint
  rejection tests (negative stock, both-null stock_log, duplicate
  dispatch, invalid status) via psql
Checkpoint 2: production batch completion (success + low-stock crossing),
  double completion, insufficient raw material, single order deduction,
  multi-item order rollback, fn_materials_below_reorder() -- all via
  direct psql against stockloom_app
Checkpoint 3: database/tests/concurrency/run.sh -- two genuinely separate
  psql connections, timed
Checkpoint 4: EXPLAIN ANALYZE before/after both indexes, 5 repeated runs
  each, against ~50k generated rows
Checkpoint 5: npm test (backend/tests/api/backend.test.js) -- 12 tests,
  node's built-in test runner + global fetch against the real Express app
  and real dev database
Checkpoint 6: full regression -- fresh dropdb/createdb, all 6 SQL files
  reapplied in order, npm test rerun clean
```

### Actual Results

All of the above passed. Full captured output is in the commit messages
for `0477fca`, `0852e23`, `063aa4f`, `fef2854`, `0d98c4d`, and in
`docs/CONCURRENCY_PROOF.md` / `docs/INDEXING_BENCHMARK.md` (which also
discloses and corrects one measurement mistake made mid-session — an
accidental `DROP INDEX` during unrelated experimentation invalidated an
early hash-index reading; it was caught via `\di` verification and redone
before being reported).

Final backend test run: **12/12 passing.** Database left in a pristine
`seed.sql` state (verified counts: 3 products, 5 raw materials, 3 customer
orders, 0 stock_log rows) after all test-induced mutations were reset.

### Known Issues

- `MANUAL_ADJUSTMENT` `stock_log.change_type` is defined but no code path
  creates one yet (no manual stock-correction endpoint — not in the
  required minimum API list).
- No authentication (ADR-009 — deliberately deferred, not a bug).
- No `frontend/` yet — not started on this branch by design.
- `ProductionBatch.status`/`CustomerOrder.status` enum values were
  proposed by Claude (not in the original source docs) and approved by the
  project owner during the reconciliation — see
  `docs/ER_MODEL_PROPOSAL.md` §A if a values change is ever needed.

### Architectural Decisions

See `ARCHITECTURE_DECISIONS.md` ADR-001 through ADR-009, especially
ADR-006 (finished-goods stock on `Product`) and ADR-007 (dual-target
`StockLog`) — these are the two decisions most likely to come up as
"why did you deviate from the spec" questions.

### Next Recommended Task

1. Frontend team: read `docs/FRONTEND_HANDOFF.md` and `docs/API_CONTRACT.md`,
   start `feature/frontend` branch.
2. Once a frontend exists: end-to-end browser workflow testing (the one
   gap in `docs/TESTING_EVIDENCE.md`).
3. Before final submission: run the requirement-by-requirement audit
   against `PROJECT_CONTEXT.md` per `AGENT_RULES.md` §15 (PASS/FAIL/
   PARTIAL/NOT TESTED with evidence) — not yet done as a formal pass.
4. Consider adding a `MANUAL_ADJUSTMENT` stock-correction endpoint if the
   frontend's Inventory page needs one.

### Git Commit

```text
9deb4eb chore: initial StockLoom project foundation
0477fca feat: implement database schema and seed
0852e23 feat: implement inventory transactions and database logic
063aa4f test: prove concurrent order safety
fef2854 perf: add inventory indexes and benchmark evidence
0d98c4d feat: implement backend API
(this commit) docs: add API contract and DBMS handoff
```

Branch: `feature/database-backend` (not yet pushed to a remote — no GitHub
remote configured yet; see project owner for repo creation/push).

---

## Handoff Rules

The receiving agent must:

1. Read PROJECT_CONTEXT.md
2. Read AGENT_RULES.md
3. Read ARCHITECTURE.md
4. Read this file
5. Inspect Git status
6. Inspect the relevant code
7. Confirm assumptions before modifying shared architecture

Never assume that a feature is complete merely because this file says so. Verify important behavior locally.

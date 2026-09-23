# StockLoom

**Manufacturing Inventory & Order Management System** — a full-stack DBMS project built around a PostgreSQL schema that is the authoritative source of inventory correctness, not an afterthought behind a UI.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Key DBMS Focus](#key-dbms-focus)
3. [Main Features](#main-features)
4. [Inventory / Business Lifecycle](#inventory--business-lifecycle)
5. [Architecture](#architecture)
6. [Important Inventory Design Clarification](#important-inventory-design-clarification)
7. [Database Implementation](#database-implementation)
8. [Transactions and Concurrency](#transactions-and-concurrency)
9. [Performance Benchmarking](#performance-benchmarking)
10. [Testing and Verification](#testing-and-verification)
11. [Project Structure](#project-structure)
12. [Setup / Local Development](#setup--local-development)
13. [API](#api)
14. [Documentation](#documentation)
15. [Project Status](#project-status)
16. [Team Contribution](#team-contribution)

---

## Problem Statement

Small and mid-scale manufacturing operations often track raw materials, production batches, supplier relationships, and customer orders across disconnected spreadsheets. This breaks down in predictable ways: stock counts drift out of sync between sales and production, orders get accepted against material that's already committed elsewhere, reorder points are missed until a production line actually stalls, and there is no reliable audit trail for who changed what and when.

StockLoom addresses this by modeling the full material → production → order → dispatch lifecycle in a normalized relational schema, with PostgreSQL — not the application layer — enforcing inventory correctness under concurrent access.

## Key DBMS Focus

This project's grading and evaluation center is the database layer, not the UI. What's actually implemented:

- **3NF normalized schema** — every junction table has a composite key with no partial or transitive dependencies (see [Database Implementation](#database-implementation))
- **ACID-safe transactions** — order fulfillment and production-batch completion are each atomic; any failure rolls back completely, including header rows
- **Concurrency control with `SELECT ... FOR UPDATE`** — row-level locking on the contended stock row, proven with two genuinely separate PostgreSQL connections (not simulated) — see [Transactions and Concurrency](#transactions-and-concurrency)
- **Database triggers** — stock mutation and audit logging happen exclusively in trigger functions, never duplicated in application code
- **Stored function for low-stock detection** — `fn_materials_below_reorder()`, an on-demand PL/pgSQL function complementing a real-time trigger
- **`StockLog` audit trail** — every stock-affecting operation is logged automatically by the triggers that cause it
- **Indexed query benchmarking with `EXPLAIN ANALYZE`** — a B-tree range-query benchmark and a B-tree-vs-hash point-lookup benchmark, both run against real generated data with real captured output
- **Reporting view** — `v_batch_material_consumption`, a four-table join exposed for reporting

## Main Features

| Page | Capability |
|---|---|
| Dashboard | Live stock/order/batch summary, low-stock banner, recent activity feed |
| Suppliers | Directory of suppliers and lead times |
| Inventory | Raw-material stock levels with reorder-threshold status |
| Products | Finished-goods catalog with stock, create new products |
| Production Batches | Plan a batch, record planned material usage, complete a batch (triggers the consumption/output transaction) |
| Customers | Customer directory |
| Orders | Place multi-line orders, view order details, see real-time rejection on insufficient stock |
| Dispatch | Record a dispatch against a pending order, advancing its status |
| Stock Audit Logs | Full trigger-generated audit trail, filterable by transaction type and searchable |
| Reports | Low-stock alerts (stored function) and material-consumption (view), each on its own tab |

## Inventory / Business Lifecycle

```
Supplier
   │
   ▼
Raw Material  (RawMaterial.current_stock)
   │  consumed via BatchMaterialUsage
   ▼
Production Batch  (completion fires trg_production_batch_completion)
   │  raw materials deducted, StockLog: PRODUCTION_CONSUMPTION
   │  finished stock credited, StockLog: PRODUCTION_OUTPUT
   ▼
Finished Product Stock  (Product.current_stock)
   │
   ▼
Customer Order  (OrderItem insert fires trg_order_item_after_insert)
   │  SELECT ... FOR UPDATE locks the Product row, validates, deducts
   ▼
Product Stock Deduction  +  StockLog: ORDER_FULFILLMENT
   │
   ▼
Dispatch  (order status → DISPATCHED)
```

## Architecture

```
┌────────────────────────┐
│   React + Tailwind      │   frontend/
└───────────┬─────────────┘
            │ HTTP / JSON (VITE_API_BASE_URL)
┌───────────▼─────────────┐
│  Node.js + Express       │   backend/
│  Routes → parameterized  │
│  SQL (no ORM)            │
└───────────┬─────────────┘
            │ parameterized SQL
┌───────────▼─────────────┐
│      PostgreSQL          │   database/
│  Tables · Constraints    │
│  Triggers · Functions    │
│  Views · Indexes         │
└──────────────────────────┘
```

**PostgreSQL is the authoritative source of inventory integrity.** The backend never re-implements a stock check, a deduction, or an audit-log write in JavaScript — every inventory mutation happens inside a trigger, and the API layer only maps trigger/constraint errors to HTTP responses. Raw parameterized SQL is used throughout (`pg` driver) — no ORM — so schema and query behavior stay directly visible.

## Important Inventory Design Clarification

`Product` carries its own `current_stock` column, representing **finished-goods inventory**, separate from `RawMaterial.current_stock`.

- **Production completion** consumes raw materials (via `BatchMaterialUsage`) and **increases** `Product.current_stock` by the batch's produced quantity.
- **Order fulfillment** **deducts** `Product.current_stock` directly — it does not touch `RawMaterial` at order time.
- `StockLog` records both kinds of change, with a constraint ensuring each row references exactly one of `RawMaterial` or `Product`.
- There is **no** `ProductMaterialRecipe`/bill-of-materials table. Raw-material-to-product consumption ratios are recorded per batch in `BatchMaterialUsage`, not as a reusable recipe.

The reasoning behind this design — and the documentation gap it resolves — is recorded in `ARCHITECTURE_DECISIONS.md` (ADR-006–ADR-009).

## Database Implementation

12 tables total:

| Table | Role |
|---|---|
| `supplier` | Supplier directory |
| `raw_material` | Raw-material inventory (`current_stock`, `reorder_threshold`) |
| `supplier_material` | **Junction** — Supplier ↔ RawMaterial (M:N), carries `unit_price` |
| `product` | Finished-goods catalog (`current_stock`) |
| `production_batch` | A manufacturing run for one product |
| `batch_material_usage` | **Junction** — ProductionBatch ↔ RawMaterial (M:N), carries `quantity_used` |
| `customer` | Customer directory |
| `customer_order` | Order header |
| `order_item` | **Junction** — CustomerOrder ↔ Product (M:N), carries `quantity`/`unit_price` |
| `dispatch` | 1:1 with `customer_order` (enforced via `UNIQUE`) |
| `stock_log` | Audit trail; nullable `material_id`/`product_id` FKs with a `CHECK` enforcing exactly one is set |
| `low_stock_alert` | Persisted, trigger-populated low-stock alert records |

Constraints used throughout: `PRIMARY KEY`, `FOREIGN KEY`, `NOT NULL`, `UNIQUE`, and `CHECK` (e.g. non-negative stock, positive quantities/prices, restricted status enums). Full DDL: `database/schema.sql`.

Database objects:
- **Triggers** (`database/triggers.sql`): `trg_order_item_after_insert`, `trg_production_batch_completion`, `trg_low_stock_alert`
- **Function** (`database/functions.sql`): `fn_materials_below_reorder()`
- **View** (`database/views.sql`): `v_batch_material_consumption`
- **Indexes** (`database/indexes.sql`): B-tree on `customer_order.order_date`, hash on `raw_material.material_id`

## Transactions and Concurrency

- **Order fulfillment**: each `order_item` insert fires `trg_order_item_after_insert`, which locks the target `Product` row with `SELECT ... FOR UPDATE`, validates available stock, deducts it, and writes a `StockLog` row — all inside the client's transaction. A rejected item rolls back the entire order, including the order header, not just the failing line.
- **Production completion**: a single `UPDATE ... SET status = 'COMPLETED'` fires `trg_production_batch_completion`, which locks and deducts each consumed `RawMaterial` row (in deterministic `material_id` order, to avoid cross-batch deadlocks), logs the consumption, credits `Product.current_stock`, and logs the output — as one atomic statement.
- **Rollback on failure** is verified for both paths: insufficient raw material, insufficient finished-goods stock, and double-completion of an already-completed batch all reject cleanly with zero partial state.
- **Concurrent order test**: two genuinely separate PostgreSQL connections placed simultaneous orders for 70 and 60 units against a stock of 100. The result — full captured output in `docs/CONCURRENCY_PROOF.md` — shows the second connection's insert physically blocked for over two seconds on the row lock, then correctly saw the post-commit stock value and was rejected. **Result: exactly one order succeeded, final stock was 30, and zero overselling occurred**, with no orphaned records from the rejected order.

## Performance Benchmarking

Benchmarked against ~50,000 generated rows (`database/benchmarks/generate_data.sql`), kept separate from the small development seed dataset. Full methodology and captured output: `docs/INDEXING_BENCHMARK.md`.

- **B-tree range query** (`customer_order.order_date`): a month-range filter went from a Seq Scan (~8.2ms) to a Bitmap Index Scan (~2.4ms median across 5 runs) — a consistent ~3.4x improvement.
- **Hash point-lookup** (`raw_material.material_id`): `material_id` is already the table's `PRIMARY KEY`, backed by an implicit B-tree. Measured against that existing B-tree, the additional hash index showed **no meaningful improvement** in this test (both sit in the same sub-millisecond band). This is reported honestly rather than assumed — a hash index's theoretical advantage did not materialize at this scale for this query pattern.

All numbers come from actual `EXPLAIN ANALYZE` output; none are estimated.

## Testing and Verification

| Area | Status |
|---|---|
| Backend automated tests | **12/12 passing** (`backend/tests/api/backend.test.js`, run via `npm test`) — real Express app against the real database, no mocks |
| Frontend production build | Succeeds cleanly (`npm run build`) |
| Frontend lint | **0 errors, 39 warnings** (all cosmetic — unused imports, hook-dependency suggestions) |
| API integration | Every frontend API call traced against the actual backend response shapes and request payloads — no mismatches found |
| Full business lifecycle | Verified via live HTTP calls and via manual browser testing: Supplier → Raw Material → Production Batch → Product stock increment → Customer Order → Product stock deduction → StockLog → Dispatch |
| Concurrency proof | Verified with two real, separate PostgreSQL connections (see above) |
| Browser click-through verification | Performed directly in a rendered browser: order placement (success and insufficient-stock rejection), batch completion, dispatch creation, product creation with validation, and all 10 pages visually confirmed against live data |

**Known, non-blocking limitations:**
- No automated frontend test suite exists (no test framework configured); frontend verification relies on the production build, lint, and manual/browser testing above.
- The `MANUAL_ADJUSTMENT` `stock_log` change type is defined in the schema but has no dedicated API path yet.
- Authentication/authorization is not implemented (a deliberate, documented scope decision — see ADR-009).
- Mobile/responsive layout and some form edge cases have not been exhaustively tested.

## Project Structure

```
StockLoom/
├── backend/                     Express API (parameterized SQL, no ORM)
│   ├── src/
│   │   ├── app.js, server.js
│   │   ├── config/db.js
│   │   ├── middleware/errorHandler.js
│   │   ├── routes/               one file per resource
│   │   └── utils/asyncHandler.js
│   └── tests/api/                automated API tests
├── database/
│   ├── schema.sql, seed.sql
│   ├── functions.sql, triggers.sql, views.sql, indexes.sql
│   ├── benchmarks/                50k-row generator + teardown
│   └── tests/concurrency/         reproducible concurrency proof
├── frontend/                     React + Tailwind CSS (Vite)
│   └── src/
│       ├── api/                  client.js, services.js
│       ├── components/           common/ + layout/
│       ├── context/               toast notifications
│       ├── pages/                 10 pages, one per feature area
│       └── utils/formatters.js
├── docs/                          see Documentation below
├── ARCHITECTURE.md
├── ARCHITECTURE_DECISIONS.md
└── PROJECT_CONTEXT.md
```

## Setup / Local Development

### Prerequisites
- PostgreSQL 18 (or compatible) running locally
- Node.js 18+

### 1. Database
Create a dedicated application role and database — **do not** use the PostgreSQL superuser in the application:

```sql
-- as the postgres superuser:
CREATE ROLE stockloom_app WITH LOGIN PASSWORD '<choose a password>';
CREATE DATABASE stockloom OWNER stockloom_app;
```

Apply the schema, in this order:

```bash
psql -U stockloom_app -h localhost -d stockloom -f database/schema.sql
psql -U stockloom_app -h localhost -d stockloom -f database/seed.sql
psql -U stockloom_app -h localhost -d stockloom -f database/functions.sql
psql -U stockloom_app -h localhost -d stockloom -f database/triggers.sql
psql -U stockloom_app -h localhost -d stockloom -f database/views.sql
psql -U stockloom_app -h localhost -d stockloom -f database/indexes.sql
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in PGPASSWORD with the stockloom_app password
npm start                # listens on PORT (default 4000)
```

Verify: `GET http://localhost:4000/health` → `{"status":"ok"}`

Run the automated test suite: `npm test`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # Vite dev server, default http://localhost:5173
```

No `.env` is required — the frontend defaults to `http://localhost:4000` for the API base URL. To override, set `VITE_API_BASE_URL` in a `frontend/.env` file (see `frontend/.env.example`).

Full setup detail, including reproducing the concurrency proof and the indexing benchmark: `docs/SETUP.md`.

## API

The backend exposes a REST API under `/api/*` (plus `GET /health`), returning `{ "data": ... }` on success and `{ "error": { "code", "message" } }` on failure. The complete, up-to-date endpoint contract — request/response shapes, error codes, HTTP statuses — is documented in **[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)**.

## Documentation

| Document | Covers |
|---|---|
| `ARCHITECTURE.md` | System layers, transaction boundary, concurrency model |
| `ARCHITECTURE_DECISIONS.md` | Every ADR, including the finished-goods stock design (ADR-006) |
| `docs/ER_DIAGRAM.md` | Entity-relationship diagram |
| `docs/ER_MODEL_PROPOSAL.md` | The original documentation gap and how it was resolved |
| `docs/DBMS_NOTES.md` | Normalization, transaction/isolation, trigger/function/view explanations |
| `docs/API_CONTRACT.md` | Full backend API contract |
| `docs/CONCURRENCY_PROOF.md` | Full captured concurrency test output |
| `docs/INDEXING_BENCHMARK.md` | Full captured benchmark output |
| `docs/TESTING_EVIDENCE.md` | Index of what has been tested and where the evidence lives |
| `docs/SETUP.md` | Detailed setup and reproduction instructions |
| `docs/FRONTEND_HANDOFF.md` | Frontend integration reference |
| `docs/VIVA_NOTES.md` | Anticipated viva questions and talking points |
| `PROJECT_CONTEXT.md` | Original project requirements |

## Project Status

The database, backend, and frontend are integrated on `main`. The full business lifecycle, concurrency behavior, and API integration have been tested and verified as described in [Testing and Verification](#testing-and-verification) above.

## Team Contribution

- **Database / Backend / DBMS engineering** — PostgreSQL schema, constraints, triggers, stored function, reporting view, indexing, concurrency design and proof, benchmarking, and the Express API layer.
- **Frontend / application layer** — React + Tailwind CSS client, all 10 pages, API integration, and UI/UX (dashboard, forms, tables, toasts, responsive layout).

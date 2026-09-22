# StockLoom — Instructions for the Frontend Branch

For whoever is building `frontend/` on `feature/frontend`. Read this once
before starting; it should answer most integration questions up front.

## What exists on `feature/database-backend`

- A running PostgreSQL schema + trigger/function/view layer (`database/`).
- An Express backend (`backend/`) implementing every endpoint documented in
  **`docs/API_CONTRACT.md`** — read that file for exact request/response
  shapes, field names, and error codes. It is the source of truth, kept in
  sync with the actual code (`AGENT_RULES.md` §9).

## How to run the backend locally

```bash
cd backend
npm install
cp .env.example .env   # fill in PGPASSWORD -- ask for the stockloom_app password
npm start               # http://localhost:4000
```

`GET http://localhost:4000/health` should return `{"status":"ok"}` once
it's up. CORS is open for local development (`cors()` with no restriction),
so the frontend dev server can call it directly from any port.

## Environment variable convention

```
VITE_API_BASE_URL=http://localhost:4000
```

Use this rather than hardcoding the port, in case it changes.

## Response shape (applies to every endpoint)

```json
{ "data": ... }
```
or on error:
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "..." } }
```

`error.code` is a stable string — branch on it, not on `message` (which is
meant for humans/logs). See `docs/API_CONTRACT.md`'s status-code table for
which codes map to which HTTP status.

**Important:** all `NUMERIC` fields (stock quantities, prices) come back as
**strings** (e.g. `"49.99"`), not JSON numbers — this is `pg`'s default and
avoids floating-point precision loss on money/quantity values. Convert with
`Number(...)` before doing arithmetic or formatting.

## What the frontend should NOT do

- Never connect to PostgreSQL directly — always go through the backend API.
- Never re-implement stock-sufficiency checks in the UI as the source of
  truth. It's fine (and good UX) to disable a submit button optimistically,
  but the backend/database call is what actually decides success or
  failure — always handle the `409 INSUFFICIENT_STOCK` /
  `409 INSUFFICIENT_RAW_MATERIAL` error response, don't assume a
  pre-check guarantees success.

## Suggested pages → endpoints

| Page | Primary endpoints |
|---|---|
| Dashboard | `GET /api/inventory`, `GET /api/reports/low-stock` |
| Inventory | `GET /api/materials`, `GET /api/inventory` |
| Suppliers | `GET /api/suppliers` |
| Products | `GET /api/products`, `POST /api/products` |
| Production Batches | `GET /api/batches`, `POST /api/batches`, `POST /api/batches/:id/complete` |
| Customers | `GET /api/customers` |
| Orders | `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders` |
| Dispatch | `GET /api/dispatches`, `POST /api/dispatches` |
| Reports | `GET /api/reports/low-stock`, `GET /api/reports/material-consumption` |
| Stock Audit / Logs | `GET /api/stock-logs` |

## Known gaps you may hit

- No authentication yet (`ARCHITECTURE_DECISIONS.md` ADR-009 — deferred).
- No `PATCH`/`DELETE` endpoints — only create + list/get exist. If the UI
  needs edit/delete flows, that's a backend change — flag it rather than
  working around it in the frontend.
- The dev database gets mutated by running `backend/tests/api/*` — if data
  looks inconsistent with `database/seed.sql`, ask whoever owns the backend
  to reset it (`docs/SETUP.md` §1 "To reset to a clean state").

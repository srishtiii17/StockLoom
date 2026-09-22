# StockLoom — API Contract

This documents the **actual implemented** backend (`backend/src/`), not an
aspirational spec. If the backend changes, update this file in the same
commit (`AGENT_RULES.md` §9).

## Base URL

```
http://localhost:4000
```

Port is configurable via `backend/.env` → `PORT` (default `4000`). The
frontend should read `VITE_API_BASE_URL` (see `frontend/.env.example`,
Checkpoint 6) rather than hardcoding this.

## Response shape

All endpoints return JSON.

**Success:**
```json
{ "data": ... }
```

**Error:**
```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "product 2 has 40.00 in stock, 9999.00 requested" } }
```

Error `code` values are stable and safe to branch on in frontend code.
See `backend/src/middleware/errorHandler.js` for the authoritative mapping
from database errors (trigger `RAISE EXCEPTION` messages and PostgreSQL
error codes) to these HTTP responses.

| HTTP status | Meaning here |
|---|---|
| 200 | Successful GET |
| 201 | Resource created |
| 400 | `VALIDATION_ERROR` (missing/malformed request fields), `CHECK_VIOLATION`, `INVALID_INPUT`, `FOREIGN_KEY_VIOLATION`, or `INVALID_QUANTITY_PRODUCED` |
| 404 | Resource not found (`ORDER_NOT_FOUND`, `BATCH_NOT_FOUND`, `PRODUCT_NOT_FOUND`, unmatched route `NOT_FOUND`) |
| 409 | Business-rule conflict: `INSUFFICIENT_STOCK`, `INSUFFICIENT_RAW_MATERIAL`, `BATCH_ALREADY_COMPLETED`, `BATCH_CANCELLED`, `UNIQUE_VIOLATION` |
| 500 | `INTERNAL_ERROR` — unexpected server/database failure |

All monetary/quantity fields (`NUMERIC` columns in Postgres) are returned
as **JSON strings** (e.g. `"49.99"`), not numbers — this is `pg`'s default
behavior for `NUMERIC` and avoids float-precision loss. Parse with
`Number(...)`/`parseFloat(...)` on the frontend before arithmetic.
Timestamps are ISO 8601 strings.

---

## `GET /api/suppliers`
Returns all suppliers.
**Response:** `{ "data": [{ "supplier_id", "name", "contact_info", "lead_time_days" }, ...] }`

## `GET /api/materials`
Returns all raw materials.
**Response:** `{ "data": [{ "material_id", "name", "unit", "reorder_threshold", "current_stock" }, ...] }`

## `GET /api/products`
Returns all products (finished goods, with `current_stock` — ADR-006).
**Response:** `{ "data": [{ "product_id", "name", "unit_price", "category", "current_stock" }, ...] }`

## `POST /api/products`
Creates a product.
**Body:** `{ "name": string, "unit_price": number, "category"?: string, "current_stock"?: number }`
**Response:** `201 { "data": { "product_id", "name", "unit_price", "category", "current_stock" } }`
**Errors:** `400 VALIDATION_ERROR` if `name` or `unit_price` missing.

## `GET /api/inventory`
Consolidated stock overview across both inventory types.
**Response:** `{ "data": { "rawMaterials": [...], "products": [...] } }` (same row shapes as `/api/materials` and `/api/products`, minus `unit_price` on the products side).

## `GET /api/customers`
Returns all customers.
**Response:** `{ "data": [{ "customer_id", "name", "contact_info", "address" }, ...] }`

## `GET /api/batches`
Returns all production batches, joined with product name.
**Response:** `{ "data": [{ "batch_id", "product_id", "product_name", "start_date", "end_date", "quantity_produced", "status" }, ...] }` (newest first)

## `POST /api/batches`
Creates a batch in `PLANNED` status and (optionally) its planned material usage. **Does not** deduct any stock — only `.../complete` does that.
**Body:** `{ "product_id": number, "start_date"?: "YYYY-MM-DD", "materials"?: [{ "material_id": number, "quantity_used": number }, ...] }`
**Response:** `201 { "data": { "batch_id", "product_id", "start_date", "end_date", "quantity_produced", "status" } }`
**Errors:** `400 VALIDATION_ERROR` if `product_id` missing; `400 FOREIGN_KEY_VIOLATION` if `product_id`/`material_id` unknown.

## `POST /api/batches/:id/complete`
Completes a batch: `trg_production_batch_completion` locks and deducts `RawMaterial` per `BatchMaterialUsage`, logs `PRODUCTION_CONSUMPTION`, increments `Product.current_stock`, logs `PRODUCTION_OUTPUT`.
**Body:** `{ "quantity_produced": number }`
**Response:** `200 { "data": { "batch_id", "product_id", "status": "COMPLETED", "quantity_produced", "end_date" } }`
**Errors:**
- `400 VALIDATION_ERROR` — missing `quantity_produced`
- `400 INVALID_QUANTITY_PRODUCED` — `quantity_produced <= 0`
- `404 BATCH_NOT_FOUND` — unknown `:id`
- `409 BATCH_ALREADY_COMPLETED` — batch was already completed
- `409 BATCH_CANCELLED` — batch is cancelled
- `409 INSUFFICIENT_RAW_MATERIAL` — not enough raw material stock; entire completion rolled back

## `GET /api/orders`
Returns all orders, joined with customer name.
**Response:** `{ "data": [{ "order_id", "customer_id", "customer_name", "order_date", "status" }, ...] }` (newest first)

## `GET /api/orders/:id`
Returns one order with its line items.
**Response:** `200 { "data": { "order_id", "customer_id", "order_date", "status", "items": [{ "product_id", "product_name", "quantity", "unit_price" }, ...] } }`
**Errors:** `404 ORDER_NOT_FOUND`

## `POST /api/orders`
Places an order. Wraps the order header and every line item in a single
transaction; each item insert fires `trg_order_item_after_insert`
(`SELECT ... FOR UPDATE` on the `Product` row, validate, deduct, log
`ORDER_FULFILLMENT`). Any item failing rolls back the **entire** order,
including the header row (verified in `docs/CONCURRENCY_PROOF.md`).
**Body:** `{ "customer_id": number, "items": [{ "product_id": number, "quantity": number, "unit_price": number }, ...] }`
**Response:** `201 { "data": { "order_id", "customer_id", "order_date", "status": "PENDING", "items": [...] } }`
**Errors:**
- `400 VALIDATION_ERROR` — missing `customer_id` or empty `items`
- `404 PRODUCT_NOT_FOUND` — unknown `product_id`
- `409 INSUFFICIENT_STOCK` — not enough finished-goods stock for one of the items

## `GET /api/dispatches`
Returns all dispatches.
**Response:** `{ "data": [{ "dispatch_id", "order_id", "dispatch_date", "carrier", "tracking_ref" }, ...] }` (newest first)

## `POST /api/dispatches`
Creates a dispatch for an order and moves the order to `DISPATCHED`.
**Body:** `{ "order_id": number, "dispatch_date"?: ISO string, "carrier"?: string, "tracking_ref"?: string }`
**Response:** `201 { "data": { "dispatch_id", "order_id", "dispatch_date", "carrier", "tracking_ref" } }`
**Errors:** `400 VALIDATION_ERROR` — missing `order_id`; `409 UNIQUE_VIOLATION` — order already has a dispatch (1:1, `ARCHITECTURE_DECISIONS.md`).

## `GET /api/stock-logs`
Returns recent stock-change audit entries (both `RawMaterial`- and
`Product`-targeted rows — ADR-007), newest first.
**Query params:** `limit` (default 100, max 1000)
**Response:** `{ "data": [{ "log_id", "material_id", "material_name", "product_id", "product_name", "change_qty", "change_type", "timestamp", "triggered_by" }, ...] }`
(`material_id`/`material_name` are `null` for a product-targeted row and
vice versa — exactly one pair is populated per row.)

## `GET /api/reports/low-stock`
Calls the stored function `fn_materials_below_reorder()`.
**Response:** `{ "data": [{ "material_id", "name", "unit", "current_stock", "reorder_threshold" }, ...] }`

## `GET /api/reports/material-consumption`
Reads the `v_batch_material_consumption` view.
**Response:** `{ "data": [{ "batch_id", "product_id", "product_name", "material_id", "material_name", "quantity_used", "unit", "batch_status", "start_date", "end_date" }, ...] }`

## `GET /health`
Liveness check, no `/api` prefix.
**Response:** `200 { "status": "ok" }`

---

## Not implemented (explicitly out of scope for now)

- Authentication/authorization (`ARCHITECTURE_DECISIONS.md` ADR-009 — deferred extension).
- `PATCH`/`DELETE` on any resource — not required by the checkpoint plan; add only if the frontend genuinely needs edit/delete flows.

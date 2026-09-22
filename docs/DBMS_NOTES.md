# StockLoom — DBMS Concepts Explained

Companion to `docs/ER_DIAGRAM.md`, `docs/CONCURRENCY_PROOF.md`, and
`docs/INDEXING_BENCHMARK.md`. This file covers the concepts those don't:
normalization, transactions, triggers, functions, and the view.

## Normalization (3NF)

Every non-key attribute in every table depends on the whole primary key and
nothing but the primary key:

- **Junction tables** (`supplier_material`, `batch_material_usage`,
  `order_item`) have composite primary keys with no attribute depending on
  only *part* of that key — e.g. `supplier_material.unit_price` genuinely
  depends on the *pair* (supplier, material), not on either alone, since
  the same material can have a different price per supplier.
- **No transitive dependencies**: `customer_order` stores `customer_id`,
  not a copy of the customer's name/address; `order_item` stores
  `unit_price` (a deliberate, justified exception — see below), not the
  product's category or supplier info.
- **Deliberate non-normalization**: `order_item.unit_price` is
  intentionally independent of `product.unit_price`. This *looks* like
  redundancy but isn't — it's price-at-time-of-order, a fact about the
  order, not a derivable fact about the product (the product's price can
  change after the order is placed; the order's historical price must not).

## Functional dependencies / candidate keys (summary)

| Table | Candidate key | Non-key attributes depend on |
|---|---|---|
| `raw_material` | `material_id` | whole key only |
| `supplier_material` | `(supplier_id, material_id)` | the pair — `unit_price` varies per supplier×material |
| `batch_material_usage` | `(batch_id, material_id)` | the pair — `quantity_used` is specific to that batch's consumption of that material |
| `order_item` | `(order_id, product_id)` | the pair — `quantity`/`unit_price` are specific to that line item |
| `stock_log` | `log_id` | whole key; `material_id`/`product_id` are mutually exclusive facts about *which* entity changed (ADR-007), not a normalization violation |

## Transactions & ACID

The two stock-affecting operations are each atomic:

- **Order placement** (`POST /api/orders`): `BEGIN` → insert `customer_order`
  → insert each `order_item` (each fires the deduction trigger) → `COMMIT`.
  A failure anywhere rolls back the whole thing, including the order
  header — proven in `docs/CONCURRENCY_PROOF.md`.
- **Batch completion** (`POST /api/batches/:id/complete`): a single `UPDATE`
  statement whose `AFTER UPDATE` trigger does the raw-material deduction,
  product increment, and both `StockLog` inserts. PostgreSQL wraps a single
  statement (including everything its triggers do) in one implicit
  transaction, so a `RAISE EXCEPTION` anywhere inside rolls back the entire
  statement's effects — proven in `database/tests/concurrency/` adjacent
  manual tests (insufficient-raw-material and double-completion scenarios,
  see `docs/HANDOFF.md` for the captured output).

Isolation level: default `READ COMMITTED` + explicit `SELECT ... FOR UPDATE`
row locks. `READ COMMITTED` is sufficient here (rather than needing
`SERIALIZABLE`) because the correctness property we need — "don't let two
transactions both act on a stale read of the same stock row" — is exactly
what row-level locking on the contended row provides; there's no
cross-row invariant in this schema that `FOR UPDATE` doesn't already cover.

## Triggers

| Trigger | Fires on | Does |
|---|---|---|
| `trg_order_item_after_insert` | `AFTER INSERT ON order_item` | Locks the `Product` row (`FOR UPDATE`), validates stock, deducts, logs `ORDER_FULFILLMENT` |
| `trg_production_batch_completion` | `AFTER UPDATE OF status ON production_batch WHEN (NEW.status = 'COMPLETED')` | Locks and deducts each `RawMaterial` row per `BatchMaterialUsage` (ascending `material_id` order, to avoid deadlocks against a concurrent batch touching overlapping materials), logs `PRODUCTION_CONSUMPTION`, increments `Product.current_stock`, logs `PRODUCTION_OUTPUT`. Rejects double completion and completing a cancelled batch. |
| `trg_low_stock_alert` | `AFTER UPDATE OF current_stock ON raw_material` | On a genuine *crossing* of `reorder_threshold` (not every update while already below it), inserts a `LowStockAlert` row |

Each trigger is the **sole** place its mutation happens — the backend never
duplicates this logic in JavaScript (`AGENT_RULES.md` §4, §11).

## Stored function

`fn_materials_below_reorder()` — a `STABLE SQL` function returning every
`RawMaterial` at or below its `reorder_threshold`, ordered by how far below
threshold each one is. Complements `trg_low_stock_alert`: the trigger
catches the *moment* a threshold is crossed; the function answers "what's
low right now" on demand (`GET /api/reports/low-stock`), independent of
whether/when a crossing trigger fired (ADR-008).

## View

`v_batch_material_consumption` joins `production_batch` → `product` →
`batch_material_usage` → `raw_material`, giving one row per
material-consumed-by-a-batch with the product name, material name, and
batch status already resolved — so `GET /api/reports/material-consumption`
and any future reporting query doesn't need to repeat that four-table join.

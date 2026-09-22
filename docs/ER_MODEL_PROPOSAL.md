# STOCKLOOM — PROPOSED ER MODEL (PENDING APPROVAL)

Status: **PROPOSED — not implemented.** No `schema.sql` exists yet. This
document is for review only.

This model incorporates the documented entities/attributes from
`DBMS_Project_Documentation.md` and `StockLoom_Documentation.pdf`, plus the
clarifications recorded in `ARCHITECTURE_DECISIONS.md` ADR-006 through
ADR-009. Every attribute or constraint that was **not** literally present in
the source documentation is marked `[NEW]` or `[PROPOSED]` so it's clear
what's being added versus what's transcribed.

Types below are conceptual (PostgreSQL types to be finalized in `schema.sql`
once approved).

---

## 1. Supplier

| Column | Type | Constraints |
|---|---|---|
| supplier_id | INTEGER | PK |
| name | VARCHAR | NOT NULL |
| contact_info | VARCHAR | |
| lead_time_days | INTEGER | CHECK (lead_time_days >= 0) `[PROPOSED constraint]` |

## 2. RawMaterial

| Column | Type | Constraints |
|---|---|---|
| material_id | INTEGER | PK |
| name | VARCHAR | NOT NULL |
| unit | VARCHAR | NOT NULL |
| reorder_threshold | NUMERIC | NOT NULL, CHECK (reorder_threshold >= 0) `[PROPOSED constraint]` |
| current_stock | NUMERIC | NOT NULL DEFAULT 0, CHECK (current_stock >= 0) `[PROPOSED constraint — core overselling guarantee]` |

## 3. SupplierMaterial (junction)

| Column | Type | Constraints |
|---|---|---|
| supplier_id | INTEGER | PK (composite), FK → Supplier |
| material_id | INTEGER | PK (composite), FK → RawMaterial |
| unit_price | NUMERIC | NOT NULL, CHECK (unit_price > 0) `[PROPOSED constraint]` |

Resolves the documented Supplier ↔ RawMaterial M:N relationship.

## 4. Product

| Column | Type | Constraints |
|---|---|---|
| product_id | INTEGER | PK |
| name | VARCHAR | NOT NULL |
| unit_price | NUMERIC | CHECK (unit_price > 0) `[PROPOSED constraint]` |
| category | VARCHAR | |
| **current_stock** | **NUMERIC** | **NOT NULL DEFAULT 0, CHECK (current_stock >= 0)** `[NEW — ADR-006. Not in the original documented entity table.]` |

## 5. ProductionBatch

| Column | Type | Constraints |
|---|---|---|
| batch_id | INTEGER | PK |
| product_id | INTEGER | NOT NULL, FK → Product |
| start_date | DATE | |
| end_date | DATE | CHECK (end_date >= start_date) `[PROPOSED constraint]` |
| quantity_produced | NUMERIC | CHECK (quantity_produced >= 0) — present in MD doc §5, absent from PDF p.3 table; kept per your earlier instruction |
| status | VARCHAR | CHECK (status IN (...)) — **values not yet decided, see Open Questions §A below** |

On batch completion (status transition to a "completed" state — exact
trigger condition also pending §A): `RawMaterial.current_stock` decrements
per `BatchMaterialUsage` rows (existing/documented behavior), and
`Product.current_stock` increments by `quantity_produced` (ADR-006, new).

## 6. BatchMaterialUsage (junction)

| Column | Type | Constraints |
|---|---|---|
| batch_id | INTEGER | PK (composite), FK → ProductionBatch |
| material_id | INTEGER | PK (composite), FK → RawMaterial |
| quantity_used | NUMERIC | NOT NULL, CHECK (quantity_used > 0) `[PROPOSED constraint]` |

Resolves ProductionBatch ↔ RawMaterial M:N (documented). Per your
instruction, this table is **not** reused as an implicit product recipe.

## 7. Customer

| Column | Type | Constraints |
|---|---|---|
| customer_id | INTEGER | PK |
| name | VARCHAR | NOT NULL |
| contact_info | VARCHAR | |
| address | VARCHAR | |

## 8. CustomerOrder

| Column | Type | Constraints |
|---|---|---|
| order_id | INTEGER | PK |
| customer_id | INTEGER | NOT NULL, FK → Customer |
| order_date | TIMESTAMP | NOT NULL DEFAULT now() |
| status | VARCHAR | CHECK (status IN (...)) — **values not yet decided, see Open Questions §A** |

`order_date` (not just `order_date` as DATE) chosen as TIMESTAMP so the
~50k-row benchmark (item 12 of the reconciliation) has realistic range-query
granularity — flagging this as a `[PROPOSED]` type choice, open to
correction.

## 9. OrderItem (junction)

| Column | Type | Constraints |
|---|---|---|
| order_id | INTEGER | PK (composite), FK → CustomerOrder |
| product_id | INTEGER | PK (composite), FK → Product |
| quantity | NUMERIC | NOT NULL, CHECK (quantity > 0) `[PROPOSED constraint]` |
| unit_price | NUMERIC | NOT NULL, CHECK (unit_price > 0) `[PROPOSED constraint]` |

`unit_price` here is deliberately independent of `Product.unit_price` — it
captures the price at the time of the order, which is correct normalization
practice (price history shouldn't be inferred from a mutable `Product` row).
This isn't new; it's implicit in the documented column list.

`AFTER INSERT` trigger (documented, MD §6.4): decrements
`Product.current_stock` by `quantity` (per ADR-006) and inserts a
`StockLog` row with `product_id` set. Runs inside the order's transaction,
which holds `SELECT ... FOR UPDATE` on the `Product` row (ADR-006).

## 10. Dispatch

| Column | Type | Constraints |
|---|---|---|
| dispatch_id | INTEGER | PK |
| order_id | INTEGER | NOT NULL, UNIQUE, FK → CustomerOrder `[UNIQUE enforces the documented 1:1 with CustomerOrder]` |
| dispatch_date | TIMESTAMP | |
| carrier | VARCHAR | |
| tracking_ref | VARCHAR | present in MD doc §5, absent from PDF p.3 table; kept per your earlier instruction |

## 11. StockLog (audit table, trigger-populated)

| Column | Type | Constraints |
|---|---|---|
| log_id | INTEGER | PK |
| material_id | INTEGER | **NULLABLE**, FK → RawMaterial `[was NOT NULL-implied in original docs; now nullable per ADR-007]` |
| **product_id** | **INTEGER** | **NULLABLE, FK → Product** `[NEW — ADR-007]` |
| change_qty | NUMERIC | NOT NULL |
| change_type | VARCHAR | CHECK (change_type IN (...)) — **values not yet decided, see Open Questions §B** |
| timestamp | TIMESTAMP | NOT NULL DEFAULT now() |
| triggered_by | VARCHAR | present in MD doc §5, absent from PDF p.3 table; kept per your earlier instruction |
| — | — | `[NEW] CHECK ( (material_id IS NOT NULL AND product_id IS NULL) OR (material_id IS NULL AND product_id IS NOT NULL) )` — enforces "exactly one inventory entity per log row" (ADR-007) |

---

## Relationships summary (unchanged from documentation except where noted)

- Supplier ↔ RawMaterial — M:N via SupplierMaterial (documented)
- ProductionBatch ↔ RawMaterial — M:N via BatchMaterialUsage (documented)
- Product → ProductionBatch — 1:N (documented, via `ProductionBatch.product_id`)
- Product ↔ CustomerOrder — M:N via OrderItem (documented)
- CustomerOrder → Dispatch — 1:1 (documented, enforced here via UNIQUE)
- RawMaterial → StockLog — 1:N (documented)
- **Product → StockLog — 1:N `[NEW — ADR-006/007]`**

---

## Open Questions (need your decision before `schema.sql`)

### §A — Status enum values
`ProductionBatch.status` and `CustomerOrder.status` are documented as plain
`status` columns with no value set specified anywhere in either source
document. I'd propose, as a starting point:
- `ProductionBatch.status`: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `CustomerOrder.status`: `PENDING`, `CONFIRMED`, `FULFILLED`, `DISPATCHED`, `CANCELLED`

...and that `Product.current_stock` incrementing happens specifically on the
transition **into** `ProductionBatch.status = 'COMPLETED'`. None of this is
in the source docs — please confirm, adjust, or reject before I lock it into
the schema.

### §B — StockLog.change_type values, and low-stock alert storage
Two related open items from ADR-008:
1. `change_type` needs a value set. Proposed: `PRODUCTION_CONSUMPTION` (raw
   material, batch completion), `PRODUCTION_OUTPUT` (product, batch
   completion), `ORDER_FULFILLMENT` (product, order placement),
   `MANUAL_ADJUSTMENT`.
2. The ADR-008 low-stock trigger needs somewhere to write its alert. Neither
   source document specifies a storage mechanism. Options: (a) a small
   dedicated `LowStockAlert` table (queryable, demonstrable in a screenshot —
   my default lean), (b) reuse `StockLog` with a `change_type` like
   `LOW_STOCK_ALERT` even though no quantity actually changed (semantically
   muddies an audit-of-actual-changes table), (c) PostgreSQL `NOTIFY` with no
   persistent record (hard to demonstrate/screenshot for the viva). I'd
   default to (a) but haven't added it to the table list above — want your
   call before I do.

---

## Not yet in this document

- Indexes (deferred to the indexing/benchmark phase, per `ARCHITECTURE.md` §9)
- Views (`v_batch_material_consumption` — deferred to Phase 3 per the
  implementation plan)
- Functions/procedures and trigger bodies (deferred to Phase 3)

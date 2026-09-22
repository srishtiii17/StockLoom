# STOCKLOOM — ARCHITECTURE DECISIONS

Record important technical decisions here.

---

## ADR-001 — PostgreSQL

### Status
Accepted

### Decision
Use PostgreSQL as the relational database.

### Reason
The project requires database-level demonstrations involving transactions, row-level locking, triggers, functions/procedures, views and indexes.

---

## ADR-002 — Raw SQL for Core DBMS Demonstrations

### Status
Accepted

### Decision
Use parameterized raw SQL for important database operations.

### Reason
The DBMS mechanisms should remain visible and explainable during evaluation.

---

## ADR-003 — Database as Inventory Source of Truth

### Status
Accepted

### Decision
PostgreSQL is authoritative for inventory consistency.

### Reason
Frontend/application checks cannot safely enforce inventory consistency under concurrent requests.

---

## ADR-004 — Row-Level Locking

### Status
Accepted

### Decision
Use PostgreSQL row-level locking with `SELECT ... FOR UPDATE` for critical stock-consuming transactions.

### Reason
Concurrent transactions must not both consume the same available inventory.

---

## ADR-005 — Reproducible Benchmarks

### Status
Accepted

### Decision
All performance claims must come from actual PostgreSQL benchmark execution.

### Reason
Fabricated or theoretical timing numbers are not valid evidence.

---

## ADR-006 — Product.current_stock for Finished-Goods Inventory

### Status
Accepted

### Problem
`OrderItem` references `Product`, but the source documentation (`DBMS_Project_Documentation.md` §6.3–6.4, `StockLoom_Documentation.pdf` p.3) describes the order-placement trigger as decrementing "stock" and locking `RawMaterial.current_stock` — yet `Product` has no stock field in the documented entity table, and no direct `Product`↔`RawMaterial` table exists (`BatchMaterialUsage` links `ProductionBatch`↔`RawMaterial`, not `Product`↔`RawMaterial`). Decrementing `RawMaterial` directly at order time would also double-count consumption already recorded at batch completion (Module 02, PDF p.2: "batch completion triggers a stock deduction transaction against the materials consumed").

### Options
1. Add an undocumented `ProductMaterialRecipe` (BOM) table and decrement `RawMaterial.current_stock` directly at order time.
2. Add `Product.current_stock` (finished-goods inventory), incremented at batch completion and decremented at order time.
3. Derive an implicit per-unit recipe from historical `BatchMaterialUsage` rows at order time.

### Decision
Option 2. Add `Product.current_stock`.

### Reason
Keeps the lifecycle internally consistent: raw materials are consumed exactly once, at production (`BatchMaterialUsage`, unchanged); finished goods are consumed exactly once, at sale (`OrderItem`). Avoids inventing an undocumented BOM table and avoids a fragile derived-ratio scheme with no stable definition of "which batch's ratio is authoritative."

**This is an explicit clarification of an inconsistency in the original project documentation, not an implementation of documentation text.** `Product.current_stock` was not present in the originally documented entity table (`DBMS_Project_Documentation.md` §5 / PDF p.3) and should not be cited as if it were.

### Consequences
- The row locked with `SELECT ... FOR UPDATE` during concurrent order placement is now `Product.current_stock`, not `RawMaterial.current_stock` as the source docs literally state.
- `ProductionBatch` completion becomes a stock-affecting operation on two entities: decrement `RawMaterial` (existing, via `BatchMaterialUsage`) and increment `Product.current_stock` by `quantity_produced` (new).
- `StockLog` must be able to audit both kinds of stock change — see ADR-007.

### Affected Files
`database/schema.sql` (not yet written), `ARCHITECTURE.md` §4–5, `docs/ER_MODEL_PROPOSAL.md`

---

## ADR-007 — StockLog Dual-Target Audit Design

### Status
Accepted

### Problem
As documented, `StockLog` carries only `material_id (FK)`. ADR-006 introduces a second stock-bearing entity (`Product.current_stock`), so both raw-material changes (production) and product changes (batch-completion increment, order decrement) need auditing.

### Options
1. Two nullable FK columns (`material_id`, `product_id`) plus a `CHECK` constraint requiring exactly one to be non-null.
2. Generic `entity_type` + `entity_id` columns with no FK enforcement, validated by trigger instead.

### Decision
Option 1.

### Reason
Preserves real `FOREIGN KEY` constraints, which is directly valuable for a DBMS course graded on constraint usage. A generic polymorphic pair would trade away database-level referential integrity for a genericness this project doesn't need — there are only two possible targets, not an open-ended set.

### Consequences
`StockLog` gains a nullable `product_id` FK alongside the existing nullable `material_id` FK, with a `CHECK` enforcing exactly one is set per row. All other documented fields (`log_id`, `change_qty`, `change_type`, `timestamp`, `triggered_by`) are preserved as in the Markdown doc.

### Affected Files
`database/schema.sql`, `database/triggers.sql`, `docs/ER_MODEL_PROPOSAL.md`

---

## ADR-008 — Low-Stock Alerting: Function *and* Trigger

### Status
Accepted

### Problem
The two authoritative sources disagree. `DBMS_Project_Documentation.md` §6.4 describes only a stored/scheduled procedure that scans for low stock. `StockLoom_Documentation.pdf` p.2 (Module 01) describes a stored procedure *plus* a separate trigger that writes a real-time alert.

### Decision
Implement both: a stored function/procedure for on-demand/scheduled scanning of `RawMaterial` rows at or below `reorder_threshold`, and a trigger that fires when a stock update crosses that threshold.

### Reason
Satisfies both source documents rather than discarding one. The two mechanisms are complementary — one supports on-demand reporting, the other immediate notification — not redundant.

### Consequences
More surface area to test per `AGENT_RULES.md` §10: both the function's output and the trigger's alert effect need independent, reproducible demonstrations. The exact storage/delivery mechanism for the trigger's alert (a dedicated alert table vs. reusing `StockLog` vs. `NOTIFY`) is not yet decided — see open item in `docs/ER_MODEL_PROPOSAL.md`.

### Affected Files
`database/functions.sql`, `database/triggers.sql`

---

## ADR-009 — Role-Based Auth Deferred

### Status
Accepted (deferred)

### Problem
The source PDF/MD documentation is internally inconsistent: §4 "Proposed System" lists role-based dashboards (admin/production/sales) as part of the core system, while §10 "Possible Extensions" lists role-based authentication as optional, "if time permits." No `User`/`Role` entity appears anywhere in the documented core entity table (§5).

### Decision
Treat role-based auth as an optional extension. No `User`/`Role` entities are added to the core schema now.

### Reason
Matches the documented core entity table, which has no such entity, and keeps schema/backend scope focused on the DBMS concepts that are unambiguously required for the core deliverable.

### Consequences
No authentication/authorization exists in the initial build. If added later, it requires a schema addition and is explicitly out of scope until separately decided.

### Affected Files
None yet (deferred).

---

## Template for Future Decisions

## ADR-XXX — Title

### Status
Proposed / Accepted / Rejected / Superseded

### Problem

What problem required a decision?

### Options

What reasonable alternatives were considered?

### Decision

What was chosen?

### Reason

Why?

### Consequences

What does this choice make easier or harder?

### Affected Files

List relevant files.

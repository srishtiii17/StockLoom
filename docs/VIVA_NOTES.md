# StockLoom — Viva Notes

Quick-reference for defending the database/backend half of the project.
Both team members should be able to walk through this (`AGENT_RULES.md`
notes faculty cross-question regardless of module ownership).

## The one thing to get right if asked only one question

**"How do you prevent overselling under concurrent orders?"**
`SELECT current_stock FROM product WHERE product_id = ... FOR UPDATE`
inside `trg_order_item_after_insert` (`database/triggers.sql`). The second
concurrent transaction physically blocks on that row lock until the first
commits, then re-reads the *post-commit* stock value before deciding
whether to proceed — so it can never act on stale data. Proven with two
real, separate PostgreSQL connections in `docs/CONCURRENCY_PROOF.md`
(measured 2.36 second lock-wait, not simulated).

## "Why does Product have a current_stock column? The spec didn't document that."

Correct catch if asked — walk through it honestly rather than pretending
it was always there:
1. `OrderItem` references `Product`, but the original documentation never
   gave `Product` a stock field.
2. The documented trigger said "decrement stock" and lock
   `RawMaterial.current_stock" — but there's no direct path from an
   ordered `Product` to a `RawMaterial` without inventing an undocumented
   Bill-of-Materials table, and doing so would double-count consumption
   already recorded when the batch was produced.
3. We resolved this explicitly (not silently) with the project owner —
   see `ARCHITECTURE_DECISIONS.md` ADR-006 and `docs/ER_MODEL_PROPOSAL.md`
   for the full reasoning and the interpretations that were rejected.
4. Result: raw materials are consumed once, at production time; finished
   goods are consumed once, at sale time. Internally consistent lifecycle.

## "Show me a transaction rolling back."

Two good demos, both with real captured output:
- Multi-item order where the second item has insufficient stock — the
  *whole* order (including the header row) disappears, not just the
  failing item (`docs/TESTING_EVIDENCE.md`, commit `0852e23`).
- Complete a batch twice — second attempt raises `BATCH_ALREADY_COMPLETED`
  and changes nothing.

## "Explain your indexing result."

Don't claim the hash index "won" — it didn't, and that's the honest,
correctly-documented finding (`docs/INDEXING_BENCHMARK.md`). Talking
points:
- `material_id` is already a `PRIMARY KEY`, so there's no genuine
  "no index" baseline for it — the real comparison is *existing PK B-tree*
  vs. *additional hash index*.
- The B-tree on `order_date`, by contrast, shows a clear, repeatable ~3.4x
  improvement on a range query — the textbook case a B-tree is good at.
- Good DBMS practice is measuring and reporting what you find, not what
  you expected to find.

## "What's normalized here, and why does OrderItem store unit_price when Product already has one?"

`order_item.unit_price` is *not* redundant — it's the price at the moment
of the order, a fact about that order, not a derivable fact about the
current product. If `product.unit_price` changes later, historical orders
must keep their original price. See `docs/DBMS_NOTES.md` for the full
normalization writeup.

## Where everything lives

| Ask about | File |
|---|---|
| Schema / constraints | `database/schema.sql` |
| Triggers | `database/triggers.sql`, explained in `docs/DBMS_NOTES.md` |
| Stored function | `database/functions.sql` |
| View | `database/views.sql` |
| Indexes + benchmark | `database/indexes.sql`, `docs/INDEXING_BENCHMARK.md` |
| Concurrency proof | `database/tests/concurrency/`, `docs/CONCURRENCY_PROOF.md` |
| API | `backend/src/`, `docs/API_CONTRACT.md` |
| Every design decision + why | `ARCHITECTURE_DECISIONS.md` |
| What's tested vs. not | `docs/TESTING_EVIDENCE.md` |

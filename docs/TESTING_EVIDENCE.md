# StockLoom — Testing Evidence Index

Per `AGENT_RULES.md` §3/§10: nothing here is claimed without having
actually been run. This file indexes where each piece of evidence lives;
detailed captured output is in the linked documents/commits, not
re-paraphrased here.

| Area | What was tested | Evidence |
|---|---|---|
| Schema creation | Clean `dropdb`/`createdb` + full `schema.sql` apply, twice (Checkpoints 1 and 5) | Commit `0477fca`; re-verified in Checkpoint 5 (`0d98c4d`) |
| Constraints | Negative stock (CHECK), both-null `stock_log` row (CHECK), duplicate dispatch per order (UNIQUE), invalid status value (CHECK) — all correctly rejected | Commit `0477fca` message |
| Seed data integrity | Row counts verified post-seed (3/5/6/3/3/4/3/3/3/1 across the ten seeded tables); full drop-and-rebuild cycle reproducible | Commit `0477fca` |
| Successful production batch completion | Raw material deducted, product stock incremented, correct `StockLog` rows, low-stock alert fired exactly on threshold crossing | Commit `0852e23`, live output captured in that session |
| Insufficient stock (production) | `INSUFFICIENT_RAW_MATERIAL` rejected, full rollback, no partial deduction/log/status change | Commit `0852e23` |
| Insufficient stock (order) | `INSUFFICIENT_STOCK` rejected at the DB layer directly, and again through the API (`409`) | Commit `0852e23`; API-level in `backend/tests/api/backend.test.js` |
| Rollback (double batch completion) | `BATCH_ALREADY_COMPLETED` rejected, zero side effects | Commit `0852e23` |
| Rollback (multi-item order) | One item succeeds, second fails → **entire transaction** rolled back including the `customer_order` header row (not just the failing item) | Commit `0852e23` |
| Trigger-generated stock log | Verified for all four `change_type` values (`PRODUCTION_CONSUMPTION`, `PRODUCTION_OUTPUT`, `ORDER_FULFILLMENT` at minimum — `MANUAL_ADJUSTMENT` is defined but not yet exercised by any code path) | Commit `0852e23` |
| Low-stock detection (trigger) | Real-time crossing detection verified with an exact before/after stock value match | Commit `0852e23` |
| Low-stock detection (function) | `fn_materials_below_reorder()` returned exactly the one crossed material | Commit `0852e23` |
| Reporting view | `v_batch_material_consumption` smoke-tested against seed data (4 expected rows, correct join) | Commit `fef2854`; also exercised via `GET /api/reports/material-consumption` in backend tests |
| Concurrent order simulation | Two genuinely separate PostgreSQL connections (not sequential calls); measured 2360.793ms lock-wait on the second session; exactly one order succeeded; final stock = 30; zero orphaned records (even the losing order's header row was rolled back) | `docs/CONCURRENCY_PROOF.md`, commit `063aa4f`. Reproducible via `database/tests/concurrency/run.sh`. |
| Index benchmark (B-tree, `order_date`) | Baseline Seq Scan 8.228ms → Bitmap Index Scan, 5-run median ≈ 2.39ms. Consistent ~3.4x improvement. | `docs/INDEXING_BENCHMARK.md`, commit `fef2854` |
| Index benchmark (hash, `material_id`) | PK B-tree avg 0.209ms vs hash index avg 0.356ms across 5 clean runs each — **no improvement found, documented honestly** (including disclosure of one invalidated intermediate measurement, corrected before being reported) | `docs/INDEXING_BENCHMARK.md`, commit `fef2854` |
| API validation | Missing-field `400 VALIDATION_ERROR`, unknown-route `404 NOT_FOUND` | `backend/tests/api/backend.test.js` |
| API workflows | Product creation, order placement (success + rejection), batch creation + completion (success + double-completion rejection), dispatch creation + order status transition, stock-log retrieval, all report endpoints | `backend/tests/api/backend.test.js` — **12/12 passing**, run via `npm test` against the real Express app and real dev database (no mocks) |
| End-to-end browser workflow | **Not yet tested** — no frontend exists on this branch. Owned by `feature/frontend`; see `docs/FRONTEND_HANDOFF.md`. | — |

## Not yet exercised (honest gaps, not claimed as done)

- `MANUAL_ADJUSTMENT` stock_log change_type — defined in the schema `CHECK`
  constraint but no API path creates one yet (would need a manual
  stock-correction endpoint, not in the required minimum list).
- Full end-to-end browser workflow (needs the frontend).
- Load/stress testing beyond the specific 70-vs-60 concurrency scenario.

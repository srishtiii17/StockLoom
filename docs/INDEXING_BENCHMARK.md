# StockLoom — Indexing Benchmark (Checkpoint 4)

All numbers below are actual `EXPLAIN ANALYZE` output captured against a
live PostgreSQL 18 database seeded with `database/benchmarks/generate_data.sql`
(50,000 `customer_order` rows spread across 2024-01-01..2025-12-31,
50,000 synthetic `raw_material` rows). Nothing here is estimated or invented,
per `ARCHITECTURE_DECISIONS.md` ADR-005.

## 1. B-tree on `customer_order.order_date` (range query)

Query: `SELECT ... FROM customer_order WHERE order_date >= '2025-03-01' AND order_date < '2025-04-01'` (~2,148 matching rows out of 50,003).

### Before index (Seq Scan)

```
Seq Scan on customer_order  (cost=0.00..789.80 rows=144 width=74) (actual time=0.059..7.898 rows=2148.00 loops=1)
  Filter: (order_date >= ... AND order_date < ...)
  Rows Removed by Filter: 47855
  Buffers: shared hit=359
Execution Time: 8.228 ms
```

### After `CREATE INDEX idx_customer_order_order_date ... USING btree (order_date)`

```
Bitmap Heap Scan on customer_order  (cost=46.29..437.48 rows=2146 width=25) (actual time=0.384..2.174 rows=2148.00 loops=1)
  Recheck Cond: (order_date >= ... AND order_date < ...)
  Heap Blocks: exact=358
  ->  Bitmap Index Scan on idx_customer_order_order_date  (cost=0.00..45.75 rows=2146 width=0) (actual time=0.308..0.308 rows=2148.00 loops=1)
Execution Time: 2.421 ms
```

5 repeated runs after the index (ms): 2.347, 2.392, 4.020, 2.295, 2.766 — median ≈ 2.39ms.

**Result: consistent ~3–3.5× improvement** (8.23ms seq scan → ~2.4ms bitmap
index scan), and the planner correctly switches from `Seq Scan` to
`Bitmap Heap Scan` + `Bitmap Index Scan`. This is the expected, textbook
case for a B-tree on a range-filtered column.

## 2. Hash index on `raw_material.material_id` (point lookup)

Query: `SELECT * FROM raw_material WHERE material_id = 75001` (1 row out of 50,005).

**Important framing note:** `material_id` is the table's `PRIMARY KEY`,
which PostgreSQL already backs with an implicit unique B-tree
(`raw_material_pkey`). There is no "no index" baseline for this column —
the real comparison is *existing PK B-tree* vs. *additional hash index*,
and that's what was actually measured.

**Correction note:** an earlier attempt at this measurement was invalidated
mid-session — an experimental `DROP INDEX` issued while probing planner
GUCs accidentally removed the hash index before the "after" trials ran, so
those numbers were silently measuring the B-tree-only case a second time.
That mistake was caught by re-checking `\di` before writing this document,
and the entire hash-index measurement below was redone cleanly, with the
hash index confirmed present via `\di` immediately beforehand. Numbers below
are the corrected, verified run.

### Before hash index (PK B-tree only) — 5 runs, `material_id = 75001`

```
Execution Time: 0.298 ms
Execution Time: 0.163 ms
Execution Time: 0.177 ms
Execution Time: 0.225 ms
Execution Time: 0.183 ms
```
Plan: `Index Scan using raw_material_pkey` on every run. Average ≈ 0.209ms, median ≈ 0.183ms.

### After `CREATE INDEX idx_raw_material_material_id_hash ... USING hash (material_id)` — 5 runs, same key

```
Execution Time: 0.261 ms
Execution Time: 0.409 ms
Execution Time: 0.475 ms
Execution Time: 0.410 ms
Execution Time: 0.225 ms
```
Plan: `Index Scan using idx_raw_material_material_id_hash` on every run (planner consistently preferred it once available). Average ≈ 0.356ms, median ≈ 0.409ms.

**Result: the hash index shows no improvement — if anything, this clean run
measured it as slightly slower** (0.356ms avg vs 0.209ms avg for the
existing PK B-tree). At this scale (sub-millisecond, single-row point
lookups) the gap is small enough that it may be dominated by measurement
noise rather than a real algorithmic penalty, but there is no evidence here
of the improvement a "hash indexes are faster for equality lookups"
assumption would predict. This matches known PostgreSQL behavior: for a
simple integer-key equality lookup, a B-tree is already near-optimal, and a
hash index's theoretical O(1) advantage doesn't materialize at this scale
or query pattern. **We are not claiming hash "wins" — the honest documented
result is that it doesn't help here, per `PROJECT_CONTEXT.md` §5's
instruction not to invent a conclusion.**

## Procedure followed

1. Generated ~50k rows into both tables (`generate_data.sql`), completely
   separate from `seed.sql`'s small dev dataset.
2. Ran baseline `EXPLAIN ANALYZE` for both queries before adding the new
   indexes (`ANALYZE`'d tables first for accurate planner stats).
3. Applied `database/indexes.sql`.
4. Re-ran the identical queries, unchanged, multiple times.
5. Compared actual captured output only — no numbers in this document are
   estimated or extrapolated.
6. Removed the benchmark-only rows afterward (`database/benchmarks/teardown.sql`)
   to keep the dev database at its `seed.sql` state; the indexes themselves
   remain permanently in the schema (`database/indexes.sql`), since the
   `order_date` B-tree is genuinely useful for real report queries
   regardless of table size.

Reproducible via:
```
psql ... -f database/benchmarks/generate_data.sql
psql ... -f database/indexes.sql
psql ... -c "EXPLAIN ANALYZE <query>"
psql ... -f database/benchmarks/teardown.sql
```

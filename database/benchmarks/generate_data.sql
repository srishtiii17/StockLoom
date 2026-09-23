-- STOCKLOOM — BENCHMARK DATA GENERATION
-- Checkpoint 4. Bulk data for the indexing benchmark, kept separate from
-- database/seed.sql per ARCHITECTURE.md's "two levels of data" rule.
--
-- Deliberately does NOT insert order_item rows: that would fire
-- trg_order_item_after_insert 50,000 times against real product stock and
-- corrupt the dev dataset. This script only touches customer_order
-- (order_date has no INSERT trigger) and raw_material (no AFTER INSERT
-- trigger either -- only AFTER UPDATE OF current_stock).
--
-- Run teardown.sql afterward to remove this data once the benchmark
-- evidence has been captured.

-- ~50,000 CustomerOrder rows spread across a 2-year window, cycling
-- through the 3 seeded customers.
INSERT INTO customer_order (customer_id, order_date, status)
SELECT
    ((i % 3) + 1),
    TIMESTAMPTZ '2024-01-01' + (random() * (730 * 86400))::int * INTERVAL '1 second',
    (ARRAY['PENDING','CONFIRMED','FULFILLED','DISPATCHED','CANCELLED'])[1 + floor(random() * 5)::int]
FROM generate_series(1, 50000) AS i;

-- ~50,000 synthetic RawMaterial rows for the material_id point-lookup
-- benchmark. Named distinctly for identification/cleanup. Stock and
-- threshold set so they never appear in low-stock scans.
INSERT INTO raw_material (name, unit, reorder_threshold, current_stock)
SELECT
    'Benchmark Material ' || i,
    'kg',
    1,
    1000000
FROM generate_series(1, 50000) AS i;

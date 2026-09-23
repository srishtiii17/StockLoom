-- STOCKLOOM — INDEXES
-- Checkpoint 4. See docs/INDEXING_BENCHMARK.md for the before/after
-- EXPLAIN ANALYZE evidence behind these choices.

BEGIN;

-- B-tree on CustomerOrder.order_date: supports range queries such as
-- "orders in the last 30 days" / "orders this month".
CREATE INDEX IF NOT EXISTS idx_customer_order_order_date
    ON customer_order USING btree (order_date);

-- Hash index on RawMaterial.material_id: the documented point-lookup
-- comparison against a B-tree. Note material_id is already the table's
-- PRIMARY KEY, which PostgreSQL backs with an implicit unique B-tree
-- (raw_material_pkey) -- so this hash index is additive, and the
-- benchmark in docs/INDEXING_BENCHMARK.md compares it against that
-- existing PK B-tree honestly, rather than assuming a nonexistent
-- "no index" baseline for material_id.
CREATE INDEX IF NOT EXISTS idx_raw_material_material_id_hash
    ON raw_material USING hash (material_id);

COMMIT;

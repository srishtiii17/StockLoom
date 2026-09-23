-- STOCKLOOM — STORED FUNCTIONS
-- Checkpoint 2: on-demand/scheduled low-stock scan (ADR-008).
--
-- Complements the real-time trg_low_stock_alert trigger in triggers.sql:
-- this function can be called on demand (e.g. from a "Reports" API route)
-- to list every material currently at or below its reorder threshold,
-- independent of whether/when a crossing trigger fired.

BEGIN;

CREATE OR REPLACE FUNCTION fn_materials_below_reorder()
RETURNS TABLE (
    material_id        INTEGER,
    name                VARCHAR,
    unit                VARCHAR,
    current_stock      NUMERIC,
    reorder_threshold  NUMERIC
) AS $$
    SELECT material_id, name, unit, current_stock, reorder_threshold
    FROM raw_material
    WHERE current_stock <= reorder_threshold
    ORDER BY (current_stock - reorder_threshold) ASC;
$$ LANGUAGE sql STABLE;

COMMIT;

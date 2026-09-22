-- STOCKLOOM — REPORTING VIEWS
-- Checkpoint 4: material-consumption-per-batch report.

BEGIN;

CREATE OR REPLACE VIEW v_batch_material_consumption AS
SELECT
    pb.batch_id,
    p.product_id,
    p.name           AS product_name,
    rm.material_id,
    rm.name          AS material_name,
    bmu.quantity_used,
    rm.unit,
    pb.status        AS batch_status,
    pb.start_date,
    pb.end_date
FROM production_batch pb
JOIN product p              ON p.product_id = pb.product_id
JOIN batch_material_usage bmu ON bmu.batch_id = pb.batch_id
JOIN raw_material rm        ON rm.material_id = bmu.material_id;

COMMIT;

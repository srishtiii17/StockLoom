-- STOCKLOOM — TRIGGERS
-- Checkpoint 2: production transaction, order transaction, StockLog,
-- LowStockAlert.
--
-- Three trigger-driven mutation paths, each the single source of truth for
-- its inventory mutation (no duplicated logic in the backend):
--
--   1. order_item AFTER INSERT      -> deducts Product.current_stock,
--                                       logs ORDER_FULFILLMENT.
--   2. production_batch AFTER UPDATE -> (on transition to COMPLETED)
--                                       deducts RawMaterial.current_stock
--                                       per BatchMaterialUsage, logs
--                                       PRODUCTION_CONSUMPTION, increments
--                                       Product.current_stock, logs
--                                       PRODUCTION_OUTPUT.
--   3. raw_material AFTER UPDATE     -> on a crossing of reorder_threshold,
--                                       inserts a LowStockAlert row.
--
-- Error messages are prefixed with a stable code (INSUFFICIENT_STOCK,
-- INSUFFICIENT_RAW_MATERIAL, BATCH_ALREADY_COMPLETED, BATCH_CANCELLED) so
-- the backend (Checkpoint 5) can map them to HTTP error codes without
-- parsing free text.

BEGIN;

-- ============================================================
-- 1. OrderItem AFTER INSERT -> Product stock deduction
-- ============================================================
CREATE OR REPLACE FUNCTION fn_order_item_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock NUMERIC(12, 2);
BEGIN
    -- Row-level lock: the critical concurrency-safe step. Two concurrent
    -- orders for the same product serialize here.
    SELECT current_stock INTO v_current_stock
    FROM product
    WHERE product_id = NEW.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: product % does not exist', NEW.product_id;
    END IF;

    IF v_current_stock < NEW.quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: product % has % in stock, % requested',
            NEW.product_id, v_current_stock, NEW.quantity;
    END IF;

    UPDATE product
    SET current_stock = current_stock - NEW.quantity
    WHERE product_id = NEW.product_id;

    INSERT INTO stock_log (product_id, change_qty, change_type, triggered_by)
    VALUES (NEW.product_id, -NEW.quantity, 'ORDER_FULFILLMENT', 'trg_order_item_after_insert');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_item_after_insert ON order_item;
CREATE TRIGGER trg_order_item_after_insert
    AFTER INSERT ON order_item
    FOR EACH ROW
    EXECUTE FUNCTION fn_order_item_stock_deduction();

-- ============================================================
-- 2. ProductionBatch AFTER UPDATE -> completion consumption/output
-- ============================================================
CREATE OR REPLACE FUNCTION fn_production_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_usage RECORD;
    v_current_stock NUMERIC(12, 2);
BEGIN
    IF OLD.status = 'COMPLETED' THEN
        RAISE EXCEPTION 'BATCH_ALREADY_COMPLETED: batch % is already completed', OLD.batch_id;
    END IF;

    IF OLD.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'BATCH_CANCELLED: batch % is cancelled and cannot be completed', OLD.batch_id;
    END IF;

    IF NEW.quantity_produced <= 0 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY_PRODUCED: batch % completion requires quantity_produced > 0', NEW.batch_id;
    END IF;

    -- Deterministic lock order (ascending material_id) across all rows
    -- consumed by this batch, to avoid deadlocking against a concurrent
    -- batch completion that touches an overlapping set of materials.
    FOR v_usage IN
        SELECT material_id, quantity_used
        FROM batch_material_usage
        WHERE batch_id = NEW.batch_id
        ORDER BY material_id
    LOOP
        SELECT current_stock INTO v_current_stock
        FROM raw_material
        WHERE material_id = v_usage.material_id
        FOR UPDATE;

        IF v_current_stock < v_usage.quantity_used THEN
            RAISE EXCEPTION 'INSUFFICIENT_RAW_MATERIAL: material % has % in stock, % required for batch %',
                v_usage.material_id, v_current_stock, v_usage.quantity_used, NEW.batch_id;
        END IF;

        UPDATE raw_material
        SET current_stock = current_stock - v_usage.quantity_used
        WHERE material_id = v_usage.material_id;

        INSERT INTO stock_log (material_id, change_qty, change_type, triggered_by)
        VALUES (v_usage.material_id, -v_usage.quantity_used, 'PRODUCTION_CONSUMPTION', 'trg_production_batch_completion');
    END LOOP;

    UPDATE product
    SET current_stock = current_stock + NEW.quantity_produced
    WHERE product_id = NEW.product_id;

    INSERT INTO stock_log (product_id, change_qty, change_type, triggered_by)
    VALUES (NEW.product_id, NEW.quantity_produced, 'PRODUCTION_OUTPUT', 'trg_production_batch_completion');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_batch_completion ON production_batch;
CREATE TRIGGER trg_production_batch_completion
    AFTER UPDATE OF status ON production_batch
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION fn_production_batch_completion();

-- ============================================================
-- 3. RawMaterial AFTER UPDATE -> low-stock alert on threshold crossing
--    (ADR-008: real-time trigger, complementing the on-demand function
--    fn_materials_below_reorder in functions.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock <= NEW.reorder_threshold
       AND OLD.current_stock > OLD.reorder_threshold THEN
        INSERT INTO low_stock_alert (material_id, current_stock_at_alert, reorder_threshold_at_alert)
        VALUES (NEW.material_id, NEW.current_stock, NEW.reorder_threshold);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_low_stock_alert ON raw_material;
CREATE TRIGGER trg_low_stock_alert
    AFTER UPDATE OF current_stock ON raw_material
    FOR EACH ROW
    EXECUTE FUNCTION fn_low_stock_alert();

COMMIT;

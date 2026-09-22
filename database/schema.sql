-- STOCKLOOM — CORE SCHEMA
-- Checkpoint 1: database foundation.
--
-- Reflects ARCHITECTURE_DECISIONS.md ADR-006 through ADR-009 and
-- docs/ER_MODEL_PROPOSAL.md. Run against a fresh "stockloom" database.
--
-- Design notes worth remembering during the viva:
--   * Product.current_stock is finished-goods inventory (ADR-006). It is
--     NOT in the original project documentation's entity table — it was
--     added to resolve a genuine gap: OrderItem references Product, but
--     the source docs never defined a stock field for Product, and the
--     only stock field (RawMaterial.current_stock) can't be decremented at
--     order time without double-counting the deduction already made at
--     batch completion.
--   * RawMaterial.current_stock is only ever touched by production
--     (batch completion), never directly by order placement.
--   * StockLog is dual-target: exactly one of material_id / product_id is
--     set per row (ADR-007), enforced by CHECK, not just convention.
--   * LowStockAlert is a persisted table (not just a NOTIFY) so the
--     trigger-driven low-stock behavior is demonstrable/queryable.

BEGIN;

-- ============================================================
-- 1. Supplier
-- ============================================================
CREATE TABLE supplier (
    supplier_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    contact_info    VARCHAR(300),
    lead_time_days  INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0)
);

-- ============================================================
-- 2. RawMaterial
-- ============================================================
CREATE TABLE raw_material (
    material_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    unit                VARCHAR(50)  NOT NULL,
    reorder_threshold  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
    current_stock      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0)
);

-- ============================================================
-- 3. SupplierMaterial (junction: Supplier <-> RawMaterial)
-- ============================================================
CREATE TABLE supplier_material (
    supplier_id  INTEGER NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    material_id  INTEGER NOT NULL REFERENCES raw_material(material_id) ON DELETE CASCADE,
    unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (supplier_id, material_id)
);

-- ============================================================
-- 4. Product
-- ============================================================
CREATE TABLE product (
    product_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    unit_price     NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    category        VARCHAR(100),
    -- ADR-006: finished-goods inventory, not in the original documented
    -- entity table.
    current_stock  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0)
);

-- ============================================================
-- 5. ProductionBatch
-- ============================================================
CREATE TABLE production_batch (
    batch_id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id         INTEGER NOT NULL REFERENCES product(product_id) ON DELETE RESTRICT,
    start_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date           DATE,
    quantity_produced  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
    status             VARCHAR(20) NOT NULL DEFAULT 'PLANNED'
                        CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- 6. BatchMaterialUsage (junction: ProductionBatch <-> RawMaterial)
-- ============================================================
CREATE TABLE batch_material_usage (
    batch_id       INTEGER NOT NULL REFERENCES production_batch(batch_id) ON DELETE CASCADE,
    material_id    INTEGER NOT NULL REFERENCES raw_material(material_id) ON DELETE RESTRICT,
    quantity_used  NUMERIC(12, 2) NOT NULL CHECK (quantity_used > 0),
    PRIMARY KEY (batch_id, material_id)
);

-- ============================================================
-- 7. Customer
-- ============================================================
CREATE TABLE customer (
    customer_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    contact_info  VARCHAR(300),
    address        VARCHAR(300)
);

-- ============================================================
-- 8. CustomerOrder
-- ============================================================
CREATE TABLE customer_order (
    order_id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customer(customer_id) ON DELETE RESTRICT,
    order_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'CONFIRMED', 'FULFILLED', 'DISPATCHED', 'CANCELLED'))
);

-- ============================================================
-- 9. OrderItem (junction: CustomerOrder <-> Product)
-- ============================================================
CREATE TABLE order_item (
    order_id    INTEGER NOT NULL REFERENCES customer_order(order_id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES product(product_id) ON DELETE RESTRICT,
    quantity    NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    -- Price captured at order time; deliberately independent of the
    -- (mutable) product.unit_price so historical orders keep their price.
    unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (order_id, product_id)
);

-- ============================================================
-- 10. Dispatch (1:1 with CustomerOrder)
-- ============================================================
CREATE TABLE dispatch (
    dispatch_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id       INTEGER NOT NULL UNIQUE REFERENCES customer_order(order_id) ON DELETE RESTRICT,
    dispatch_date  TIMESTAMPTZ,
    carrier         VARCHAR(100),
    tracking_ref   VARCHAR(150)
);

-- ============================================================
-- 11. StockLog (dual-target audit table; ADR-007)
-- ============================================================
CREATE TABLE stock_log (
    log_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_id   INTEGER REFERENCES raw_material(material_id) ON DELETE RESTRICT,
    product_id    INTEGER REFERENCES product(product_id) ON DELETE RESTRICT,
    change_qty    NUMERIC(12, 2) NOT NULL,
    change_type   VARCHAR(30) NOT NULL
                  CHECK (change_type IN (
                      'PRODUCTION_CONSUMPTION',
                      'PRODUCTION_OUTPUT',
                      'ORDER_FULFILLMENT',
                      'MANUAL_ADJUSTMENT'
                  )),
    "timestamp"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    triggered_by  VARCHAR(100),
    CHECK (
        (material_id IS NOT NULL AND product_id IS NULL)
        OR (material_id IS NULL AND product_id IS NOT NULL)
    )
);

-- ============================================================
-- 12. LowStockAlert (persisted, trigger-populated; ADR-008)
-- ============================================================
CREATE TABLE low_stock_alert (
    alert_id                     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_id                  INTEGER NOT NULL REFERENCES raw_material(material_id) ON DELETE CASCADE,
    current_stock_at_alert       NUMERIC(12, 2) NOT NULL,
    reorder_threshold_at_alert   NUMERIC(12, 2) NOT NULL,
    triggered_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;

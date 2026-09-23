-- STOCKLOOM — DEVELOPMENT SEED DATA
-- Checkpoint 1: small, deterministic dataset covering every entity and
-- relationship, for manual testing and Checkpoint 2 transaction tests.
-- Run after schema.sql, against an otherwise-empty "stockloom" database.

BEGIN;

-- ============================================================
-- Suppliers
-- ============================================================
INSERT INTO supplier (name, contact_info, lead_time_days) VALUES
    ('SteelCo Industrial',   'sales@steelco.example',   7),
    ('PolyPlast Materials',  'orders@polyplast.example', 5),
    ('FastenAll Supply',     'contact@fastenall.example', 3);

-- ============================================================
-- Raw materials
-- Note: 'Rubber Gasket' is seeded close to its reorder threshold on
-- purpose, so low-stock detection (Checkpoint 2) has something to find
-- without needing a separate transaction first.
-- ============================================================
INSERT INTO raw_material (name, unit, reorder_threshold, current_stock) VALUES
    ('Steel Sheet',    'kg',  200, 1500),
    ('Plastic Resin',  'kg',  150, 900),
    ('Bolt M6',        'pcs', 500, 4000),
    ('Rubber Gasket',  'pcs', 300, 320),
    ('Paint - Grey',   'l',   50,  400);

-- ============================================================
-- SupplierMaterial (M:N, pricing)
-- ============================================================
INSERT INTO supplier_material (supplier_id, material_id, unit_price) VALUES
    (1, 1, 4.50),   -- SteelCo -> Steel Sheet
    (1, 3, 0.15),   -- SteelCo -> Bolt M6
    (2, 2, 3.20),   -- PolyPlast -> Plastic Resin
    (2, 4, 0.80),   -- PolyPlast -> Rubber Gasket
    (3, 3, 0.12),   -- FastenAll -> Bolt M6 (alternate supplier, different price)
    (3, 5, 12.00);  -- FastenAll -> Paint - Grey

-- ============================================================
-- Products
-- ============================================================
INSERT INTO product (name, unit_price, category, current_stock) VALUES
    ('Widget A - Standard', 49.99, 'Widgets', 120),
    ('Widget B - Heavy Duty', 89.99, 'Widgets', 40),
    ('Bracket C - Universal', 19.99, 'Brackets', 0);

-- ============================================================
-- Production batches
-- Batch 1 & 2 are COMPLETED (their material usage is recorded below and
-- their output is already reflected in product.current_stock above).
-- Batch 3 is IN_PROGRESS (no usage/output yet — exercised in Checkpoint 2).
-- ============================================================
INSERT INTO production_batch (product_id, start_date, end_date, quantity_produced, status) VALUES
    (1, DATE '2026-08-01', DATE '2026-08-03', 120, 'COMPLETED'),
    (2, DATE '2026-08-05', DATE '2026-08-07', 40,  'COMPLETED'),
    (3, DATE '2026-09-20', NULL,              0,   'IN_PROGRESS');

-- ============================================================
-- BatchMaterialUsage (M:N, actual consumption per completed batch)
-- ============================================================
INSERT INTO batch_material_usage (batch_id, material_id, quantity_used) VALUES
    (1, 1, 240),   -- Widget A batch used Steel Sheet
    (1, 3, 480),   -- Widget A batch used Bolt M6
    (2, 2, 160),   -- Widget B batch used Plastic Resin
    (2, 4, 80);    -- Widget B batch used Rubber Gasket

-- ============================================================
-- Customers
-- ============================================================
INSERT INTO customer (name, contact_info, address) VALUES
    ('Acme Manufacturing',   'purchasing@acme.example',   '12 Industrial Rd, Pune'),
    ('Bright Retail Group',  'orders@brightretail.example','88 Market St, Mumbai'),
    ('Coastal Distributors', 'procure@coastal.example',   '5 Harbor Ave, Chennai');

-- ============================================================
-- Customer orders
-- ============================================================
INSERT INTO customer_order (customer_id, order_date, status) VALUES
    (1, TIMESTAMPTZ '2026-09-10 10:00:00+05:30', 'DISPATCHED'),
    (2, TIMESTAMPTZ '2026-09-15 14:30:00+05:30', 'FULFILLED'),
    (3, TIMESTAMPTZ '2026-09-20 09:15:00+05:30', 'PENDING');

-- ============================================================
-- Order items
-- ============================================================
INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 10, 49.99),
    (2, 2, 5,  89.99),
    (3, 1, 20, 49.99);

-- ============================================================
-- Dispatch (1:1 with CustomerOrder; only for orders that shipped)
-- ============================================================
INSERT INTO dispatch (order_id, dispatch_date, carrier, tracking_ref) VALUES
    (1, TIMESTAMPTZ '2026-09-11 08:00:00+05:30', 'BlueDart', 'BD-2026-000123');

-- stock_log and low_stock_alert are intentionally left empty here — they
-- are trigger-populated by actual mutations (Checkpoint 2), not backfilled
-- as part of the initial seed state.

COMMIT;

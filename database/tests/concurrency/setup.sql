-- Concurrency proof setup: a dedicated, disposable test product with a
-- known starting stock. Safe to run against the seeded dev database —
-- creates one product row and one throwaway customer_order/order_item per
-- session when the test is run. Run teardown.sql afterward to remove them.
INSERT INTO product (name, unit_price, category, current_stock)
VALUES ('Concurrency Test Widget', 9.99, 'Test', 100)
RETURNING product_id, current_stock;

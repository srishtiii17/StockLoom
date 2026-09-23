-- Concurrency proof — Session B: requests 60 units, started ~0.5s after
-- Session A. Expected to block on the row lock, then correctly see the
-- post-Session-A stock (30) and be rejected with INSUFFICIENT_STOCK,
-- rolling back its own order/order_item entirely.
--
-- Usage: psql -U stockloom_app -h localhost -d stockloom \
--          -v product_id=<id from setup.sql> -v customer_id=1 \
--          -f session_b.sql
\timing on
BEGIN;
INSERT INTO customer_order (customer_id, status) VALUES (:customer_id, 'PENDING') RETURNING order_id \gset
\echo SESSION_B order_id = :order_id -- requesting quantity 60
INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES (:order_id, :product_id, 60, 9.99);
\echo SESSION_B insert statement returned
COMMIT;
\echo SESSION_B done

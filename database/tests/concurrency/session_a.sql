-- Concurrency proof — Session A: requests 70 units.
-- Deliberately holds the row lock open for 3s (pg_sleep) after deducting
-- stock, so Session B (started ~0.5s later) is forced to genuinely block
-- on SELECT ... FOR UPDATE inside trg_order_item_after_insert, rather than
-- the two statements just happening to run one after another by luck.
--
-- Usage: psql -U stockloom_app -h localhost -d stockloom \
--          -v product_id=<id from setup.sql> -v customer_id=1 \
--          -f session_a.sql
\timing on
BEGIN;
INSERT INTO customer_order (customer_id, status) VALUES (:customer_id, 'PENDING') RETURNING order_id \gset
\echo SESSION_A order_id = :order_id -- requesting quantity 70
INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES (:order_id, :product_id, 70, 9.99);
\echo SESSION_A holding open transaction for 3s (row lock held) so Session B must block
SELECT pg_sleep(3);
COMMIT;
\echo SESSION_A done

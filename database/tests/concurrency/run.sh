#!/usr/bin/env bash
# Runs the StockLoom concurrency proof: two genuinely separate PostgreSQL
# connections racing SELECT ... FOR UPDATE on the same Product row.
# Requires PGPASSWORD (or a .pgpass entry) for stockloom_app to be set in
# the environment already; does not prompt for or hardcode credentials.
#
# Usage: PGPASSWORD=... ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

PSQL="psql -U stockloom_app -h localhost -d stockloom"

PRODUCT_ID=$($PSQL -tAc "INSERT INTO product (name, unit_price, category, current_stock) VALUES ('Concurrency Test Widget', 9.99, 'Test', 100) RETURNING product_id;")
echo "Test product_id=$PRODUCT_ID, starting stock=100"

$PSQL -v product_id="$PRODUCT_ID" -v customer_id=1 -f session_a.sql > out_a.txt 2>&1 &
PID_A=$!
sleep 0.5
$PSQL -v product_id="$PRODUCT_ID" -v customer_id=1 -f session_b.sql > out_b.txt 2>&1 &
PID_B=$!
wait "$PID_A"
wait "$PID_B"

echo "=== SESSION A ==="; cat out_a.txt
echo "=== SESSION B ==="; cat out_b.txt

echo "=== FINAL STATE ==="
$PSQL -c "SELECT product_id, current_stock FROM product WHERE product_id = $PRODUCT_ID;"
$PSQL -c "SELECT order_id, product_id, quantity FROM order_item WHERE product_id = $PRODUCT_ID;"

echo "=== CLEANUP ==="
$PSQL -c "DELETE FROM stock_log WHERE product_id = $PRODUCT_ID;"
$PSQL -c "DELETE FROM order_item WHERE product_id = $PRODUCT_ID;"
$PSQL -c "DELETE FROM customer_order WHERE order_id NOT IN (SELECT order_id FROM order_item);"
$PSQL -c "DELETE FROM product WHERE product_id = $PRODUCT_ID;"
rm -f out_a.txt out_b.txt

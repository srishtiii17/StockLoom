# StockLoom — Concurrency Proof (Checkpoint 3)

## Scenario

Per `PROJECT_CONTEXT.md` §4: `Product.current_stock = 100`, two concurrent
order requests for 70 and 60 units. The system must guarantee that both
cannot succeed (that would oversell 30 units past available stock), without
an application-level check being the source of truth (`ADR-003`).

## Method

Two **genuinely separate PostgreSQL connections** (`database/tests/concurrency/session_a.sql`
and `session_b.sql`, run via `run.sh`), each its own `psql` process:

- **Session A** requests 70 units, then deliberately holds its transaction
  open for 3 seconds (`pg_sleep(3)`) after the deduction, before committing.
  This forces genuine lock contention rather than relying on lucky
  scheduling.
- **Session B** starts ~0.5s after A and requests 60 units.

Both go through the same path as any other order: `INSERT INTO order_item`
fires `trg_order_item_after_insert`, which does
`SELECT current_stock FROM product WHERE product_id = ... FOR UPDATE`,
validates, deducts, and logs — see `database/triggers.sql`.

## Actual result (executed run, not simulated)

Test product: `product_id=4`, starting `current_stock=100`.

```
start: 22:20:58.685619400
=== SESSION A output ===
Timing is on.
BEGIN
Time: 0.329 ms
INSERT 0 1
Time: 10.482 ms
SESSION_A order_id = 4 -- requesting quantity 70
INSERT 0 1
Time: 17.671 ms
SESSION_A holding open transaction for 3s (row lock held) so Session B must block
 pg_sleep
----------

(1 row)

Time: 3007.193 ms (00:03.007)
COMMIT
Time: 4.227 ms
SESSION_A done

real    0m3.383s

=== SESSION B output ===
Timing is on.
BEGIN
Time: 0.215 ms
INSERT 0 1
Time: 6.454 ms
SESSION_B order_id = 5 -- requesting quantity 60
psql:.../session_b.sql:5: ERROR:  INSUFFICIENT_STOCK: product 4 has 30.00 in stock, 60.00 requested
CONTEXT:  PL/pgSQL function fn_order_item_stock_deduction() line 17 at RAISE
Time: 2360.793 ms (00:02.361)
SESSION_B insert statement returned
ROLLBACK
Time: 0.513 ms
SESSION_B done

real    0m2.653s
end: 22:21:02.212700400
```

**The 2360.793 ms taken by Session B's `INSERT` is the proof of real lock
contention**, not just sequential luck: Session B's statement sat blocked
on the row lock for ~2.4s (roughly matching the time remaining in Session
A's 3s hold, after B's 0.5s staggered start) before it could even attempt
its stock check — at which point it correctly saw the *post-A* value of 30,
not the stale value of 100 it would have seen if it had read before A
committed.

### Post-test verification queries

```
--final product stock (expect 30 = 100 - 70)--
 product_id |          name           | current_stock
------------+-------------------------+---------------
          4 | Concurrency Test Widget |         30.00

--order_item rows for the two test orders (expect only order 4's row)--
 order_id | product_id | quantity
----------+------------+----------
        4 |          4 |    70.00

--stock_log for this product (expect exactly one ORDER_FULFILLMENT row, -70)--
 log_id | product_id | change_qty |    change_type
--------+------------+------------+-------------------
      1 |          4 |     -70.00 | ORDER_FULFILLMENT

--customer_order rows for both attempts (order 5's header also rolled back)--
 order_id | status
----------+---------
        4 | PENDING
```

## Conclusion

| Requirement | Result |
|---|---|
| Exactly one of the two concurrent orders succeeds | **PASS** — order 4 (70 units) succeeded, order 5 (60 units) rejected |
| Final stock = 30 | **PASS** |
| No negative stock at any point | **PASS** (also structurally guaranteed by the `CHECK (current_stock >= 0)` constraint) |
| No overselling | **PASS** |
| Failed transaction leaves no orphaned records | **PASS** — order 5's `customer_order` header row was also rolled back, not just its `order_item`, because both inserts were in the same client transaction |
| Real, separate PostgreSQL connections used | **PASS** — two independent `psql` processes, not sequential function calls |

Reproducible via `database/tests/concurrency/run.sh` against any StockLoom
dev database with the `stockloom_app` role configured.

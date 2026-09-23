const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT co.order_id, co.customer_id, c.name AS customer_name, co.order_date, co.status
     FROM customer_order co
     JOIN customer c ON c.customer_id = co.customer_id
     ORDER BY co.order_id DESC`
  );
  res.json({ data: result.rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const orderResult = await pool.query(
    `SELECT order_id, customer_id, order_date, status FROM customer_order WHERE order_id = $1`,
    [id]
  );
  if (orderResult.rows.length === 0) {
    return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: `Order ${id} not found` } });
  }
  const itemsResult = await pool.query(
    `SELECT oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price
     FROM order_item oi JOIN product p ON p.product_id = oi.product_id
     WHERE oi.order_id = $1`,
    [id]
  );
  res.json({ data: { ...orderResult.rows[0], items: itemsResult.rows } });
}));

// Order placement: BEGIN -> insert order header -> insert each order_item
// (each INSERT fires trg_order_item_after_insert, which locks the Product
// row with SELECT ... FOR UPDATE, validates, deducts, and logs) -> COMMIT.
// Any failure (insufficient stock, unknown product) throws from inside the
// transaction and is rolled back in full, including the order header --
// see docs/CONCURRENCY_PROOF.md for the verified no-orphan-records proof.
router.post('/', asyncHandler(async (req, res) => {
  const { customer_id, items } = req.body;
  if (!customer_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'customer_id and a non-empty items array are required' },
    });
  }

  // Insert items in ascending product_id order so concurrent multi-item
  // orders acquire Product row locks in a consistent order, avoiding
  // deadlocks between two orders that overlap on the same products.
  const sortedItems = [...items].sort((a, b) => a.product_id - b.product_id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `INSERT INTO customer_order (customer_id, status) VALUES ($1, 'PENDING')
       RETURNING order_id, customer_id, order_date, status`,
      [customer_id]
    );
    const order = orderResult.rows[0];

    for (const item of sortedItems) {
      await client.query(
        `INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [order.order_id, item.product_id, item.quantity, item.unit_price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ data: { ...order, items: sortedItems } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;

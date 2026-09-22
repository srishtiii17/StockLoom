const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT dispatch_id, order_id, dispatch_date, carrier, tracking_ref FROM dispatch ORDER BY dispatch_id DESC`
  );
  res.json({ data: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { order_id, dispatch_date, carrier, tracking_ref } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'order_id is required' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO dispatch (order_id, dispatch_date, carrier, tracking_ref)
       VALUES ($1, COALESCE($2, now()), $3, $4)
       RETURNING dispatch_id, order_id, dispatch_date, carrier, tracking_ref`,
      [order_id, dispatch_date ?? null, carrier ?? null, tracking_ref ?? null]
    );
    await client.query(`UPDATE customer_order SET status = 'DISPATCHED' WHERE order_id = $1`, [order_id]);
    await client.query('COMMIT');
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;

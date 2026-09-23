const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT product_id, name, unit_price, category, current_stock FROM product ORDER BY product_id'
  );
  res.json({ data: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, unit_price, category, current_stock } = req.body;
  if (!name || unit_price === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and unit_price are required' } });
  }
  const result = await pool.query(
    `INSERT INTO product (name, unit_price, category, current_stock)
     VALUES ($1, $2, $3, COALESCE($4, 0))
     RETURNING product_id, name, unit_price, category, current_stock`,
    [name, unit_price, category ?? null, current_stock ?? null]
  );
  res.status(201).json({ data: result.rows[0] });
}));

module.exports = router;

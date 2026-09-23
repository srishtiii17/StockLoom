const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT customer_id, name, contact_info, address FROM customer ORDER BY customer_id'
  );
  res.json({ data: result.rows });
}));

module.exports = router;

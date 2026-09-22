const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT supplier_id, name, contact_info, lead_time_days FROM supplier ORDER BY supplier_id'
  );
  res.json({ data: result.rows });
}));

module.exports = router;

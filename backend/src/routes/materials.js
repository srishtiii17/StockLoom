const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT material_id, name, unit, reorder_threshold, current_stock FROM raw_material ORDER BY material_id'
  );
  res.json({ data: result.rows });
}));

module.exports = router;

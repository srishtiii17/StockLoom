const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/low-stock', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM fn_materials_below_reorder()');
  res.json({ data: result.rows });
}));

router.get('/material-consumption', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM v_batch_material_consumption ORDER BY batch_id, material_id');
  res.json({ data: result.rows });
}));

module.exports = router;

const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Consolidated stock overview across both inventory types (ADR-006:
// RawMaterial and Product each carry their own current_stock).
router.get('/', asyncHandler(async (req, res) => {
  const [materials, products] = await Promise.all([
    pool.query('SELECT material_id, name, unit, reorder_threshold, current_stock FROM raw_material ORDER BY material_id'),
    pool.query('SELECT product_id, name, category, current_stock FROM product ORDER BY product_id'),
  ]);
  res.json({ data: { rawMaterials: materials.rows, products: products.rows } });
}));

module.exports = router;

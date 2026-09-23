const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
  const result = await pool.query(
    `SELECT sl.log_id, sl.material_id, rm.name AS material_name, sl.product_id, p.name AS product_name,
            sl.change_qty, sl.change_type, sl.timestamp, sl.triggered_by
     FROM stock_log sl
     LEFT JOIN raw_material rm ON rm.material_id = sl.material_id
     LEFT JOIN product p ON p.product_id = sl.product_id
     ORDER BY sl.log_id DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ data: result.rows });
}));

module.exports = router;

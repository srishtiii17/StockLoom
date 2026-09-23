const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT pb.batch_id, pb.product_id, p.name AS product_name, pb.start_date, pb.end_date,
            pb.quantity_produced, pb.status
     FROM production_batch pb
     JOIN product p ON p.product_id = pb.product_id
     ORDER BY pb.batch_id DESC`
  );
  res.json({ data: result.rows });
}));

// Creates a batch (status PLANNED) and its planned material usage rows.
// This does NOT deduct stock -- that only happens on completion (below),
// which is where trg_production_batch_completion lives.
router.post('/', asyncHandler(async (req, res) => {
  const { product_id, start_date, materials } = req.body;
  if (!product_id) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'product_id is required' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const batchResult = await client.query(
      `INSERT INTO production_batch (product_id, start_date, status)
       VALUES ($1, COALESCE($2, CURRENT_DATE), 'PLANNED')
       RETURNING batch_id, product_id, start_date, end_date, quantity_produced, status`,
      [product_id, start_date ?? null]
    );
    const batch = batchResult.rows[0];

    if (Array.isArray(materials)) {
      for (const m of materials) {
        await client.query(
          `INSERT INTO batch_material_usage (batch_id, material_id, quantity_used) VALUES ($1, $2, $3)`,
          [batch.batch_id, m.material_id, m.quantity_used]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ data: batch });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// Marks a batch COMPLETED. trg_production_batch_completion (a single
// statement, already transactionally atomic) does the real work: locks and
// deducts RawMaterial per BatchMaterialUsage, logs PRODUCTION_CONSUMPTION,
// increments Product.current_stock, logs PRODUCTION_OUTPUT. Rejects double
// completion / completing a cancelled batch / non-positive quantity.
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity_produced } = req.body;
  if (quantity_produced === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'quantity_produced is required' } });
  }
  const result = await pool.query(
    `UPDATE production_batch
     SET status = 'COMPLETED', quantity_produced = $2, end_date = CURRENT_DATE
     WHERE batch_id = $1
     RETURNING batch_id, product_id, status, quantity_produced, end_date`,
    [id, quantity_produced]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: { code: 'BATCH_NOT_FOUND', message: `Batch ${id} not found` } });
  }
  res.json({ data: result.rows[0] });
}));

module.exports = router;

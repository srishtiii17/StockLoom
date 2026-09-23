// Maps the CODE-prefixed RAISE EXCEPTION messages from database/triggers.sql
// (e.g. "INSUFFICIENT_STOCK: product 2 has 40.00 in stock, ...") and known
// PostgreSQL error codes to structured HTTP error responses, so the DB
// transaction stays the single source of truth for these rules (per
// ARCHITECTURE_DECISIONS.md ADR-003/ADR-004) instead of being duplicated in
// application code.

const TRIGGER_ERROR_STATUS = {
  INSUFFICIENT_STOCK: 409,
  INSUFFICIENT_RAW_MATERIAL: 409,
  BATCH_ALREADY_COMPLETED: 409,
  BATCH_CANCELLED: 409,
  PRODUCT_NOT_FOUND: 404,
  INVALID_QUANTITY_PRODUCED: 400,
};

const PG_ERROR_STATUS = {
  '23503': { status: 400, code: 'FOREIGN_KEY_VIOLATION' }, // referenced row doesn't exist
  '23505': { status: 409, code: 'UNIQUE_VIOLATION' },       // duplicate (e.g. second dispatch for an order)
  '23514': { status: 400, code: 'CHECK_VIOLATION' },        // e.g. negative quantity, bad status value
  '22P02': { status: 400, code: 'INVALID_INPUT' },          // malformed input syntax
};

function parseDbError(err) {
  const match = /^([A-Z_]+):\s*(.*)$/s.exec(err.message || '');
  if (match && TRIGGER_ERROR_STATUS[match[1]] !== undefined) {
    return { status: TRIGGER_ERROR_STATUS[match[1]], code: match[1], message: match[2] };
  }
  const pgMapping = PG_ERROR_STATUS[err.code];
  if (pgMapping) {
    return { status: pgMapping.status, code: pgMapping.code, message: err.detail || err.message };
  }
  return null;
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const parsed = parseDbError(err);
  if (parsed) {
    return res.status(parsed.status).json({ error: { code: parsed.code, message: parsed.message } });
  }
  if (err.status) {
    return res.status(err.status).json({ error: { code: err.code || 'BAD_REQUEST', message: err.message } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

module.exports = { errorHandler, parseDbError };

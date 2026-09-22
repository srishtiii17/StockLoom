/**
 * Helper to safely convert PostgreSQL NUMERIC string values to JS Numbers.
 */
export function parseNum(val, fallback = 0) {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return Number.isNaN(num) ? fallback : num;
}

/**
 * Format a number/numeric string as currency ($1,234.56).
 */
export function formatCurrency(val) {
  const num = parseNum(val);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a quantity with optional unit (e.g. 150.00 meters).
 */
export function formatQty(val, unit = '', decimals = 2) {
  const num = parseNum(val);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format date string (YYYY-MM-DD or ISO).
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format full date and time string.
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function appError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function required(body, fields) {
  const missing = fields.filter((field) => !String(body?.[field] ?? '').trim());
  if (missing.length) throw appError(`Missing required field: ${missing.join(', ')}`, 400);
}

export function clean(value) {
  return String(value ?? '').trim();
}

export function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

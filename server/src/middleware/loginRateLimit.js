const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function rateLimitKey(req) {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const role = String(req.body?.role || '').trim().toLowerCase();
  return `${req.ip || 'unknown'}:${username}:${role}`;
}

export function loginRateLimit(req, res, next) {
  const now = Date.now();
  const key = rateLimitKey(req);
  const record = attempts.get(key);

  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
  }

  record.count += 1;
  attempts.set(key, record);
  return next();
}

export function clearLoginRateLimit(req) {
  attempts.delete(rateLimitKey(req));
}

export const loginRateLimitConfig = {
  windowMs: WINDOW_MS,
  maxAttempts: MAX_ATTEMPTS
};

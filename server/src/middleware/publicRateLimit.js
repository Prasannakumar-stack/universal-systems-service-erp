const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 8;
const buckets = new Map();

function clientKey(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  return `${req.method}:${req.path}:${ip}`;
}

function prune(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function publicSubmitRateLimit(req, res, next) {
  const now = Date.now();
  if (buckets.size > 500) prune(now);

  const key = clientKey(req);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > MAX_SUBMISSIONS) {
    return res.status(429).json({
      message: 'Too many requests. Please try again later or contact us on WhatsApp.'
    });
  }

  return next();
}

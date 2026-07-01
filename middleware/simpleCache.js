// Lightweight in-process TTL cache — zero external deps, single-process only.
// Not suitable for multi-process (cluster) setups, but perfect for our 1-worker PM2 config.
const _cache = new Map();

export function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlSeconds) {
  _cache.set(key, { value: value, expiresAt: Date.now() + (ttlSeconds * 1000) });
}

export function cacheDeletePrefix(prefix) {
  _cache.forEach(function(_, key) {
    if (key.indexOf(prefix) === 0) {
      _cache.delete(key);
    }
  });
}

// Express middleware factory — caches 200 responses; cache misses pass through.
// keyFn(req) must return a stable string unique to the response contents.
export function withCache(ttlSeconds, keyFn) {
  return function cacheMiddleware(req, res, next) {
    var key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
    var cached = cacheGet(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
    res.setHeader('X-Cache', 'MISS');
    var originalJson = res.json.bind(res);
    res.json = function(body) {
      if (res.statusCode === 200) {
        cacheSet(key, body, ttlSeconds);
      }
      return originalJson(body);
    };
    next();
  };
}

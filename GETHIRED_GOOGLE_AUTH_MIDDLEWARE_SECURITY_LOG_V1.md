# GETHIRED_GOOGLE_AUTH_MIDDLEWARE_SECURITY_LOG_V1

## Existing Middleware — Unchanged

### verifyAuth.js
- Calls `firebaseAdmin.auth().verifyIdToken(token)`
- Token source: `Authorization: Bearer {token}` header
- Used for all authenticated routes (employer, applicant, admin panels)
- NOT modified for this feature — Google auth produces the same Firebase ID token, so all authenticated routes work identically for Google-authed users

---

## New Security Controls in googleAuthController.js

### IP Rate Limiter
```js
const ipRateCounts = {};
const IP_RATE_LIMIT = 10;
const IP_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkIpRateLimit(req, res) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  if (!ipRateCounts[ip] || (now - ipRateCounts[ip].resetAt) > IP_RATE_WINDOW_MS) {
    ipRateCounts[ip] = { count: 0, resetAt: now };
  }
  ipRateCounts[ip].count++;
  if (ipRateCounts[ip].count > IP_RATE_LIMIT) {
    res.status(429).json({ message: 'Too many requests. Please try again later.' });
    return false;
  }
  return true;
}
```

Applied to: `googleFirebaseSession` only (the public-facing endpoint).

Limitation: In-memory. Does not survive server restart. Does not scale across multiple instances. Suitable for single-instance deployment (current Linode setup).

### returnUrl Sanitizer
```js
function sanitizeReturnUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  return url;
}
```

Blocks:
- External URLs (`https://evil.com/...`)
- Protocol-relative URLs (`//evil.com/...`)
- Non-string values

### Token Validation
- `googleIdToken` must be present and `> 200 chars` (basic format check before Firebase call)
- Firebase REST validates the actual JWT signature and expiry
- `verifyIdToken()` validates Firebase's own token

### email_verified Check
```js
if (!decoded.email_verified) {
  return res.status(401).json({ message: 'Google account email is not verified.' });
}
```

### Error Logging
- Google tokens are NEVER logged: only `[token present]` placeholder used in any debug logging
- User emails logged at info level (same as existing auth logging)

---

## Security Properties of `chooseRole`

- `firebaseIdToken` re-verified (independent `verifyIdToken()` call)
- `selectedRole` validated to 'job_seeker' or 'employer' only
- `email`, `uid` taken from verified token, never from request body
- Duplicate prevention: application-level + database-level guard
- Sensitive fields (`company_id`, `price`, `plan`) never in scope for this endpoint

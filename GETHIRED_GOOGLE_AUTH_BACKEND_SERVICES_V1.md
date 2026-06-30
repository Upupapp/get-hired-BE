# GETHIRED_GOOGLE_AUTH_BACKEND_SERVICES_V1

## Files Created / Modified

### controllers/googleAuthController.js (NEW)

**Exports:**
- `googleFirebaseSession(req, res)` — main exchange endpoint
- `chooseRole(req, res)` — role classification completion

**Internal helpers:**
- `exchangeGoogleTokenForFirebase(googleIdToken)` — axios POST to `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key={apiKey}` with `id_token={googleIdToken}&providerId=google.com&requestUri=https://get-hired-363107.firebaseapp.com&returnSecureToken=true`
- `buildSessionResponse(uid, email, role)` — async, returns same shape as `loginUser` (user record, company, subscription, token)
- `sanitizeReturnUrl(url)` — blocks `//evil.com` open-redirect; only allows internal paths starting with `/`

**Rate limiting:**
- In-memory `ipRateCounts = {}` map; key = `req.ip`
- Limit: 10 requests per 15 minutes per IP
- Resets automatically after TTL

**Node 14 compliance:**
- No optional chaining (`?.`)
- No nullish coalescing (`??`)
- All property access guarded with `&&` chains or explicit checks

---

### routes/googleAuthRoutes.js (NEW)

```js
import express from 'express';
import { googleFirebaseSession, chooseRole } from '../controllers/googleAuthController';

const router = express.Router();
router.post('/auth/google/firebase-session', googleFirebaseSession);
router.post('/auth/choose-role', chooseRole);
export default router;
```

---

### server.js (MODIFIED)

Added after existing route mounts:
```js
import googleAuthRoutes from "./routes/googleAuthRoutes";
app.use("/api", googleAuthRoutes);
```

---

## Dependencies Used

| Dependency | Already present? | Purpose |
|---|---|---|
| `axios` | YES | Firebase REST signInWithIdp call |
| `firebase-admin` | YES | `verifyIdToken()` |
| `express` | YES | Router |
| `bcrypt` (via hashPassword) | YES | Hashing `uid + '_google_provider'` as password placeholder |

No new npm packages required.

---

## Database Operations (in googleAuthController.js)

### getUserCredentialsByEmail (existing helper)
- Checks `user_credentials` table by email
- Returns null if not found (→ role_required flow)

### INSERT user_credentials (chooseRole)
```sql
INSERT INTO user_credentials (uid, email, password, role, created_date)
VALUES ($1, $2, $3, $4, NOW())
```
Password value: `bcrypt(uid + '_google_provider')` — prevents password login on Google-created accounts

### INSERT users (chooseRole)
```sql
INSERT INTO users (uid, email, firstname, lastname, photo_url, created_date)
VALUES ($1, $2, $3, $4, $5, NOW())
```

### Race condition guard
Before insert, checks `getUserCredentialsByEmail(email)` again inside `chooseRole`. If user now exists → returns 409 gracefully.

### Duplicate key error (23505)
Catches PostgreSQL unique constraint error code `23505` → returns 409 with helpful message.

# GETHIRED_GOOGLE_AUTH_API_CONTRACT_V1

## Endpoints

### POST /api/auth/google/firebase-session

**Purpose:** Exchange a Google ID token (from GIS) for a GetHired session.

**Auth:** None required (public endpoint). IP rate-limited: 10 req/IP/15 min.

**Request:**
```json
{ "googleIdToken": "<GIS credential string, >200 chars>" }
```

**Response — Existing user (authenticated):**
```json
{
  "success": true,
  "status": "authenticated",
  "data": {
    "id": "<uid>",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": 2,
    "token": "<Firebase ID token>",
    "refreshToken": "<Firebase refresh token>",
    "withCompany": true,
    "companyId": "<uuid>",
    "companyName": "Acme Corp",
    "withActiveSubscription": true
  }
}
```

**Response — New user (role classification required):**
```json
{
  "success": true,
  "status": "role_required",
  "firebaseIdToken": "<Firebase ID token, valid 55min>",
  "googleEmail": "user@example.com",
  "inferredFirstName": "Jane",
  "inferredLastName": "Doe",
  "googlePhotoUrl": "https://lh3.googleusercontent.com/...",
  "expiresInMinutes": 55
}
```

**Error responses:**
- `400` — missing/short googleIdToken
- `401` — email not verified, invalid token
- `409` — `{ errorCode: 'account_exists_different_provider', message: '...' }`
- `429` — rate limit exceeded
- `500` — Firebase exchange or DB error

---

### POST /api/auth/choose-role

**Purpose:** Complete registration for a new Google user by selecting Job Seeker or Employer.

**Auth:** None (pending Firebase token supplied in body). No UnauthGuard.

**Request:**
```json
{
  "firebaseIdToken": "<token from role_required response>",
  "selectedRole": "job_seeker"
}
```

`selectedRole` must be `"job_seeker"` (maps to roleId=3) or `"employer"` (maps to roleId=2).

**Response — Success:**
```json
{
  "success": true,
  "status": "authenticated",
  "data": { ... }
}
```
Same shape as `/firebase-session` authenticated response.

**Error responses:**
- `400` — invalid selectedRole, missing token
- `401` — firebaseIdToken invalid or expired
- `409` — user already exists (race condition)
- `500` — DB insert or session build error

---

## Security Constraints

- `role` is NEVER read from the request body; derived solely from `selectedRole`
- `selectedRole` can only produce roleId 2 or 3 — roleId 1 (admin) is impossible
- `firebaseIdToken` is re-verified on the BE in `chooseRole` — client cannot forge it
- `company_id`, `user_id`, `email`, `email_verified` are NEVER trusted from the client
- IP rate limit on `/firebase-session` via in-memory `ipRateCounts` map (TTL 15min)
- `returnUrl` server-validated: must start with `/` and not `//`
- Google tokens are logged as `[REDACTED]` if any error logging occurs

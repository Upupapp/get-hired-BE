# GETHIRED ROUTE PROTECTION MATRIX — V6
**Date:** 2026-07-01 | **New routes:** LinkedIn OIDC (6 routes)

---

## LinkedIn OIDC Routes

| Route | Method | File | Protection | CSRF Protection | Rate Limited |
|---|---|---|---|---|---|
| /auth/linkedin/start | GET | linkedinAuthRoutes.js | None (public) | N/A (initiates flow) | Global limiter |
| /auth/linkedin/callback | GET | linkedinAuthRoutes.js | State JWT (anti-CSRF) | YES — state JWT | Global limiter |
| /auth/linkedin/complete | POST | linkedinAuthRoutes.js | Ticket JWT | N/A (stateless) | Global limiter |
| /auth/linkedin/choose-role | POST | linkedinAuthRoutes.js | Pending token JWT | N/A (stateless) | Global limiter |
| /auth/linkedin/unlink | DELETE | linkedinAuthRoutes.js | verifyFirebaseIdToken | Firebase token | Global limiter |
| /auth/linkedin/link-status | GET | linkedinAuthRoutes.js | verifyFirebaseIdToken | Firebase token | Global limiter |

---

## Protection Assessment

### State JWT as CSRF Protection
The `state` parameter is a signed HS256 JWT. LinkedIn will reject a callback if `state` doesn't match what was sent. The server verifies the JWT signature on return. An attacker cannot forge a valid `state` without `env.secret`. Assessment: SUFFICIENT for CSRF protection of the OAuth callback.

### Ticket JWT as Authentication
The ticket JWT is signed + single-use (DB-backed). A stolen ticket (e.g., from URL or logs) can be used once. After use, the DB row has `used_at` set and further redemption returns 400. Assessment: SUFFICIENT. Exposure window is 5 minutes and single use.

### Pending Token as Authentication (WEAKNESS)
The pending token issued for `role_required` is signed but NOT DB-backed. It can be replayed multiple times in 5 minutes. Assessment: INSUFFICIENT — see LI-SEC-001.

### verifyFirebaseIdToken
Calls `firebaseAdmin.auth().verifyIdToken()` — cryptographically verifies the Firebase ID token. Sets `req.user` with decoded claims including `uid`. Protected routes can safely use `req.user.uid`. Assessment: PASS.

---

## Previously Audited Routes (V5) — Status

| Route Group | V5 Status | V6 Status |
|---|---|---|
| Google Auth routes | PASS | PASS (no changes) |
| Employer job routes | PASS (BOLA fixed) | PASS (no changes) |
| Payment webhook | PASS (sig verified in code) | PASS (env var still needed) |
| CV/file upload routes | PASS | PASS |
| Messaging routes | PASS | PASS |
| Admin routes | PASS | PASS |

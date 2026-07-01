# GETHIRED SQL INJECTION AUDIT — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC new queries

---

## LinkedIn OIDC Queries — Full Audit

All queries in `linkedinAuthController.js` audited for parameterization:

| Query | Parameterized? | User Input Used? | Finding |
|---|---|---|---|
| SELECT user_uid FROM auth_identities WHERE provider='linkedin' AND provider_subject=$1 | YES | liSub (from LinkedIn userinfo) | PASS |
| UPDATE auth_identities SET last_login_at... WHERE provider='linkedin' AND provider_subject=$3 | YES | photoUrl, name, liSub | PASS |
| SELECT role FROM user_credentials WHERE uid=$1 | YES | uid (server-derived) | PASS |
| INSERT INTO auth_identities (...) VALUES ($1,'linkedin',$2,...) | YES | uid, liSub, email, emailVer, name, photoUrl | PASS |
| INSERT INTO oauth_tickets (jti, uid, data, expires_at) VALUES ($1,$2,$3,$4) | YES | jti (server-generated), uid, JSON.stringify(data), expiresAt | PASS |
| UPDATE oauth_tickets SET used_at=NOW() WHERE jti=$1 AND used_at IS NULL AND expires_at>NOW() RETURNING uid, data | YES | jti (from verified JWT) | PASS |
| INSERT INTO user_credentials (uid, email, password, role, created_date) VALUES ($1,$2,$3,$4,...) | YES | uid, email, dummyPassword, roleId | PASS |
| INSERT INTO users (uid, email, firstname, lastname, photo_url) VALUES ($1,$2,$3,$4,$5) | YES | uid, email, firstName, lastName, photoUrl | PASS |
| INSERT INTO auth_identities (...) VALUES ($1,'linkedin',$2,...) ON CONFLICT DO NOTHING | YES | All params | PASS |
| SELECT * FROM auth_identities WHERE provider='linkedin' AND provider_subject=$1 | YES | liSub (from verified JWT) | PASS |
| SELECT role FROM user_credentials WHERE uid=$1 | YES | existingUid (from DB row) | PASS |
| DELETE FROM auth_identities WHERE user_uid=$1 AND provider='linkedin' RETURNING id | YES | uid (from Firebase token) | PASS |
| SELECT provider_email, provider_name... FROM auth_identities WHERE user_uid=$1 AND provider='linkedin' | YES | uid (from Firebase token) | PASS |
| SELECT u.firstname... FROM users u JOIN user_credentials... WHERE u.uid=$1 | YES | uid (from DB-retrieved ticket) | PASS |

**Result: 0 SQL injection vulnerabilities found in LinkedIn OIDC code.**

All values passed to queries are either:
- Server-generated (uid, jti, expiresAt)
- From verified JWTs (liSub, jti after signature check)
- From LinkedIn API responses (not directly from user input)
- From Firebase verified tokens (req.user.uid)

The `dbSchema` prefix uses `env.schema` which is a dotenv value loaded at startup, not user-supplied.

---

## Previously Audited SQLi Findings (V5) — Status

| Controller | V5 Finding | V6 Status |
|---|---|---|
| jobController.js | Fixed V2 | HOLDING |
| applicationController.js | Fixed V2 | HOLDING |
| companiesController.js | Fixed V2 | HOLDING |
| messagesController.js | Fixed V2 | HOLDING |
| userController.js | Fixed V2 | HOLDING |
| adminController.js | Fixed V2 | HOLDING |
| subscriptionController.js | Fixed V2 | HOLDING |
| paymentController.js | Fixed V2 | HOLDING |

**Overall SQLi posture: CLEAN**

# GETHIRED ASVS API SECURITY MAP — V6
**Date:** 2026-07-01 | **Standard:** OWASP ASVS 4.0

---

## V2 Authentication

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 2.1.1 | Passwords 12+ chars when set | PASS | Firebase enforces; LinkedIn uses hashPassword(uid+suffix) |
| 2.1.6 | No credential in URLs | PASS | LinkedIn tickets in URL are single-use short-lived JWTs, not credentials |
| 2.2.1 | Anti-automation on auth | PARTIAL | Global rate limiter on server; no specific limit on LinkedIn endpoints |
| 2.2.2 | No weak auth (plaintext creds) | PASS | All passwords bcrypt-hashed |
| 2.5.1 | Password recovery secure | PARTIAL | Firebase email link reset; LinkedIn accounts have dummy password but Firebase auth only |
| 2.6.1 | OTP single use | PASS | oauth_tickets DB-backed single-use |
| 2.7.1 | Out-of-band auth not weak | N/A | |
| 2.8.3 | TOTP seeds not reused | N/A | |

## V3 Session Management

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 3.1.1 | URL does not contain session tokens | PARTIAL | Ticket JWT in URL (single-use, 5-min TTL) — mitigated by single-use constraint |
| 3.2.1 | New session on auth | PASS | Firebase ID token issued fresh each sign-in |
| 3.2.2 | Tokens 64+ bits of entropy | PASS | JTI is 24 random bytes = 192 bits |
| 3.3.1 | Session logout works | PASS | Firebase token revocable; FE clears localStorage |
| 3.4.5 | Cookie SameSite | N/A | Stateless JWT; no session cookies for LinkedIn flow |

## V4 Access Control

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 4.1.1 | All routes enforce auth | PASS | verifyFirebaseIdToken on all protected routes |
| 4.1.2 | All decisions server-side | PASS | Role determined server-side from DB |
| 4.1.3 | Least privilege | PASS | Role 2/3 only for LinkedIn; admin (1) blocked |
| 4.2.1 | No direct object references without authz | PASS | BOLA patterns verified |
| 4.2.2 | Directory traversal blocked | N/A | |

## V5 Validation, Sanitization, Encoding

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 5.1.1 | HTTP method enforcement | PASS | Express method-specific routing |
| 5.1.3 | Input validation | PASS | intent/source truncated; returnTo sanitized |
| 5.2.1 | SQL uses parameterized queries | PASS | All LinkedIn queries parameterized |
| 5.3.3 | HTML encoding for output | N/A | JSON API only |

## V6 Stored Cryptography

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 6.2.1 | No weak algorithms | PASS | HS256 for JWTs; SHA-256 for uid derivation |
| 6.2.2 | IV/nonce not reused | PASS | crypto.randomBytes for each nonce |
| 6.3.1 | Random values 128-bit+ | PASS | JTI=192 bits, nonce=128 bits |
| 6.4.1 | Key material in env | PARTIAL — LI-SEC-002 | Single `SECRET` used for all JWT types; recommend separation |

## V7 Error Handling and Logging

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 7.1.1 | No credentials in logs | PASS | UIDs truncated; no tokens logged |
| 7.2.1 | Error messages generic | PASS | Redirects use error codes, not stack traces |
| 7.3.1 | Log security events | PARTIAL | console.log only; no structured security audit log |

## V9 Communication

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 9.1.1 | TLS for all connections | ASSUMED | Production on Linode with HTTPS; local dev on HTTP (acceptable) |
| 9.2.1 | Backend comms via TLS | PASS | LinkedIn/Firebase API calls use HTTPS |

## V10 Malicious Code

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 10.2.1 | No backdoors | PASS | Reviewed |
| 10.3.1 | Supply chain review | SEE DEPENDENCY AUDIT | npm audit results in separate file |

## V13 API and Web Service

| Req | Description | GetHired Status | Notes |
|---|---|---|---|
| 13.1.1 | All API routes require authz | PASS | Public routes explicitly documented |
| 13.1.3 | API key not in URL | PASS | |
| 13.2.1 | RESTful HTTP verbs correct | PASS | GET/POST/DELETE used correctly |
| 13.3.1 | Input schema validated | PARTIAL | Manual validation; no schema library |

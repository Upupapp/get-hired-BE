# GetHired — ASVS API Security Map (SECURE 3)
**Standard:** OWASP Application Security Verification Standard v4.0
**Date:** 2026-06-26
**Scope:** GetHired BE API (Node/Express/Firebase/PostgreSQL)

---

## V1 — Architecture, Design and Threat Modeling

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V1.1.1 | Secure development lifecycle | PARTIAL | No formal SDL; SECURE audits applied iteratively |
| V1.2.1 | All application components identified | PASS | Route map complete; 14 route files audited |
| V1.4.1 | Trust boundaries enforced | PASS | Firebase JWT boundary enforced at middleware layer |
| V1.5.1 | Input/output encoding defined | PARTIAL | SQL parameterized in controllers; string concat in legacy services |

---

## V2 — Authentication

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V2.1.1 | User-set passwords of at least 12 chars | PARTIAL | `validatePassword()` in validation.js — format validated but length not confirmed ≥12 |
| V2.1.4 | No password composition rules limiting charset | UNKNOWN | Need to inspect validatePassword() in detail |
| V2.2.1 | Anti-automation controls for auth endpoints | PASS | `authLimiter` (20/15min), `sensitiveLimiter` (10/hr) |
| V2.2.2 | MFA available | NOT IMPLEMENTED | Firebase supports MFA; not wired in app |
| V2.3.1 | Passwords stored as adaptive hash | PASS | `bcrypt` used (package.json) |
| V2.4.1 | Credential never sent in plaintext | PASS | HTTPS in prod; no console.log of password confirmed |
| V2.5.1 | Firebase token verification | PASS | `firebaseAdmin.auth().verifyIdToken()` in verifyAuth.js |
| V2.7.1 | Logout invalidates session | PASS | Firebase token revocation in revokeTokenInFirebase() |

---

## V3 — Session Management

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V3.2.1 | Session tokens not exposed in URLs | PASS | Bearer token in Authorization header |
| V3.3.1 | Logout + token revocation | PASS | POST /auth/logout with verifyAuth + token revocation |
| V3.4.1 | Cookie-based session uses SameSite | PARTIAL | `__session` cookie path exists in optionalVerifyAuth; SameSite attribute not verified |
| V3.5.1 | Signed/encrypted session tokens | PASS | Firebase JWT is RSA-signed |

---

## V4 — Access Control

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V4.1.1 | All functionality behind access control | PASS | All non-public routes have verifyAuth |
| V4.1.2 | All resources protected by access control | PASS | Route matrix verified; no unguarded private endpoints found |
| V4.1.3 | Principle of least privilege | PARTIAL | Role check in verifyRoles; not all endpoints check role (some rely on business logic) |
| V4.2.1 | BOLA/IDOR protection on all objects | PASS (majority) | JWT-derived company/uid; P2-1 SQL injection is separate concern |
| V4.2.2 | Directory traversal prevention | PASS | No file-system path construction from user input |
| V4.3.1 | Admin access restricted | PASS | `/admin/*` routes require verifyAuth + verifyRoles(['1']) |

---

## V5 — Validation, Sanitization and Encoding

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V5.1.1 | Input validation present | PARTIAL | Required fields validated; no schema-level validation library |
| V5.1.2 | HTTP method validated | PASS | Express router enforces correct HTTP methods per route |
| V5.1.3 | SQL queries use parameterized queries | PARTIAL | Controllers: parameterized. Legacy services: string interpolation (P2-1) |
| V5.1.4 | Positive output encoding | PARTIAL | Error messages are generic; some DB error messages may leak |
| V5.2.1 | XSS prevention | PASS | No server-side HTML rendering; JSON API with nosniff header |
| V5.3.1 | XML injection prevention | PASS | xmlEscape() used in sitemap.xml generation |

---

## V7 — Error Handling and Logging

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V7.1.1 | Error messages do not leak secrets | PASS | All controllers return generic error strings |
| V7.1.2 | No credentials in logs | PASS | No console.log of passwords, tokens, or private keys |
| V7.2.1 | Audit logging of high-value events | PARTIAL | Security probes logged (SEC-01, SEC-02); no central audit log |
| V7.3.1 | Log injection prevention | PARTIAL | Logs use template strings with interpolated values; no structured logging |

---

## V8 — Data Protection

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V8.1.1 | Sensitive data not cached client-side | PARTIAL | Angular SSR; caching behavior not fully audited |
| V8.2.2 | API returns minimum necessary data | PARTIAL | Some `SELECT *` queries return all columns |
| V8.3.1 | Data in transit encrypted (HTTPS) | PASS (assumed) | Production served via HTTPS; env.app_url = https:// |

---

## V9 — Communication Security

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V9.1.1 | TLS for all connections | PASS | Production uses HTTPS |
| V9.1.2 | CORS properly configured | PARTIAL | `cors({ origin: env.app_url })` — improved from wildcard; depends on APP_URL env var |
| V9.1.3 | HSTS header present | NOT SET | No Strict-Transport-Security header in server.js middleware |

---

## V13 — API and Web Services

| ASVS ID | Requirement | Status | Evidence |
|---|---|---|---|
| V13.1.1 | All routes return same content type | PASS | Express `res.json()` standard |
| V13.1.2 | HTTP method restrictions per route | PASS | Explicit router methods |
| V13.2.1 | REST verbs enforce correct state changes | PASS | GET = read, POST = create, PUT = update, DELETE = delete |
| V13.2.3 | Webhook signature verification | CONDITIONAL | PayMongo HMAC implemented; requires secret in prod |
| V13.3.1 | GraphQL/API rate limiting | PASS | 4-tier rate limiter in server.js |
| V13.4.1 | Authorization on all API endpoints | PASS | All private endpoints have verifyAuth |

---

## ASVS Level Summary

| Level | Criteria | Current status |
|---|---|---|
| L1 (automated) | Basic security controls | LARGELY MET (string interpolation in services, HSTS missing) |
| L2 (manual) | Defense-in-depth | PARTIALLY MET (no MFA, no structured logging, no schema validation) |
| L3 (advanced) | Full verification | NOT MET (incomplete threat model, no pen test, no formal SDL) |

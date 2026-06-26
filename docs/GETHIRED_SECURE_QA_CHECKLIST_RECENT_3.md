# GetHired — Security QA Checklist (SECURE 3)
**Date:** 2026-06-26
**Format:** Check each item before considering a security review complete

---

## Section 1 — Credential Security

- [x] Firebase service account key NOT in git history (confirmed — file was .gitignored; Google auto-revoked old key)
- [x] Firebase credential loaded from env var (FIREBASE_SERVICE_ACCOUNT_BASE64), not from dynamic file path
- [x] Old Firebase key (d7f03...) revoked — auto-revoked by Google
- [x] New Firebase key stored as base64 env var in production .env
- [ ] Production .env file permissions verified as 600 on Linode (EXTERNAL — EA-2)
- [x] `.gitignore` blocks all service account JSON filename patterns
- [x] `tools/check-secrets.sh` exits 0 on clean repo
- [ ] SSH key commits in git history assessed and cleaned if found (EXTERNAL — EA-4)
- [ ] PAYMONGO_WEBHOOK_SECRET confirmed set in production .env (EXTERNAL — EA-1)
- [ ] PAYMONGO_WEBHOOK_SECRET confirmed set by registering webhook in PayMongo Dashboard (EXTERNAL — EA-7)

---

## Section 2 — Authentication & Authorization

- [x] All private routes have verifyAuth middleware (route matrix verified)
- [x] verifyRoles.js: `&&` form is semantically equivalent to `?.` for uid extraction
- [x] optionalVerifyAuth does not bypass required auth on any route
- [x] optionalVerifyAuth correctly rejects invalid tokens with 401
- [x] Admin role (1) cannot be self-registered via /auth/signup
- [x] JWT-derived companyId pattern applied in all company-scoped controllers
- [x] IDOR check on /applicant/userprofile (SEC-01) — mismatch → 403 + security event log
- [x] BOLA probe on /job/details (SEC-02) — uid param mismatch → 403 + security event log
- [ ] Company creation route has role guard (FLAG-1 — not yet implemented)
- [ ] Payment intent route has role guard (FLAG-2 — not yet implemented)
- [ ] /auth/manualexcelverification has auth guard (LOW — unauthenticated endpoint of uncertain use)

---

## Section 3 — SQL Injection

- [x] All controllers use parameterized queries ($1, $2 params)
- [ ] `services/contact.service.js` — 9 string-interpolated queries → parameterize (P2-1, FIX-R1)
- [ ] `services/candidate.service.js` — 1 string-interpolated query → parameterize (P2-2, FIX-R2)
- [x] Sitemap XML uses xmlEscape() for all dynamic values

---

## Section 4 — Payment Security

- [x] POST /payment/paymongopaymentlink requires verifyAuth
- [x] PayMongo webhook HMAC implementation correct (SHA-256, timingSafeEqual, replay protection)
- [x] req.rawBody preserved for HMAC computation
- [x] Webhook excluded from writeLimiter
- [x] Webhook fails closed without PAYMONGO_WEBHOOK_SECRET (returns 400)
- [ ] PAYMONGO_WEBHOOK_SECRET confirmed in production (EXTERNAL)
- [x] PII not logged in webhook handlers (billing name/email/phone removed from logs)

---

## Section 5 — File Upload Security

- [x] Magic byte verification on PDF/DOCX/JPEG/PNG/GIF/WEBP uploads
- [x] MIME type allowlisting in CV upload service
- [x] File size limit enforced (5MB stated; note: 1MB body limit may be tighter)
- [x] All upload routes require verifyAuth
- [x] Filename generated server-side (not from user input)
- [x] Firebase Storage path uses hardcoded folder names

---

## Section 6 — CORS & Transport

- [x] CORS changed from wildcard to `cors({ origin: env.app_url })`
- [ ] APP_URL confirmed as https://gethiredonline.app in production (EXTERNAL — EA-3)
- [x] X-Content-Type-Options: nosniff header present
- [x] X-Frame-Options: DENY header present
- [x] X-XSS-Protection: 0 header present
- [ ] Strict-Transport-Security header (HSTS) — not set (recommended)
- [ ] Content-Security-Policy header — not set (recommended for FE)

---

## Section 7 — Rate Limiting

- [x] Global rate limiter (500/15min) applied
- [x] Auth rate limiter (20/15min) on /api/auth/*
- [x] Write rate limiter (100/15min) on /api write operations
- [x] Sensitive rate limiter (10/hr) on password change + archive
- [x] Webhook excluded from write rate limiter
- [ ] Nginx in path to prevent X-Forwarded-For spoofing (EXTERNAL — EA-6)

---

## Section 8 — Logging & Privacy

- [x] No passwords logged
- [x] No Firebase tokens logged
- [x] No service account credentials logged
- [x] Payment webhook PII removed from logs
- [x] Security event UIDs redacted in logs
- [x] Import aggregate counts only (no email addresses in logs)
- [ ] candidateList console.log(dbResponse) still present (LOW — remove for hygiene)

---

## Section 9 — Dependencies

- [x] 114 Dependabot vulnerabilities noted and documented
- [ ] Dependabot upgrade sprint scheduled (P3)
- [ ] `request` package replacement scheduled (P2)
- [ ] `jsonwebtoken` upgrade to 9.x scheduled (P2)

---

## Section 10 — Google Indexing API

- [x] GOOGLE_INDEXING_API_ENABLED=false in .env.example
- [x] Hard gate in googleIndexing.service.js (line 21: `if (!ENABLED) return`)
- [x] URL safety check prevents non-public URLs from being indexed
- [ ] GOOGLE_INDEXING_API_ENABLED=false confirmed in production .env (EXTERNAL — EA-8)

---

## Checklist Score

| Section | Items | Checked | External pending |
|---|---|---|---|
| Credential security | 10 | 7 | 3 |
| Auth & authorization | 11 | 9 | 0, 2 flagged |
| SQL injection | 4 | 2 | 2 code fixes needed |
| Payment security | 7 | 6 | 1 external |
| File upload | 6 | 6 | 0 |
| CORS & transport | 7 | 4 | 1 external, 2 missing headers |
| Rate limiting | 6 | 5 | 1 external |
| Logging & privacy | 8 | 7 | 1 low hygiene |
| Dependencies | 4 | 1 | 3 scheduled |
| Google Indexing | 4 | 3 | 1 external |

**Total: 50 checked / 67 items | 10 external actions | 5 code fixes recommended**

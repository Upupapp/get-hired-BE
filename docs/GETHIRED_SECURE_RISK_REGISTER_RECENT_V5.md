# GETHIRED_SECURE_RISK_REGISTER_RECENT_V5.md

**Audit date:** 2026-06-26
**BE HEAD:** 6a7755c  |  **FE HEAD:** 41b5920

---

## Active Risk Register

### P0 — Critical

| ID | Risk | Location | Status | Owner action |
|----|------|----------|--------|--------------|
| SEC-GIT-01 | Firebase service account key committed to git history | get-hired-BE git history | OPEN — unchanged since prior audit | Rotate the key in Firebase Console → generate new service account key → update .env → git-filter-repo or BFG to rewrite history → force-push (coordinate with team). See GETHIRED_SECRET_INCIDENT_REPORT.md. |

---

### P1 — High

| ID | Risk | Location | Status | Owner action |
|----|------|----------|--------|--------------|
| SEC-OPS-01 | `PAYMONGO_WEBHOOK_SECRET` may be absent from production .env | Production Linode server | OPEN — unverified (ops action, not code) | Run `ssh root@139.162.11.242 "grep -c PAYMONGO_WEBHOOK_SECRET /root/get-hired-BE/.env"`. Expected: 1. If 0, payment webhooks are rejected (fail-closed, no payment bypass). Set the secret from the PayMongo dashboard and `pm2 restart all`. |
| SEC-RATE-01 | Rate limiter uses in-memory store; resets on server restart | server.js | OPEN — accepted risk for single-node deploy | If/when horizontally scaling, swap to redis store (rate-limit-redis). Not a concern on single-node Linode. |

---

### P2 — Medium

| ID | Risk | Location | Status | Owner action |
|----|------|----------|--------|--------------|
| SEC-V5-01 | Stale `noindex` on fast SPA navigation between job pages; weak job ID enumeration via robots meta | job-posts-details.component.ts ngOnDestroy | OPEN | Add `this.meta.updateTag({ name: 'robots', content: 'index, follow' })` to ngOnDestroy. Non-blocking. |
| SEC-SITEMAP-01 | sitemap.xml has no dedicated rate limit (only global 500/15min) | server.js | OPEN | Add a sitemap-specific limiter (e.g. 30 req/hour) to prevent DB-query-per-request abuse by aggressive crawlers. |
| SEC-NOSNIFF-01 | X-Content-Type-Options: nosniff set on BE API but not verified on FE static assets | Linode nginx or static host config | OPEN | Confirm nginx config serves `X-Content-Type-Options: nosniff` for `.js`, `.css`, `.html` static files. |

---

### P3 — Low / Informational

| ID | Risk | Location | Status | Owner action |
|----|------|----------|--------|--------------|
| SEC-DEAD-01 | `isMobileViewAllowed` dead query param on admin route navigation | auth.guard.ts | CLOSED (removed in this deployment) | No action needed. |
| SEC-TOKEN-01 | Raw Firebase error object was serialized to 403 responses | verifyAuth.js | CLOSED (replaced with static string in this deployment) | No action needed. |
| SEC-BREADCRUMB-01 | Job title in breadcrumb/banner — potential XSS vector | job-posts-details.component.html | CLOSED — Angular {{ }} interpolation encodes | No action needed. |
| SEC-ENUM-01 | Weak job ID enumeration via noindex robots meta | job-posts-details.component.ts | LOW — no private data exposed, only existence | See SEC-V5-01 for fix. |
| SEC-CONSOLE-01 | `console.log(res.data)` in getShareableLink | job-posts-details.component.ts:136 | LOW — leaks shareable link URL to browser console | Remove console.log in next cleanup sprint. |

---

## Closed in Prior Sprints (Verified Holding)

| ID | Fix | Verified |
|----|-----|---------|
| SEC-01 | IDOR on /applicant/userprofile — uid from JWT | Yes |
| SEC-02 | IDOR on job details — company_id scoping | Yes |
| SEC-07 | BOLA on profile sub-arrays | Yes |
| SEC-PAYMONGO-HMAC | Webhook signature verification | Yes |
| SEC-CORS | Origin-scoped CORS | Yes |
| SEC-RATE | 4-tier rate limiter | Yes |
| SEC-HEADERS | X-Content-Type-Options, X-Frame-Options | Yes |
| SEC-CANDIDATE-AUTH | verifyAuth on all candidate routes | Yes |
| SEC-APPLICATION-AUTH | verifyAuth on all application/applicant routes | Yes |
| SEC-BOLA-CREATEJOB | companyId from JWT on createJobs | Yes |
| SEC-BOLA-DELETEJOB | company_id WHERE clause on deleteJob | Yes |
| SEC-BOLA-UPDATEJOB | company_id WHERE clause on updateJob/publishJob | Yes |
| SEC-BOLA-CREATEAPP | candidateId from JWT on createApplication | Yes |
| SEC-BOLA-DELETEAPP | candidateId from JWT on deleteApplication | Yes |

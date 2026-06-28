# GETHIRED ACTIONS ROADMAP
## QA Cycle 11 — 7-Stage Delivery Plan

**Generated:** 2026-06-25

---

## Stage 0 — Immediate Blockers (ship before any real payment goes live)
**Target:** Before enabling live Paymongo keys
**Actions:**
- GH-ACT-P0-01 — Paymongo webhook HMAC signature

**Gate:** Real Paymongo secret obtained from dashboard AND wired into `.env`. Do not flip to live keys until this lands.

---

## Stage 1 — Security Hardening Sprint (Week 1)
**Target:** Before opening recruiter portal to beta users
**Actions:**
- GH-ACT-P1-02 — Tighten CORS origins
- GH-ACT-P1-03 — Reduce JSON body limit to 1MB
- GH-ACT-P2-02 — Add resendVerification + manualExcelVerification to sensitiveLimiter
- GH-ACT-P2-05 — X-Content-Type-Options nosniff header

**Gate:** All 4 items are small (XS-S effort). Bundle into single PR. TEST run after merge.

---

## Stage 2 — Recruiter Portal Beta Readiness (Week 1-2)
**Target:** Before recruiter-portal beta invite
**Actions:**
- GH-ACT-P1-01 — B01 BACKLOG-01: recruiter_last_read_at read-state migration
- GH-ACT-P2-03 — Messages: add LIMIT to listRecruiterThreads
- GH-ACT-P2-07 — addCompanyUserByEmail error sanitization

**Gate:** Schema migration tested on staging before prod. Verify no regression on message send/receive.

---

## Stage 3 — Interview Hub Completion (Week 2)
**Target:** Before employer beta uses interview hub in anger
**Actions:**
- GH-ACT-P2-01 — B03: Interview hub pagination
- GH-ACT-P2-08 — Resolve applicationStatusId=3 hardcode
- GH-ACT-P2-09 — Unit tests for hub controller + component

**Gate:** Unit tests passing in CI before merge.

---

## Stage 4 — Applicant Experience Completions (Week 2-3)
**Target:** Before public launch
**Actions:**
- GH-ACT-P2-04 — Enable deleteJob route (employer self-service)
- GH-ACT-P2-06 — Fix getListByUser stubbed endpoint (applicant interview list)

**Gate:** Manual test of job delete + applicant interview list on staging.

---

## Stage 5 — Tech Debt & P3 Cleanup (Week 3-4, as capacity allows)
**Actions:**
- GH-ACT-P3-01 — deleteCV Storage cleanup
- GH-ACT-P3-02 — Reduce email enumeration
- GH-ACT-P3-03 — Redis rate-limit store (only if horizontal scaling decision made)

**Gate:** No gate required — these are non-blocking improvements.

---

## Stage 6 — QA & Metrics Baseline (Ongoing)
**Actions:**
- Establish product metrics instrumentation (see GETHIRED_PRODUCT_METRICS_PLAN.md)
- Run TEST command after each stage gate
- Add STITCH contract tests for B01/B02/B03 endpoints

**Gate:** QA Cycle 12 sign-off after Stage 4 completes.

---

## Roadmap Summary Table

| Stage | Focus | Items | Effort | Target |
|-------|-------|-------|--------|--------|
| 0 | Payment safety | 1 | M | Before live keys |
| 1 | Security hardening | 4 | XS-S | Week 1 |
| 2 | Recruiter beta | 3 | S-M | Week 1-2 |
| 3 | Interview hub | 3 | S-M | Week 2 |
| 4 | Applicant exp. | 2 | M | Week 2-3 |
| 5 | Cleanup | 3 | S-L | Week 3-4 |
| 6 | QA + Metrics | ongoing | — | Continuous |

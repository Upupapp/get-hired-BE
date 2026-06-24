# GETHIRED SECURE — Risk Register (Recent Deployment: Snapshot System)
**Date:** 2026-06-24

---

| ID | Area | Severity | Description | Fix Status | Test Needed | Release Blocker |
|---|---|---|---|---|---|---|
| RR-SD-01 | BOLA / Enumeration | P1 | Employer endpoint returned 404 vs 403 depending on whether an applicationId existed, allowing a recruiter to enumerate valid application IDs across companies | FIXED — 404 branch now returns 403 | Test: recruiter from Company B probes a valid applicationId from Company A's job; should receive 403 not 404 | YES — fixed before this register |
| RR-SD-02 | BOLA | P2 | `getUserCompany()` returns `[]` (empty array) when user has no company; controller relies on `[].companyId === undefined` inequality to deny access. Correct but brittle — if `getUserCompany` semantics ever change to return `null` or throw, the guard must be re-verified | OPEN (no code fix; acceptable by design) | Test: recruiter with no company record cannot access any snapshot | No |
| RR-SD-03 | Fire-and-forget | P2 | `companyId: job.companyId || null` passes null into a NOT NULL DB column if the job has no company — snapshot fails silently, application succeeds | OPEN (data quality, not security) | Test: apply to a job with null company_id; verify application succeeds and snapshot failure is logged | No |
| RR-SD-04 | Rate Limiting | P2 | Both new snapshot endpoints have no rate limiting (platform-wide pre-existing gap). An attacker could hammer the applicant endpoint with many applicationIds to infer existence | OPEN (pre-existing platform issue) | N/A until rate limiting is implemented platform-wide | No |
| RR-SD-05 | Information Disclosure | P3 | `missingRequired` and `missingRecommended` arrays are returned to the applicant from the DB completeness snapshot. These are server-computed; however returning raw DB JSONB fields instead of re-building them from a schema adds risk if the content ever changes | OPEN (acceptable; content is server-controlled) | Verify content contains only `{field, label, reason}` — no user-echoed data | No |
| RR-SD-06 | SQL Injection (pre-existing) | P1 | `job.service.js:getPublishedJobs` interpolates `companyId` directly into query string. Pre-existing, out of this deployment scope | OPEN (pre-existing) | N/A for this deployment | No (pre-existing) |
| RR-SD-07 | SQL Injection (pre-existing) | P1 | `job.service.js:getAllVideoResponsesByJobIds` interpolates array via string join. Pre-existing, out of scope | OPEN (pre-existing) | N/A for this deployment | No (pre-existing) |
| RR-SD-08 | Protected Attributes | P1 | EXCLUDED_FIELDS is a constant — if new protected attributes need to be added in future (e.g., pregnancy status, genetic data), every snapshot created before the update is not retroactively protected | OPEN (design constraint, not a bug) | Maintain EXCLUDED_FIELDS as an exhaustive blocklist; review on any profile schema changes | No |
| RR-SD-09 | Auth (pre-existing) | P0 | PayMongo webhook has no signature verification. Pre-existing | OPEN (pre-existing) | N/A for this deployment | No (pre-existing) |
| RR-SD-10 | Secrets (pre-existing) | P0 | Git history contains leaked secrets. Pre-existing | OPEN (pre-existing) | N/A for this deployment | No (pre-existing) |

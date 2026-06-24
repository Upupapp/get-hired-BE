# GETHIRED SECURE — Risk Register (Recent Deployment: Applicant Completeness View)
**Date:** 2026-06-24
**Deployment:** FE 76c545e, BE faa2232

---

## New Risks Introduced by This Deployment

None. All five security gate checks passed. No new attack surface was opened.

---

## Residual Risks (Pre-existing, Carried Forward)

| ID | Severity | Area | Description | Status |
|---|---|---|---|---|
| R-01 | P0 | Payments | PayMongo webhook signature not verified — replay/spoofing possible | Pre-existing, unmitigated |
| R-02 | P0 | Secrets | Raw credentials leaked in git history | Pre-existing, unmitigated (rotation advised) |
| R-03 | P1 | CORS | CORS policy wide-open (all origins allowed) | Pre-existing, unmitigated |
| R-04 | P1 | Rate Limiting | No rate limiting on any endpoint in get-hired-BE | Pre-existing, unmitigated |
| R-05 | P1 | SQLi | String interpolation in getPublishedJobs / getAllVideoResponsesByJobIds (job.service.js) | Pre-existing, out of scope for this audit |

---

## Informational Notes (Not Risks)

| ID | Area | Note |
|---|---|---|
| I-01 | FE Service | `getApplicationSnapshot(null)` would send `?applicationId=null` rather than fail early. Defensive guard recommended but not a security issue in current code (FE already filters nulls before calling). |

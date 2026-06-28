# GETHIRED DELETE JOB — Release Gate V1

**Date:** 2026-06-25

---

## Gate Criteria

### Security (P2 — Primary Mission)

| # | Criterion | Status |
|---|-----------|--------|
| S1 | DELETE route registered with `verifyAuth` | PASS |
| S2 | `req.body.companyId` not used anywhere in deleteJob | PASS |
| S3 | DELETE query has `AND company_id=callerCompany.companyId` | PASS |
| S4 | `callerCompany` derived from `getUserCompany(req.user.uid)` | PASS |
| S5 | 0 rowCount returns 404, not 403 (no existence leak) | PASS |
| S6 | Response list scoped to `callerCompany.companyId` | PASS |
| S7 | SQL injection: parameterized query | PASS |
| S8 | No JobCompatibilityService touched | PASS |
| S9 | No payment/subscription touched | PASS |
| S10 | No auth/Firebase touched | PASS |

**Security gate: PASS**

---

### Backend Quality

| # | Criterion | Status |
|---|-----------|--------|
| B1 | Route path consistent with existing `/job/*` prefix | PASS |
| B2 | `RETURNING job_id` for explicit rowCount semantics | PASS |
| B3 | `getBasicJobList` (not obsolete `getJobList`) used | PASS |
| B4 | Correct error message for each status code | PASS |
| B5 | Error logged via `console.error('[deleteJob] error:', error)` | PASS |

**Backend quality gate: PASS**

---

### Frontend Quality

| # | Criterion | Status |
|---|-----------|--------|
| F1 | New NgRx actions: deleteJob/Success/Fail | PASS |
| F2 | Effect normalises 404 and 403 error shapes | PASS |
| F3 | Reducer updates list on success | PASS |
| F4 | Reducer surfaces error on fail | PASS |
| F5 | Facade method dispatches deleteJob action | PASS |
| F6 | Service sends only jobId (no companyId) | PASS |
| F7 | Component dispatches deleteJobPost (not changeJobStatus) | PASS |
| F8 | Success toast shown after delete | PASS |
| F9 | Error toast shown on fail | PASS |
| F10 | Confirmation dialog copy conveys destructive intent | PASS |
| F11 | Dialog backward-compatible for other callers | PASS |

**Frontend quality gate: PASS**

---

### Regression

| # | Criterion | Status |
|---|-----------|--------|
| R1 | Archive-via-status-change still works | PASS — unchanged code path |
| R2 | Interview question delete unchanged | PASS — separate actions/effects |
| R3 | Job create/update unchanged | PASS — separate controllers |
| R4 | Confirmation dialog backward-compatible | PASS — conditional message |
| R5 | NgRx state shape unchanged (only new fields) | PASS |

**Regression gate: PASS**

---

## Deployment Requirements

### Backend (Linode)
```bash
cd /var/www/_work/get-hired-BE
git pull
pm2 restart gethired
```

**Note:** The new DELETE /job/delete route will 404 until the BE is restarted. FE deploy alone is not sufficient.

### Frontend (GitHub Actions → Linode)
- Push to master → auto-deploy (~3 min build + rsync)
- No manual steps required for FE

### Order of Deploy
1. Deploy BE first (register route)
2. Deploy FE second (dispatch to real endpoint)

If FE deploys before BE: clicking delete silently fails (404 from server). Existing archive-as-delete is gone from the FE. Brief window of no-delete functionality.

**Recommended:** Deploy BE first.

---

## Release Gate Verdict

**PASS — PROD-READY** (pending BE deploy + pm2 restart on Linode)

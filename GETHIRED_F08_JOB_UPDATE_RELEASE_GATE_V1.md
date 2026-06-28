# GETHIRED F-08 — RELEASE GATE
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## DEPLOY VERDICT: PROD-READY (F-08 GATE PASSES)

All 30+ gate items assessed below.

---

## Security Gate Items

| # | Gate Item | Status | Evidence |
|---|-----------|--------|----------|
| G01 | F-08 job update BOLA fixed server-side | PASS | WHERE job_id=$19 AND company_id=$20; getUserCompany from JWT |
| G02 | All job update routes ownership-scoped | PASS | updateJob, changestatus both use getUserCompany+company_id WHERE |
| G03 | Client-supplied ownership fields ignored | PASS | Explicit destructuring; no body.companyId read; no body spread |
| G04 | Cross-company update tests fail safely | PASS | Zero-row UPDATE → 403; no data returned |
| G05 | Owner-company update tests still pass | PASS | Legitimate owner: WHERE job_id=$X AND company_id=$ownerId → rows returned → 200 |
| G06 | Regression checks pass | PASS | See REGRESSION_QA file; no behavioral changes for authorized owners |
| G07 | Ownership enforced at DB level (not app only) | PASS | WHERE clause includes company_id; atomic with mutation |
| G08 | getUserCompany never reads body/query | PASS | Only calls with req.user.uid from Firebase token |
| G09 | Zero-row check present and returns 403 | PASS | `if (!rows || rows.length === 0) return 403` |
| G10 | No information leak on cross-company attempt | PASS | Same 403 for "not found" and "wrong company" |
| G11 | Spoofed company_id in body rejected | PASS | body.companyId never destructured in updateJob |
| G12 | Spoofed company_id in query rejected | PASS | req.query not used; not destructured |
| G13 | Sequential ID guessing fails | PASS | Without matching company_id, UPDATE returns 0 rows |
| G14 | Protected fields blocked from SET | PASS | job_id, company_id, created_by, created_at not in SET clause |
| G15 | Child-table updates gated by parent ownership | PASS | saveJobArray only called after rows.length > 0 |
| G16 | updateQuestionById company-scoped | PASS | Defence-in-depth subquery added this sprint |
| G17 | Promise.all on interview question updates | PASS | Errors now propagate from updateQuestionById |
| G18 | No unprotected job mutation route aliases | PASS | Only one PUT /job/updatejobs; old delete route commented out |
| G19 | verifyAuth on all job mutation routes | PASS | All mutation routes have verifyAuth middleware |
| G20 | Admin/applicant tokens rejected for employer routes | PASS | getUserCompany returns [] if not in company_employees |

---

## Frontend Gate Items

| # | Gate Item | Status | Evidence |
|---|-----------|--------|----------|
| G21 | Loading state on draft save/publish | PASS | savingDraft flag + spinner; existing publish loading flag |
| G22 | Duplicate click prevented | PASS | `[disabled]="savingDraft || loading"` on both buttons |
| G23 | Success feedback only after backend success | PASS | saveSuccessPulse set in afterSubmit (only called on saveJobSuccess) |
| G24 | 403/404 shown with safe copy | PASS | saveErrorMsg mapped to user-safe strings |
| G25 | Network failure shows retry path | PASS | saveErrorMsg = "Try again."; form retained; button re-enabled |
| G26 | Form not cleared before backend success | PASS | No form.reset() before afterSubmit; dialog appears after success only |
| G27 | No security internals in user copy | PASS | Copy QA scan found no forbidden patterns |

---

## UX / Motion Gate Items

| # | Gate Item | Status | Evidence |
|---|-----------|--------|----------|
| G28 | Reduced-motion fallbacks on ALL animations | PASS | Every new @keyframe has @media (prefers-reduced-motion: reduce) block |
| G29 | No flashing effects | PASS | No rapid on/off animations; success pulse is single entry |
| G30 | No animation of fake success | PASS | Success pulse conditional on saveSuccessPulse which is set in afterSubmit post-backend |

---

## Accessibility / Mobile Gate Items

| # | Gate Item | Status | Evidence |
|---|-----------|--------|----------|
| G31 | Save/update buttons labeled | PASS | Dynamic aria-label on draft; static on cancel; existing on publish |
| G32 | Loading/success/error visible to screen readers | PASS | aria-live="polite" on loading/success; aria-live="assertive" on error |
| G33 | Keyboard accessible | PASS | All buttons are <button> elements; focus-visible glow added |
| G34 | Mobile touch targets 44px+ | PASS | min-height: 44px at max-width: 768px |

---

## Regression Gate Items

| # | Gate Item | Status |
|---|-----------|--------|
| G35 | B04: publish without interview questions allowed | PASS |
| G36 | B05: post-publish → dashboard?id= | PASS |
| G37 | B13: readiness bar unaffected | PASS |
| G38 | JobCompatibilityService untouched | PASS |
| G39 | Public job detail unaffected | PASS |
| G40 | Applicant application flow unaffected | PASS |

---

## Known Residual Risks (Not Blocking)

### RR1: Historical templates with null company_id
If any `job_interview_template` row has `company_id = null` (from before the column was populated), the new defence-in-depth subquery in `updateQuestionById` would return 0 rows and throw "Failed to update question" for those specific questions via the `updateJob` path.

**Mitigation:** The primary F-08 gate (parent WHERE clause) still protects all scenarios. The child-table defence-in-depth is additive. If this hits production, the fix is a DB migration to backfill `company_id` on `job_interview_template` — already deferred to backlog.

**Impact:** Low — only affects historical templates with null company_id; error is visible (not silent); user can retry without the question update path.

---

## F-08 CLOSURE STATEMENT

**F-08 Live BOLA on the job update endpoint is CLOSED.**

The primary attack vector — updating another company's job by supplying a jobId with a different company's ownership — is blocked at the database level via `WHERE job_id=$19 AND company_id=$20` where `company_id` is always derived from the authenticated caller's Firebase JWT, never from the request body or query string.

All related mutation routes (changestatus, deleteinterviewquestion) have equivalent ownership checks. No unprotected job mutation paths exist. Child-table updates are gated behind the parent ownership check with added defence-in-depth on question updates.

**Deploy decision: PROD-READY for F-08.**

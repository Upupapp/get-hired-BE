# GETHIRED NOTIFY — Recent Deployment Audit Report
**Scope:** FE 20a44c5, BE 422d340 (batch snapshot endpoint + applicant-applications template update)
**Previous NOTIFY pass:** FE 76c545e / BE faa2232 (10 fixes; gates A–E all PASS)
**Date:** 2026-06-24
**Auditor:** NOTIFY command

---

## Context

This is an incremental NOTIFY pass over the delta since the previous NOTIFY run. The previous pass established a clean baseline with all 5 gates passing. This pass audits only the new strings introduced in this deployment.

---

## Files Audited

| File | Role |
|---|---|
| `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` | FE template — new CTA + privacyNote placement |
| `get-hired-BE/controllers/applicationController.js` | BE batch endpoint error strings + privacyNote consistency |
| `get-hired-BE/scripts/backfill_application_snapshots.js` | Developer-facing console messages only — out of scope |

---

## Message Inventory (13 audited)

### FE Template

| # | String / Element | Location | Finding |
|---|---|---|---|
| 1 | `Update your profile →` CTA | Line 60 | Arrow U+2192 rendered as raw link text. Screen readers announce "right-pointing arrow". **Fixed** — wrapped in `<span aria-hidden="true">`. |
| 2 | `snap.privacyNote` placement | Line 72, after `disclaimerNote` | Renders as second `.app-snapshot-disclaimer` `<p>` immediately below disclaimerNote. Logical sequence: score definition first, then privacy assurance. No awkward juxtaposition. **Pass.** |
| 3 | `What was missing when you applied — add these now for stronger future applications:` | Line 56 | Existing string from previous NOTIFY pass. Present and intact. **Pass.** |
| 4 | `Getting started` badge | Line 50 | Existing string. Present and intact (`completenessLevel === 'incomplete'` branch). **Pass.** |
| 5 | `Completeness details aren't available for this application — it was submitted before this feature was introduced.` | Line 35 | Existing string. Present and intact. **Pass.** |
| 6 | `Snapshot unavailable right now.` | Line 77 (`#snapSilent`) | Existing string. Present and intact. **Pass.** |

### BE — applicationController.js (batch endpoint: user-facing API errors)

| # | String | Endpoint | Finding |
|---|---|---|---|
| 7 | `applicationIds is required.` | Batch GET 400 | New string. Clear and precise — names the missing parameter. Appropriate for an API error. **Pass.** |
| 8 | `applicationIds must be a non-empty comma-separated list of up to 50 IDs.` | Batch GET 400 | New string. Technical language ("comma-separated") is appropriate — this is an API error, not a UI error; callers are developers or FE code. Constraint (50 IDs max) is explicit. **Pass.** |
| 9 | `Unable to retrieve your application snapshots. Please try again later.` | Batch GET 500 | New string. Generic safe error — no stack trace, no internal terms, no DB identifiers. "Please try again later" is appropriate for a transient server error. **Pass.** |
| 10 | `applicationId is required.` (single-app endpoint) | Single GET 400 | Existing string — intact, not affected by new batch code. **Pass.** |
| 11 | `Unable to retrieve your application snapshot. Please try again later.` (single-app endpoint) | Single GET 500 | Existing string — intact. **Pass.** |
| 12 | `privacyNote` — single-app endpoint | `getApplicantApplicationSnapshot` line 96 | **Wording diverged from batch endpoint.** Single-app said "Personal attributes such as..." (shorter form from previous NOTIFY Fix 7). Batch says "Protected personal attributes (such as...) are never included in completeness scoring." The FE renders whichever string the API returns — both endpoints now feed the same `snap.privacyNote` field, so inconsistent wording produces inconsistent UI across application cards. **Fixed** — single-app endpoint now matches batch endpoint wording. |
| 13 | `privacyNote` — batch endpoint | `getApplicantApplicationSnapshotsBatch` line 215 | Canonical wording. No change needed. **Pass.** |

### BE Script (developer-facing only)

`backfill_application_snapshots.js` — all messages are `console.log/warn/error` output for developer CLI use only. No user-facing strings. Out of scope.

---

## Findings Detail

### Finding 1 — Arrow not aria-hidden on CTA (LOW — accessibility)
**File:** `applicant-applications.component.html` line 60
**Before:** `<a ... >Update your profile →</a>`
**After:** `<a ... >Update your profile <span aria-hidden="true">→</span></a>`
Screen readers will now read "Update your profile" without the trailing "right-pointing arrow" announcement. Link text remains self-describing out of context.

### Finding 2 — privacyNote wording inconsistency (LOW — copy consistency)
**File:** `applicationController.js` line 96 (`getApplicantApplicationSnapshot`)
**Before:** `"Personal attributes such as gender, age, religion, and disability status are never part of this score."`
**After:** `"Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."`
The previous NOTIFY pass (Fix 7) deliberately shortened the string for the single-app endpoint. The new batch endpoint used the longer form. Since the FE reads `snap.privacyNote` from whichever endpoint responds, mixed wording would produce inconsistent UI across application cards depending on which endpoint served the data. Aligned to the batch endpoint wording (longer form is more precise: "Protected", "included in completeness scoring").

### Finding 3 — Gate E: 51+ IDs swallowed silently (INFORMATIONAL — by design)
**Mechanism:** `catchError(() => of({}))` in `applicant-applications.component.ts` line 57.
**Behavior:** If the batch endpoint returns 400 (e.g., 51+ applicationIds), the error is caught and resolved to an empty map. `snapshotsLoaded = true`. All `snapshotFor()` calls return `null`. The `#snapSilent` template fires per application row: "Snapshot unavailable right now." Not alarming, not misleading (snapshots are a supplementary feature). No fix needed.

---

## No Issues Found In
- BE error string safety (Gate C): no stack traces, no internal DB schema, no raw error objects in any error response
- Existing string integrity (Gate D): all 4 carry-over strings present at expected template locations
- privacyNote placement (Gate B): renders cleanly after disclaimerNote, logically sequenced

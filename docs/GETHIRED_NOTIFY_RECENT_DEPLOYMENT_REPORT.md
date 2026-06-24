# GETHIRED NOTIFY — Recent Deployment: Application Snapshots System
**Date:** 2026-06-24
**Scope:** Application Snapshot feature — BE controllers + service + FE employer snapshot card

---

## 1. Message Inventory

### A. FE: `job-applicants.component.html`

| # | Location | String | Type |
|---|----------|--------|------|
| 1 | Applicant list, `role="note"` | "Match Signals are decision-support indicators based on the job post and submitted applicant information. Review the full application before making hiring decisions. Match Signals should not be used as the sole basis for hiring decisions." | Disclaimer |
| 2 | Snapshot card, heading | "Application Snapshot" | Section label |
| 3 | Snapshot card, loading state | `aria-label="Loading application snapshot"` (skeleton) | Loading |
| 4 | Snapshot card, null state | "No snapshot was captured for this application. Snapshots are recorded at submission time." | Empty state |
| 5 | Completeness section label | "Completeness" | Label |
| 6 | Completeness badge values | "excellent" / "strong" / "basic" / "incomplete" | Labels |
| 7 | Match section label | "Signal strength at submission" | Label |
| 8 | Match badge display values | "Strong" / "Partial" / "Limited" / "Limited data" | Labels |
| 9 | Disclaimer paragraph | `{{ snapshotSummary.matchDisclaimer }}` (sourced from BE `DISCLAIMER` constant) | Disclaimer |

### B. BE: `controllers/applicationController.js`

| # | Location | String | Type |
|---|----------|--------|------|
| 10 | `submitApplication` catch | "Something went wrong. Please try again later." | Error |
| 11 | `getApplicantApplicationSnapshot`, missing `applicationId` | "applicationId is required." | Validation (internal only — not shown to end users) |
| 12 | `getApplicantApplicationSnapshot`, app not found | "Application not found." | Error (applicant-facing) |
| 13 | `getApplicantApplicationSnapshot`, ownership fail | "Forbidden." | Error (applicant-facing) |
| 14 | `getApplicantApplicationSnapshot` catch | "Unable to retrieve your application snapshot. Please try again later." | Error |
| 15 | `getApplicantApplicationSnapshot`, `disclaimerNote` field | "Application completeness measures submitted information, not candidate quality. It is not a hiring score." | Disclaimer (applicant-facing) |
| 16 | `getApplicantApplicationSnapshot`, `privacyNote` field | "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring." | Privacy note (applicant-facing) |
| 17 | `getEmployerApplicantSnapshotSummary`, missing `applicationId` | "applicationId is required." | Validation (internal only) |
| 18 | `getEmployerApplicantSnapshotSummary`, all Forbidden paths | "Forbidden." | Error (employer-facing) |
| 19 | `getEmployerApplicantSnapshotSummary` catch | "Unable to retrieve application summary. Please try again later." | Error |

### C. BE: `services/applicationSnapshotService.js`

| # | Location | String | Type |
|---|----------|--------|------|
| 20 | `scoreApplicationCompleteness`, `missingRequired`, `basic_profile` reason | "Helps employers understand your current professional focus" | Reason (applicant-facing) |
| 21 | `scoreApplicationCompleteness`, `missingRequired`, `work_experience` reason | "Helps employers understand your work history" | Reason (applicant-facing) |
| 22 | `scoreApplicationCompleteness`, `missingRequired`, `skills` reason | "Lets employers see what you can do and how you align with the role" | Reason (applicant-facing) |
| 23 | `scoreApplicationCompleteness`, `missingRecommended`, `education` reason | "Gives employers a fuller picture of your background" | Reason (applicant-facing) |
| 24 | `scoreApplicationCompleteness`, `missingRecommended`, `cv_submitted` reason | "A CV gives employers more detail to review alongside your application" | Reason (applicant-facing) |
| 25 | `scoreApplicationCompleteness`, `missingRecommended`, `video_answers` reason | "Video answers let you present yourself beyond a written application" | Reason (applicant-facing) |
| 26 | `scoreApplicationCompleteness`, `missingRecommended`, `certifications` reason | "Certifications can strengthen your profile for roles that require specific credentials" | Reason (applicant-facing) |
| 27 | `completedSections` strings | "Basic profile (job title)", "Work experience", "Skills", "Education", "CV/document submitted with application", "Video answers submitted", "Certifications" | Labels (applicant-facing) |
| 28 | `evidence.disclaimerNote` | "Application completeness measures submitted information, not candidate quality. It is not a hiring score." | Disclaimer (internal evidence block) |
| 29 | `buildVideoAnswersSnapshot`, `noteForReview` | "Video answer URLs are stored in interview_answers table. References only in snapshot." | Internal developer note — never shown to users |
| 30 | `persistApplicationSnapshot`, `provenance.note` (backfill) | "Generated from current profile/job data; not original submission-time record." | Internal provenance — never shown to users |
| 31 | `persistApplicationSnapshot`, `provenance.note` (submit) | "Captured at application submission time." | Internal provenance — never shown to users |
| 32 | `excludedFactors.note` | "Protected attributes are never scored or persisted in match evidence." | Internal match evidence field |
| 33 | `excludedFactors.certificationLicenseMatching` | "Not implemented in current match algorithm version." | Internal match evidence field |
| 34 | `excludedFactors.personalityAnalysis` | "Not implemented; excluded by design." | Internal match evidence field |

### D. BE: `services/match/employerApplicantSignalsService.js`

| # | Location | String | Type |
|---|----------|--------|------|
| 35 | `DISCLAIMER` constant | "Match Signals are decision-support indicators based on the job post and submitted applicant information. Review the full application before making hiring decisions. Match Signals should not be used as the sole basis for hiring decisions." | Disclaimer (employer-facing) |
| 36 | `labelFor()`, score labels | "Limited Data", "Strong Signals", "Good Signals", "Needs Review", "Missing Required Signals" | Internal labels (mapped by `mapMatchLevel` before reaching UI) |
| 37 | `getApplicantFitSignals`, no-profile path | label: "Limited Data" | Internal |

**Total messages inventoried: 37**
**User-facing (shown to employer or applicant): 29**
**Internal/developer-only: 8**

---

## 2. Issues Found

### CRITICAL (Safety)

**Issue C1 — Raw error objects in user-facing responses (FIXED)**
All three `catch` blocks in `applicationController.js` originally sent `"ERROR: " + error` as the `error` field, which serializes the full JS error object including potential stack traces, query strings, and internal variable names. This exposes internals to end users.
- Affected: `submitApplication`, `getApplicantApplicationSnapshot`, `getEmployerApplicantSnapshotSummary`
- Status: **Fixed**

**Issue C2 — Technical field names in `privacyNote` (FIXED)**
The original `privacyNote` contained `EXCLUDED_FIELDS.slice(0,6).join(", ")` — a raw comma-joined list of database column names (e.g., `gender, civil_status, date_of_birth, religion, nationality, political_views`). Applicants seeing `civil_status` and `political_views` as column identifiers is technical jargon with no UX value.
- Status: **Fixed**

### MODERATE (Copy Quality)

**Issue M1 — Null state gave no context (FIXED)**
"No snapshot available for this application." tells employers nothing about why. Employers may wonder if this is an error state.
- Status: **Fixed**

**Issue M2 — Match badge showed raw internal values (FIXED)**
The badge displayed the raw `matchLevel` enum values `"strong"`, `"possible"`, `"low"` directly. `"low"` in a grey badge reads as punitive/grading language to employers who may act on it. `"possible"` is ambiguous. These are internal enum names, not display labels.
- Status: **Fixed** — mapped to "Strong" / "Partial" / "Limited" / "Limited data"

**Issue M3 — "Match level at submission" phrasing was awkward (FIXED)**
The section label read "Match level at submission" which is slightly telegraphic. "Signal strength at submission" is clearer and consistent with the disclaimer language ("Match Signals").
- Status: **Fixed**

**Issue M4 — `missingRequired` reason strings were impersonal/technical (FIXED)**
Original reasons were written from the system's perspective ("Required for employer to understand...") rather than from the applicant's perspective. Since these are returned to applicants in the `/applicant/application/snapshot` endpoint, they should be written in second person.
- Status: **Fixed** (7 reason strings updated)

**Issue M5 — `disclaimerNote` wording was inconsistent across two locations**
In `applicationController.js` the disclaimerNote said "It is not a hiring score." but in `applicationSnapshotService.js` the `evidence.disclaimerNote` said "This is not a hiring decision." These are logically identical but used different phrasing, which creates inconsistency when both surfaces are compared.
- Status: **Fixed** — aligned to "It is not a hiring score." in both locations

### MINOR (Tone / Accessibility)

**Issue A1 — Loading state had no `aria-live` or accessible label**
Original loading state was a plain `<div class="text-muted small">Loading snapshot...</div>` with no ARIA attributes. The file as deployed already corrected this with a skeleton loader and `aria-live="polite"`, `aria-atomic="true"`, and `role="status"` on the skeleton container. Confirmed adequate.

**Issue A2 — Completeness badge had no accessible label**
The badge conveyed meaning via color and text alone. The deployed file had already added `[attr.aria-label]="'Completeness level: ' + snapshotSummary.completenessLevel"`. Confirmed adequate.

**Issue A3 — Match badge `aria-label` referenced old raw values**
The `aria-label` used `snapshotSummary.matchLevel` raw, which would read "Match level: low" to screen readers. Fixed to use the same display-mapped label as the badge text.
- Status: **Fixed** (inline with the match badge fix)

---

## 3. Tone Review

### Match Disclaimer
**Rating: PASS — appropriate.**
The `DISCLAIMER` string in `employerApplicantSignalsService.js` (which flows through to the FE as `matchDisclaimer`) is:
> "Match Signals are decision-support indicators based on the job post and submitted applicant information. Review the full application before making hiring decisions. Match Signals should not be used as the sole basis for hiring decisions."

This is measured, clear, and not alarmist. It names the limitation without undermining the feature's utility. The same text appears verbatim in the FE applicant list disclaimer (`role="note"`) and the snapshot card disclaimer paragraph — consistent across both surfaces.

### Completeness Labels
**Rating: PASS after fix.**
- "excellent" (>=90%) — positive, not over-claiming
- "strong" (>=70%) — positive, grounded
- "basic" (>=40%) — neutral, factual, shown in amber/warning badge (not red)
- "incomplete" (<40%) — descriptive, not punitive; shown in grey (neutral), not red

None of these labels constitute shaming language. The disclaimer in the evidence block ("not candidate quality") ensures the score is contextualized. Employers see these alongside the percentage so the label is not the sole signal.

### BE Error Messages
**Rating: PASS after fixes.**
All three `catch` blocks now return plain English, action-oriented messages. No stack traces, no SQL, no internal identifiers, no token values in any user-facing error.

### `privacyNote` (Applicant-Facing)
**Rating: PASS after fix.**
Updated to plain English: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring." — human-readable examples instead of raw field names.

---

## 4. Empty / Loading / Error State Review (Employer Snapshot Card)

| State | Before | After | Rating |
|-------|--------|-------|--------|
| Loading | Plain `<div>Loading snapshot...</div>`, no ARIA | Skeleton with `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `aria-label="Loading application snapshot"` | PASS |
| Null (no snapshot) | "No snapshot available for this application." | "No snapshot was captured for this application. Snapshots are recorded at submission time." | PASS |
| Error (API fails) | Not rendered — component shows nothing if `snapshotSummary` is falsy; no user-visible error | Same — component silently hides the card on error (acceptable; card is supplementary, not primary) | PASS (acceptable for supplementary card) |
| Has snapshot | Badge shows raw enum values | Badge shows mapped display labels with `aria-label` | PASS |

---

## 5. Fixes Applied Summary

10 copy fixes applied across 3 files. See GETHIRED_NOTIFY_RECENT_DEPLOYMENT_FIX_LOG.md for full detail.

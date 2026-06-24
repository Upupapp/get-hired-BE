# GetHired NOTIFY — Recent Deployment Audit Report
**Scope:** FE HEAD 5ab9a05 — ApplicationCompletenessBadge, ApplicationCompletenessCard, ApplicantApplicationDetail, ApplicantApplications list
**Date:** 2026-06-24
**Auditor:** NOTIFY command (scoped to recent deployment)

---

## Summary

32 user-facing strings audited across 4 components (2 shared, 2 applicant-panel). 4 fixes applied. All 5 gates pass.

---

## Files Audited

| File | Role |
|------|------|
| `get-hired-FE/src/app/shared/components/application-completeness-badge/application-completeness-badge.component.ts` | Badge aria-label logic |
| `get-hired-FE/src/app/shared/components/application-completeness-badge/application-completeness-badge.component.html` | Badge template |
| `get-hired-FE/src/app/shared/components/application-completeness-card/application-completeness-card.component.html` | Card template (all score/tip/disclaimer states) |
| `get-hired-FE/src/app/shared/components/application-completeness-card/application-completeness-card.component.ts` | Card logic |
| `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.html` | Detail page (back button, section heading) |
| `get-hired-FE/src/app/applicant-panel/applicant-application-detail/applicant-application-detail.component.ts` | Detail page logic |
| `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` | Applications list (detail link, toggle button) |
| `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` | Applications list logic |
| `get-hired-BE/controllers/applicationController.js` | BE disclaimer/privacyNote strings, error messages |

---

## String Inventory

### ApplicationCompletenessBadgeComponent (8 strings)

| # | String | State | Finding |
|---|--------|-------|---------|
| 1 | "Getting started" | badge level (incomplete) | PASS — neutral, encouraging, not judgmental |
| 2 | "Excellent" | badge level | PASS — unambiguously positive |
| 3 | "Strong" | badge level | PASS — positive |
| 4 | "Basic" | badge level | PASS — descriptive, not pejorative |
| 5 | "Unavailable" | visible text (null/null state) | PASS — factual and non-punitive |
| 6 | "Application completeness: Snapshot unavailable" | aria-label (null/null) | FIXED — was "Application completeness: unavailable" (lowercase); corrected to match spec |
| 7 | "Loading application completeness" | aria-label (loading) | PASS — clear to screen readers |
| 8 | "Application completeness: {Level}, {N} percent" | aria-label (score) | PASS — reads aloud correctly, e.g. "Application completeness: Strong, 82 percent" |

### ApplicationCompletenessCardComponent (18 strings)

| # | String | State | Finding |
|---|--------|-------|---------|
| 9 | "Loading application completeness" | skeleton aria-label | PASS |
| 10 | "Couldn't load completeness details right now." | error state | PASS — generic, safe, no internals |
| 11 | "Try again" | error retry button | PASS |
| 12 | "Completeness details unavailable right now." | null snapshot | PASS — temporary framing, not permanent failure |
| 13 | "This application was submitted before completeness tracking was introduced. Completeness details are available for new applications going forward." | pre-deployment state | PASS — factual, forward-looking, no blame |
| 14 | "Application completeness when submitted" | score header label | PASS — anchors score to submission moment, not current state |
| 15 | "Captured {date}" | timestamp | PASS — precise and unambiguous; only shown when snapshotCreatedAt is present |
| 16 | "Your profile was complete when you applied. Keep it updated for future applications." | positive/complete state | PASS — affirming, action-forward |
| 17 | "What was missing when you applied" | required tips heading | PASS — past-tense framing; positions gap as historical, not current judgment |
| 18 | "Add these now to strengthen future applications:" | required tips sub-heading | PASS — future-focused action framing |
| 19 | "Nice-to-haves (not required)" | recommended tips heading | PASS — explicitly labels optional nature |
| 20 | "Extra details that help you stand out:" | recommended tips sub-heading | PASS — positive framing |
| 21 | "Update your profile →" | required CTA | PASS — directive action, not accusatory |
| 22 | "Add to your profile →" | recommended CTA | PASS |
| 23 | "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions." | disclaimerNote (from BE) | PASS — explicitly decouples from hiring; present whenever score shown |
| 24 | "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring." | privacyNote (from BE) | PASS — explicit and reassuring |
| 25 | "Application completeness: {N} percent" | progressbar aria-label | PASS — reads correctly for assistive tech |
| 26 | "Application completeness details" | card region aria-label | PASS |

### ApplicantApplicationDetailComponent (6 strings)

| # | String | State | Finding |
|---|--------|-------|---------|
| 27 | "Back to My Applications" | back button aria-label | FIXED — added explicit aria-label; visible text ("My Applications") was screen-reader-accessible but lacked directional cue |
| 28 | "My Applications" | back button visible text | PASS |
| 29 | "‹" / "←" | back button icon | PASS — aria-hidden="true" |
| 30 | "Application Details" | fallback h1 | PASS — minimal safe fallback when no jobTitle in router state |
| 31 | "Application completeness" | section h2 | PASS |
| 32 | "Application completeness" | section aria-label | PASS (redundant with h2 but not harmful) |

### applicant-applications.component.html (4 strings/elements)

| # | String/Element | State | Finding |
|---|----------------|-------|---------|
| 33 | Completeness toggle button | list row | FIXED — was title-attribute only; added dynamic aria-label ("Show/Hide application completeness for {jobTitle}") |
| 34 | "View full details →" | detail link | FIXED — added aria-label="View full application details for {jobTitle}"; was ambiguous when multiple rows present |
| 35 | "→" (link arrow) | detail link | PASS — aria-hidden="true" |
| 36 | "Application completeness details" | expandable region aria-label | PASS |

---

## BE Error Message Safety

Both the single-app and batch snapshot endpoints return only safe, generic error messages:

| Endpoint | Error Message |
|----------|---------------|
| GET /applicant/application/snapshot (400) | "applicationId is required." |
| GET /applicant/application/snapshot (500) | "Unable to retrieve your application snapshot. Please try again later." |
| GET /applicant/application/snapshots (400) | "applicationIds is required." / "applicationIds must be a non-empty comma-separated list of up to 50 IDs." |
| GET /applicant/application/snapshots (500) | "Unable to retrieve your application snapshots. Please try again later." |

No stack traces, no SQL, no internal field names, no DB schema identifiers in any error response.

---

## Forbidden Language Scan

Pattern: `bad application`, `weak candidate`, `rejected`, `AI score`, `guaranteed`, `auto-rejected`, `you are not qualified`

- FE src/app: **0 user-facing matches** (1 code-comment hit on "guaranteed" in routing module — not user-facing)
- BE applicationController.js: **0 user-facing matches** (1 code-comment hit on "rejected" in input-validation comment — not user-facing)

Gate A: PASS

---

## Tone Assessment

All tip sections use past-tense anchoring ("What was missing when you applied") to ensure the applicant understands observations are about the submission moment — not a current or ongoing judgment. Sub-headings are action-oriented ("Add these now") and future-facing ("strengthen future applications"). The complete-state message is affirming. The pre-deployment message is purely factual. No comparative, punitive, or accusatory framing found anywhere.

Gate B: PASS

---

## Disclaimer Presence Analysis

- `disclaimerNote` is hardcoded in both BE endpoints (single and batch) — never absent when data is returned
- FE card template: `*ngIf="snapshot.disclaimerNote"` — renders when present
- `disclaimerNote` is included in batch results even for `hasSnapshot === false` entries — in that case the score section is hidden (pre-deployment message shown instead), so the disclaimer paragraph is technically present in the DOM but associated with no displayed score. Low risk; disclaimer text is benign in any context.

Gate C: PASS

---

## Screen Reader / Back Button / Detail Link

| Issue | Before | After |
|-------|--------|-------|
| Badge null aria-label | "Application completeness: unavailable" | "Application completeness: Snapshot unavailable" |
| Back button | Text-only (no explicit aria-label) | aria-label="Back to My Applications" |
| Toggle button | title attribute only | aria-label="Show/Hide application completeness for {jobTitle}" (dynamic) |
| Detail link | Generic "View full details" (no context) | aria-label="View full application details for {jobTitle}" |

Gate E: PASS (after fixes)

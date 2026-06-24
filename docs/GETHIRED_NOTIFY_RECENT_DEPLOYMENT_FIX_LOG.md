# GETHIRED NOTIFY — Fix Log: Applicant Completeness View
**Scope:** FE 76c545e / BE faa2232
**Date:** 2026-06-24
**Rule:** Small/safe copy fixes only — no logic changes, no business rule changes, no schema changes. No emails sent.

---

## Fix 1 — Outer snapshot div: add role for aria-label to take effect
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Old:** `<div class="app-snapshot" *ngIf="app.jobApplicationId" aria-label="Application completeness">`
**New:** `<div class="app-snapshot" *ngIf="app.jobApplicationId" role="region" aria-label="Application completeness snapshot"`
**Why (Gate E):** A plain `<div>` has no ARIA role, so `aria-label` is ignored by screen readers. Adding `role="region"` makes this a named landmark. Also updated label from "Application completeness" to "Application completeness snapshot" to distinguish it from the inner score region.

---

## Fix 2 — Null state: remove technical phrase "completeness tracking was enabled"
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Old:** `"Snapshot not available — this application was submitted before completeness tracking was enabled."`
**New:** `"Completeness details aren't available for this application — it was submitted before this feature was introduced."`
**Why (Gate A):** "Completeness tracking was enabled" is internal technical phrasing. Users have no context for when or why tracking was enabled. Plain equivalent explains the same fact in user terms.

---

## Fix 3 — "Incomplete" badge label: replace with non-punitive label
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Old:** `{{ snap.completenessLevel | titlecase }}` → renders "Incomplete" for scores <40%
**New:** `{{ snap.completenessLevel === 'incomplete' ? 'Getting started' : (snap.completenessLevel | titlecase) }}`
**Why (Gate C):** Showing "Incomplete" next to an applicant's own application carries a judgment of failure. The score simply means the application had fewer than 40% of the tracked fields — "Getting started" conveys the same factual state without the harsh self-assessment framing.

---

## Fix 4 — Required tips heading: reframe as snapshot-at-submit, not current profile
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Old:** `"Complete your profile to strengthen future applications:"`
**New:** `"What was missing when you applied — add these now for stronger future applications:"`
**Why (Gate B):** "Complete your profile" implies the tips describe a gap in the applicant's live profile today. They actually reflect what was absent at submission time (a frozen snapshot). Some tips (e.g. "submitted a CV", "video answers") are not profile fields at all. The new heading clarifies the past context while still pointing forward with an actionable call.

---

## Fix 5 — Recommended tips heading: make "not required" explicit
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Old:** `"Optional ways to stand out:"`
**New:** `"Extra details that can help you stand out (not required):"`
**Why (Gate C):** "Optional ways to stand out" could be read as "ways you failed to stand out on this application" — subtly negative framing. Adding "(not required)" makes the voluntary nature unambiguous so anxious applicants don't interpret the list as a to-do they must complete.

---

## Fix 6 — disclaimerNote (controller): reframe to lead with what the score is
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `"Application completeness measures submitted information, not candidate quality. It is not a hiring score."`
**New:** `"This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions."`
**Why (Gate C):** "It is not a hiring score" plants the concept of a hiring score through negation. Leading with a positive definition ("reflects how much information was included") establishes the right frame before the clarification. "No effect on hiring decisions" is more reassuring and concrete than "not a hiring score".

---

## Fix 7 — privacyNote (controller): shorter, plainer English
**File:** `get-hired-BE/controllers/applicationController.js`
**Old:** `"Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."`
**New:** `"Personal attributes such as gender, age, religion, and disability status are never part of this score."`
**Why:** Minor simplification — "Protected personal attributes" is slightly legalistic; "Personal attributes" is equally clear. "Never part of this score" is shorter and more direct than "never included in completeness scoring".

---

## Fix 8 — disclaimerNote (service evidence block): align with controller
**File:** `get-hired-BE/services/applicationSnapshotService.js`
**Old:** `"Application completeness measures submitted information, not candidate quality. It is not a hiring score."`
**New:** `"This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions."`
**Why:** Aligns the evidence-block copy with the controller's disclaimerNote (Fix 6). The evidence block is internal (persisted to DB) but consistency avoids confusion if it is ever surfaced in debugging or future transparency tooling.

---

## Fix 9 — Required tip reasons: reframe from employer-perspective to applicant action
**File:** `get-hired-BE/services/applicationSnapshotService.js`

| Field | Old | New |
|---|---|---|
| `basic_profile` | "Helps employers understand your current professional focus" | "Add a job title to your profile so employers can see your current professional focus at a glance." |
| `work_experience` | "Helps employers understand your work history" | "Add your work history so employers can see what roles and responsibilities you've had." |
| `skills` | "Lets employers see what you can do and how you align with the role" | "List your skills so employers can see how well you match what the role needs." |

**Why (Gate D):** All three opened with "Helps employers..." — a third-person employer-benefit statement. These strings are rendered to the *applicant* below their own score. They should open with an imperative verb ("Add", "List") addressed to the applicant, with the employer benefit as the reason, not the opener.

---

## Fix 10 — Recommended tip reasons: same reframe, plus imperative-led
**File:** `get-hired-BE/services/applicationSnapshotService.js`

| Field | Old | New |
|---|---|---|
| `education` | "Gives employers a fuller picture of your background" | "Add your education history to give employers a fuller picture of your background." |
| `cv_submitted` | "A CV gives employers more detail to review alongside your application" | "Upload a CV to give employers more detail to review alongside your application." |
| `video_answers` | "Video answers let you present yourself beyond a written application" | "Record a video answer to present yourself in your own words, beyond what's on the page." |
| `certifications` | "Certifications can strengthen your profile for roles that require specific credentials" | "Add any certifications you hold to strengthen your profile, especially for roles that ask for specific credentials." |

**Why (Gate D):** Same issue as Fix 9. Additionally "Video answers let you present yourself" reads as a product claim, not an instruction. "Record a video answer to..." gives the applicant a clear action. "Roles that require specific credentials" → "roles that ask for specific credentials" is plainer English.

---

**Total fixes applied: 10 (Fixes 1–10 above)**
Files changed:
- `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` — Fixes 1–5
- `get-hired-BE/controllers/applicationController.js` — Fixes 6–7
- `get-hired-BE/services/applicationSnapshotService.js` — Fixes 8–10

No logic was changed. No business rules were changed. No schema was changed. No emails were sent.

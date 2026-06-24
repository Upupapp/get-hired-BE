# GETHIRED NOTIFY — Release Gate: Applicant Completeness View
**Scope:** FE 76c545e / BE faa2232
**Date:** 2026-06-24

---

## Gate A — No Internal Jargon
**Status: PASS (after fix)**

Verified: no DB column names, no internal enum values, no technical system terminology in any user-facing string after fixes.

- Null state: was "before completeness tracking was enabled" (internal system phrase) → fixed to "before this feature was introduced"
- `privacyNote`: verified no raw column names such as `civil_status`, `political_views` in current copy
- All `reason` strings: verified — no field names, no DB identifiers, no algorithm terminology
- Error messages in controller: no stack traces, no query strings, no internal identifiers

---

## Gate B — Accurate Snapshot-at-Submit Framing
**Status: PASS (after fix)**

The completeness view reflects the applicant's submitted state at the time of application, not their current live profile. This distinction must be clear to the applicant.

Verified:
- Required tips heading: "What was missing when you applied — add these now for stronger future applications:" — explicitly anchors to the past submission event
- Tips include fields like "submitted a CV" and "video answers" which are not live profile fields; the new heading ("when you applied") covers all tip types correctly
- Null state: "it was submitted before this feature was introduced" — past tense, anchored to submission
- `disclaimerNote`: "how much information was included when you applied" — past tense, submission-anchored

No string implies the view reflects the applicant's current profile state.

---

## Gate C — Non-Alarming Copy
**Status: PASS (after fix)**

Verified:
- Badge "incomplete" → "Getting started": neutral, forward-looking, not a failure grade
- `disclaimerNote` leads with positive definition ("reflects how much information was included") before clarification — does not lead with negation
- "No effect on hiring decisions" is concrete and reassuring
- Recommended tips heading "(not required)" makes voluntary nature explicit
- No string uses language like "failed", "rejected", "missing", "incomplete" as a verdict
- Score badge colors: green (excellent/strong), amber (basic), grey (getting started) — no red; grey is neutral, not alarming

---

## Gate D — Actionable Tips
**Status: PASS (after fix)**

All 6 tip reason strings verified to open with an imperative verb addressed to the applicant:

| Tip | Opener | Verdict |
|---|---|---|
| basic_profile | "Add a job title to your profile..." | PASS |
| work_experience | "Add your work history..." | PASS |
| skills | "List your skills..." | PASS |
| education | "Add your education history..." | PASS |
| cv_submitted | "Upload a CV..." | PASS |
| video_answers | "Record a video answer..." | PASS |
| certifications | "Add any certifications..." | PASS |

No tip uses passive or employer-perspective framing. Each tip names the action before the benefit.

---

## Gate E — Accessible aria-labels
**Status: PASS (after fix)**

| Element | aria-label / role | Verdict |
|---|---|---|
| Outer snapshot `div` | `role="region" aria-label="Application completeness snapshot"` | PASS — landmark with meaningful name |
| Skeleton loader | `role="status" aria-label="Loading application snapshot"` | PASS |
| Inner score div | `role="region" aria-label="Completeness score"` | PASS |
| Level badge | `aria-label="Completeness level: <level>"` | PASS — name includes level value |
| Score percentage | `<strong>` — visible number; no screen-reader-only label needed as label is adjacent | PASS |

Note: the linter also added `aria-live="polite" aria-atomic="true"` to the outer snapshot div, ensuring screen readers announce when the async snapshot data loads. This is a meaningful a11y improvement.

---

## Gate Summary

| Gate | Pre-fix | Post-fix |
|---|---|---|
| A — No internal jargon | FAIL | PASS |
| B — Accurate framing | FAIL | PASS |
| C — Non-alarming | FAIL | PASS |
| D — Actionable tips | FAIL | PASS |
| E — Accessible | FAIL | PASS |

**Overall release gate: PASS**

10 copy fixes applied across 3 files. No logic, business rules, or schema were changed. No emails sent.

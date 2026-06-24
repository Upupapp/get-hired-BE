# GETHIRED NOTIFY — Recent Deployment Audit Report
**Scope:** Applicant Completeness View (FE 76c545e, BE faa2232)
**Date:** 2026-06-24
**Auditor:** NOTIFY command (GETHIRED)

---

## Files Audited

| File | Role |
|---|---|
| `src/app/applicant-panel/applicant-applications/applicant-applications.component.html` | All user-facing strings in the completeness snapshot UI |
| `src/app/applicant-panel/applicant-applications/applicant-applications.component.ts` | Error handling — no user-facing strings |
| `services/applicationSnapshotService.js` | Reason strings for required/recommended tips; evidence disclaimerNote |
| `controllers/applicationController.js` | `disclaimerNote` and `privacyNote` sent to applicant |

---

## Message Inventory (17 audited)

| # | Location | Message | User-facing? |
|---|---|---|---|
| 1 | HTML outer div | `aria-label="Application completeness"` (no role) | Yes — a11y only |
| 2 | HTML null state | "Snapshot not available — this application was submitted before completeness tracking was enabled." | Yes |
| 3 | HTML label | "Application completeness" | Yes |
| 4 | HTML badge | `snap.completenessLevel \| titlecase` → "Incomplete" when level is incomplete | Yes |
| 5 | HTML required tips heading | "Complete your profile to strengthen future applications:" | Yes |
| 6 | HTML recommended tips heading | "Optional ways to stand out:" | Yes |
| 7 | HTML disclaimer | `{{ snap.disclaimerNote }}` (from API) | Yes |
| 8 | HTML loading | `aria-label="Loading application snapshot"` | Yes — a11y only |
| 9 | HTML inner region | `aria-label="Completeness score"` | Yes — a11y only |
| 10 | HTML badge | `aria-label="Completeness level: <level>"` | Yes — a11y only |
| 11 | BE controller | `disclaimerNote`: "Application completeness measures submitted information, not candidate quality. It is not a hiring score." | Yes |
| 12 | BE controller | `privacyNote`: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring." | Yes |
| 13 | BE service (required) | reason: "Helps employers understand your current professional focus" | Yes (shown to applicant) |
| 14 | BE service (required) | reason: "Helps employers understand your work history" | Yes |
| 15 | BE service (required) | reason: "Lets employers see what you can do and how you align with the role" | Yes |
| 16 | BE service (recommended) | reason: "Gives employers a fuller picture of your background" | Yes |
| 17 | BE service (recommended) | reason: "A CV gives employers more detail to review alongside your application" / "Video answers let you present yourself beyond a written application" / "Certifications can strengthen your profile..." | Yes (3 strings) |

---

## Gate Assessment — Pre-fix

| Gate | Status | Key Failure |
|---|---|---|
| A — No internal jargon | FAIL | "completeness tracking was enabled" — internal system phrasing |
| B — Accurate framing (snapshot-at-submit) | FAIL | "Complete your profile" implies updating the live profile, not that tips reflect missing fields at time of application |
| C — Non-alarming | FAIL | Badge label "Incomplete" is harsh self-assessment language; disclaimerNote leads with "It is not a hiring score" which plants the hiring-score concept |
| D — Actionable tips | FAIL | All 6 reason strings framed from employer perspective ("Helps employers..."), not applicant action instructions |
| E — Accessible | FAIL | Outer `div` had `aria-label` but no `role`, making the label inert to screen readers |

---

## Issues Detail

### Gate A — Jargon
- "before completeness tracking was enabled" — applicants have no context for what "tracking" means or when it was "enabled". Plain equivalent: "before this feature was introduced."

### Gate B — Snapshot-at-submit framing
- "Complete your profile to strengthen future applications:" is ambiguous. It could mean:
  (a) "Update your live profile now" (incorrect reading of the tips — they describe what was missing at submit time, not a live profile gap)
  (b) "These were gaps in your submitted profile" (the intended meaning)
  The word "profile" compounds this: the tips include things like "submitted a CV" and "video answers" which are not profile fields. Fix: name the context explicitly — "What was missing when you applied — add these now for stronger future applications:"

### Gate C — Alarming language
- "Incomplete" as a badge for an applicant's own application: the level maps to <40% score. Showing "Incomplete" next to their application feels like a grade of failure. "Getting started" conveys the same factual state without the punitive framing.
- DisclaimerNote: "It is not a hiring score" — psychological research on negation shows negated concepts are still activated. Starting with the positive: "This score reflects how much information was included when you applied" is more reassuring before clarifying what it is not.

### Gate D — Actionable tips
All 6 reason strings open with "Helps employers..." or "Lets employers..." — third-person employer benefit language. These strings are rendered to the *applicant* beneath their score. They should open with an imperative verb addressed to the applicant ("Add...", "List...", "Upload...", "Record...").

### Gate E — Accessible aria-labels
`<div class="app-snapshot" aria-label="Application completeness">` — a plain `<div>` does not have an implicit ARIA role, so `aria-label` is ignored by screen readers. Adding `role="region"` makes this a landmark with a name.

---

## Gate Assessment — Post-fix

| Gate | Status | Evidence |
|---|---|---|
| A — No internal jargon | PASS | Null state: "it was submitted before this feature was introduced" |
| B — Accurate framing | PASS | Required tips heading: "What was missing when you applied — add these now for stronger future applications:" |
| C — Non-alarming | PASS | "Incomplete" → "Getting started"; disclaimerNote leads with what the score is |
| D — Actionable tips | PASS | All 6 reason strings open with imperative verb to the applicant |
| E — Accessible | PASS | `role="region" aria-label="Application completeness snapshot"` on outer div |

---

## Component.ts — Error Handling

No user-facing strings in `.component.ts`. Error path sets `this.error = true`, rendering the `role="alert"` block: "We couldn't load your applications right now. / Try again." — plain English, non-technical, appropriate. Snapshot failures are silently swallowed by design (fail-open, supplementary feature). The `#snapSilent` template now shows "Snapshot unavailable right now." rather than empty.

---

## Fixes Applied
17 user-facing messages audited. 12 changes applied across 3 files.
See `GETHIRED_NOTIFY_RECENT_DEPLOYMENT_FIX_LOG.md` for full diff detail.
See `GETHIRED_NOTIFY_RECENT_DEPLOYMENT_RELEASE_GATE.md` for gate sign-off.

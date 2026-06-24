# GetHired — Application Completeness Privacy, Fairness & Copy QA V2

**Date:** 2026-06-24  
**Phase:** 17

---

## Privacy Guardrails

### No Employer Data Shown
- PASS: Card/badge components receive only the applicant's own snapshot data
- PASS: No employer name, employer ID, or employer decision data rendered
- PASS: Snapshot data is authenticated: BE filters by JWT-authenticated user

### No Cross-Applicant Data
- PASS: `snapshotsMap` is keyed by `jobApplicationId`; each entry is fetched for the authenticated user's own application IDs only
- PASS: The BE `/applicant/application/snapshots` endpoint enforces applicant auth — confirmed via prior BE audit

### Privacy Note Display
- PASS: `snap.privacyNote` (from API) shown when present: "Only you can see this — it is never shared with employers."
- PASS: Privacy note uses lighter text (`#b0b7c3`) to subordinate it below the main disclaimer

### No Score Persistence
- PASS: Score data is not stored in localStorage, sessionStorage, or cookies
- PASS: Map is in-memory, destroyed on component destroy and navigation

---

## Fairness Guardrails

### No Hiring-Decision Language
- PASS: "Completeness" not "strength score" or "hiring chance"
- PASS: "What was missing when you applied" — past tense, factual about a point in time
- PASS: No "improve your score to get hired" framing
- PASS: "Getting started" replaces "Incomplete" — avoids negative framing of low scores

### Not Used for Discrimination
- PASS: Score not shown to employers (confirmed: this is the applicant-facing endpoint only)
- PASS: Disclaimer note always shown when score is present: from API `disclaimerNote` field
- PASS: Progress bar is additive (completion of positive items), not a deficiency meter

### Encouraging, Non-Shaming Copy
| Scenario | Copy Used |
|----------|-----------|
| Missing required | "What was missing when you applied — Add these now to strengthen future applications:" |
| Missing recommended | "Nice-to-haves (not required) — Extra details that help you stand out:" |
| All complete | "Your profile was complete when you applied. Keep it updated for future applications." |
| Pre-deployment | "This application was submitted before completeness tracking was introduced." |
| Unavailable | "Completeness details unavailable right now." (no "Error" language) |

---

## Copy Review

### Heading Changes from Inline Implementation
| Location | Before | After |
|----------|--------|-------|
| Required heading | "What was missing when you applied — add these now for stronger future applications:" | Split into heading + sub (cleaner hierarchy) |
| Recommended heading | "Extra details that can help you stand out (not required):" | "Nice-to-haves (not required)" + "Extra details that help you stand out:" |
| Score label | "Application completeness" | "Application completeness when submitted" (more explicit about timing) |

### Disclaimer
- Source: API `disclaimerNote` field (not hard-coded)
- Shown unconditionally when `hasSnapshot: true`
- Privacy note: API `privacyNote` field (shown when non-empty)

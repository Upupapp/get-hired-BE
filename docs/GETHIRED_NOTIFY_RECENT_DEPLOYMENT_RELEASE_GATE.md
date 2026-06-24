# GETHIRED NOTIFY — Release Gate: Recent Deployment Delta
**Scope:** FE 20a44c5 / BE 422d340
**Date:** 2026-06-24

---

## Gate A — CTA accessible: "→" has aria-hidden or text alternative; link text makes sense out of context
**Status: PASS (after fix)**

- `→` wrapped in `<span aria-hidden="true">` — screen readers skip the arrow character
- Link text "Update your profile" is self-describing out of context; no context-dependent phrasing like "click here" or "here"
- Verified: `routerLink="/user/profile/edit"` routes to the correct profile edit destination

---

## Gate B — privacyNote placement: renders below disclaimer without awkward juxtaposition
**Status: PASS**

- `disclaimerNote` renders first: "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions."
- `privacyNote` renders second: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring."
- Both rendered as `<p class="app-snapshot-disclaimer">` siblings inside `*ngIf="snap.hasSnapshot"` — sequenced logically (what the score is → what is never included)
- `privacyNote` guarded by `*ngIf="snap.privacyNote"` — only renders if the API supplies a value; no blank `<p>` if omitted
- Linter additionally added `app-snapshot-disclaimer--privacy` class for styling differentiation — no copy impact

---

## Gate C — Error messages safe: no stack traces, no internal terms exposed to API callers
**Status: PASS**

All three batch endpoint error messages verified:

| Error | Exposure check | Verdict |
|---|---|---|
| `"applicationIds is required."` | No DB names, no stack trace, no internal identifiers | PASS |
| `"applicationIds must be a non-empty comma-separated list of up to 50 IDs."` | Technical language appropriate for API caller; no system internals | PASS |
| `"Unable to retrieve your application snapshots. Please try again later."` | Generic safe message; raw error caught and logged server-side only (`console.error`) | PASS |

Single-app endpoint existing errors also verified intact and safe (no regression).

---

## Gate D — All previous strings intact: existing copy not accidentally overwritten
**Status: PASS**

| String | Expected location | Verified present |
|---|---|---|
| `"What was missing when you applied — add these now for stronger future applications:"` | HTML line 56 | Yes |
| `"Getting started"` (badge, incomplete level) | HTML line 50 | Yes |
| `"Completeness details aren't available for this application — it was submitted before this feature was introduced."` | HTML line 35 | Yes |
| `"Snapshot unavailable right now."` | HTML line 77 (`#snapSilent`) | Yes |

No existing strings were overwritten or regressed by template changes.

---

## Gate E — Batch 400 error: FE catchError swallows silently; no alarming message shown
**Status: PASS**

- `catchError(() => of({}))` at `applicant-applications.component.ts` line 57 catches all errors from the batch endpoint (including 400 for 51+ IDs)
- Resolves with empty map `{}`; `snapshotsLoaded` becomes `true`
- All `snapshotFor()` calls return `null` → `#snapSilent` template fires per row: "Snapshot unavailable right now."
- Result: soft, non-alarming degradation. Applicants see a neutral message rather than a technical error or blank space.
- FE currently sends at most N applicationIds where N = `applications.length`. The 50-ID limit would only be hit by applicants with 51+ applications. Even then the FE degrades gracefully.

---

## Gate Summary

| Gate | Status | Notes |
|---|---|---|
| A — CTA accessible | PASS | `→` aria-hidden; link text self-describing |
| B — privacyNote placement | PASS | Logical sequence after disclaimerNote; guarded by `*ngIf` |
| C — Error messages safe | PASS | No internals exposed; all errors are generic or parameter-naming only |
| D — Previous strings intact | PASS | All 4 carry-over strings present at expected locations |
| E — Batch 400 silent | PASS | `catchError(() => of({}))` degrades gracefully to soft unavailable message |

**Overall release gate for this deployment delta: PASS**

2 copy fixes applied (arrow aria-hidden + privacyNote alignment). No logic, business rules, or schema changed.

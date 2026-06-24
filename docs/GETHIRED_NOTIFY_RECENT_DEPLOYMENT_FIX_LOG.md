# GETHIRED NOTIFY — Fix Log: Recent Deployment Delta
**Scope:** FE 20a44c5 / BE 422d340
**Previous NOTIFY pass:** FE 76c545e / BE faa2232 (10 prior fixes, gates A–E all PASS)
**Date:** 2026-06-24
**Rule:** Small/safe copy fixes only — no logic changes, no business rule changes, no schema changes. No emails sent.

---

## Fix 1 — Arrow aria-hidden on CTA link
**File:** `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html`
**Line:** 60

**Before:**
```html
<a class="app-snapshot-cta" routerLink="/user/profile/edit">Update your profile →</a>
```

**After:**
```html
<a class="app-snapshot-cta" routerLink="/user/profile/edit">Update your profile <span aria-hidden="true">→</span></a>
```

**Why (Gate A — accessible link text):**
The `→` character (U+2192 RIGHT ARROW) was inside the link as raw text. Screen readers announce it literally as "right-pointing arrow" or "right arrow", breaking the natural reading of "Update your profile right arrow". Wrapping in `aria-hidden="true"` hides it from assistive technology while keeping it visually present. Link text "Update your profile" is self-describing out of context. No visual change for sighted users.

---

## Fix 2 — privacyNote wording alignment: single-app endpoint → batch endpoint
**File:** `get-hired-BE/controllers/applicationController.js`
**Line:** 96 (function `getApplicantApplicationSnapshot`)

**Before:**
```js
privacyNote: "Personal attributes such as gender, age, religion, and disability status are never part of this score.",
```

**After:**
```js
privacyNote: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring.",
```

**Why (copy consistency):**
The previous NOTIFY pass (Fix 7) deliberately shortened the privacyNote for the single-app endpoint. The new batch endpoint (`getApplicantApplicationSnapshotsBatch`, line 215) introduced the longer form. The FE applicant-applications component now calls the batch endpoint for all snapshot data — meaning the single-app endpoint's wording was inconsistent with what applicants now see. To avoid divergence if both endpoints are ever called in the same session, they are aligned to the batch endpoint's wording. The batch form is more precise: "Protected" signals these are legally sensitive attributes; "never included in completeness scoring" names the specific scoring process rather than "never part of this score" (ambiguous).

---

**Total fixes applied this pass: 2**

Files changed:
- `get-hired-FE/src/app/applicant-panel/applicant-applications/applicant-applications.component.html` — Fix 1
- `get-hired-BE/controllers/applicationController.js` — Fix 2

No logic was changed. No business rules were changed. No schema was changed. No emails were sent.

---

## Note on Linter Change (not a manual fix)
The linter automatically added class `app-snapshot-disclaimer--privacy` to the privacyNote `<p>` tag (line 72 of the HTML). This is a styling class addition — no copy change — and is consistent with the BEM modifier pattern used elsewhere in the component. Recorded here for traceability.

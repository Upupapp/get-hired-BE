# GetHired NOTIFY — Recent Deployment Audit Report
## NOTIFY-P2 — BE 2ff6358 / FE 1863842

**Audit date:** 2026-06-26
**Scope:** 3 FE components (import-add-user, import-add-contact, import-add-candidate) + styles.scss; codebase-wide false-positive scan

---

## Executive Summary

NOTIFY-P2 correctly eliminates false-positive success toasts across all three import/add flows. The logic is sound in all three components: each reads actual outcome data from the API response before choosing a toast class and message. No false-positive "Successfully added contact" or equivalent unconditional success strings remain.

This audit found and fixed 2 defects:

1. **Wrong noun in company-user all-failed copy** — "No contacts were added." used "contacts" for a flow that invites company colleagues, not CRM contacts. Fixed to "No invites were sent." which matches the success-path verb ("Invite sent.").
2. **`.success-snackbar` missing `color: #ffffff`** — background was set but text color was not, unlike all other snackbar classes. Angular Material would inherit dark text on the red background — a contrast failure. Fixed.

A prior automated BRAND pass (before this audit ran) also upgraded `.warning-snackbar` from `#f59e0b` (amber-400, 2.15:1 — WCAG AA fail) to `#b45309` (amber-800, 5.02:1 — WCAG AA pass) and tokenized both colors into `colors.scss`. Those changes are already in place.

---

## Message Quality Audit (NOTIFY Framework)

### import-add-user.component.ts — Company User Invite
**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

| Outcome | Message | Class | Duration | Quality |
|---|---|---|---|---|
| All sent (1 email) | "Invite sent." | success | 4000ms | Clear, honest |
| All sent (N emails) | "N invites sent." | success | 4000ms | Good specificity |
| Partial | "N sent. M couldn't be added." | warning | 6000ms | Honest, adequate |
| All failed | "No invites were sent." (FIXED from "No contacts were added.") | danger | 6000ms | Now correct noun |

**Noun mismatch issue (fixed):** The original all-failed message said "contacts" but this component handles company user invitations — colleagues and team members, not CRM contacts. The word "contacts" is used specifically for the employer contacts feature (import-add-contact). Using it here was both factually wrong and contradicted the success-path terminology ("Invite sent." / "N invites sent."). Fixed to "No invites were sent."

**Actionability gap (deferred):** Partial and all-failed cases do not identify which email addresses failed. Adding failure detail would require dialog-level UI changes (a failure list below the toast), not just toast copy. Flagged as D-01.

### import-add-contact.component.ts — Contacts
**File:** `src/app/employer-panel/employer-contacts/contact-list/dialogs/import-add-contact/import-add-contact.component.ts`

| Outcome | Message | Class | Duration | Quality |
|---|---|---|---|---|
| Single added | "Contact added." | success | 4000ms | Correct |
| Bulk all added (N=1) | "Contact added." | success | 4000ms | Consistent with single |
| Bulk all added (N>1) | "N contacts added." | success | 4000ms | Good |
| Partial | "N added. M couldn't be added." | warning | 6000ms | Honest |
| All duplicate (bulk) | "No new contacts were added. These contacts are already in your list." | info | 6000ms | Explains why — good |
| Single duplicate | "This contact is already in your list." | info | 5000ms | Clear, friendly |
| All failed (non-dup) | "No contacts were added." | danger | 6000ms | Correct |

Logic verified: reads `res.summary.successCount`, `failureCount`, `duplicateCount` for bulk; `res.status === 'DUPLICATE_CONTACT'` for single. No false positive possible.

Duration note: single duplicate 5000ms vs bulk 6000ms — acceptable (shorter message).

### import-add-candidate.component.ts — Candidates
**File:** `src/app/employer-panel/employer-contacts/candidate-list/dialogs/import-add-candidate/import-add-candidate.component.ts`

Mirror pattern to contacts; uses "candidate" / "candidates" throughout.

| Outcome | Message | Class | Duration | Quality |
|---|---|---|---|---|
| Single added | "Candidate added." | success | 4000ms | Correct |
| Bulk all added (N=1) | "Candidate added." | success | 4000ms | Consistent |
| Bulk all added (N>1) | "N candidates added." | success | 4000ms | Good |
| Partial | "N added. M couldn't be added." | warning | 6000ms | Honest |
| All duplicate (bulk) | "No new candidates were added. These candidates are already in your list." | info | 6000ms | Clear |
| Single duplicate | "This candidate is already in your list." | info | 5000ms | Clear |
| All failed (non-dup) | "No candidates were added." | danger | 6000ms | Correct |

Logic verified: same branching pattern as contact component. Reads `res.status === 'DUPLICATE_CANDIDATE'` for single.

---

## False-Positive Scan — Full Codebase

Searched all `src/` for unconditional success strings on add/import paths.

**Result: No false positives found in any of the three NOTIFY-P2 components.**

Other snackbar calls audited outside NOTIFY-P2 scope:

| File | Call | Assessment |
|---|---|---|
| `contact-list.component.ts:103` | `snackBar.open(contact.success, ...)` with `success-snackbar` | Dead code — `contact.success` is never set in the reducer (initial state is `null`, no case sets it). Never fires. |
| `candidate-list.component.ts:101` | `snackBar.open(candidate.success, ...)` with `success-snackbar` | Same — dead code. |
| `contact-list.component.ts:110,122` | "Successfully Edited Contact!" / "Successfully Deleted Contact!" | Gated on `editContactRes`/`deleteContactRes` keys — correct success toasts for confirmed backend operations. Not false positives. |
| All other success toasts | Profile update, job publish, clipboard copy, auth, interview | All gated on confirmed backend state transitions. No unconditional false positives found. |

---

## CSS / Snackbar Class Audit

**File:** `src/styles.scss` | `src/assets/styles/colors.scss`

### `.success-snackbar` — text color missing (FIXED this audit)
Was: `background-color: $color-global-red-buttons` with no `color` property.
Fixed: Added `color: #ffffff`. Without this, Angular Material's default dark text renders on red (#FF7062) — contrast failure. All other snackbar classes (danger/warning/info) already had explicit white text.

### `.warning-snackbar` — amber upgraded (prior BRAND pass, already in place)
Original NOTIFY-P2 value: `#f59e0b` (Tailwind amber-400) — 2.15:1 contrast vs white (WCAG AA fail).
Current value: `$color-warning-amber` = `#b45309` (Tailwind amber-800) — 5.02:1 (WCAG AA pass).

### `.info-snackbar` — gray tokenized (prior BRAND pass, already in place)
`$color-info-gray` = `#6b7280` (Tailwind gray-500) — 4.83:1 contrast vs white (WCAG AA pass for large/bold text).

### Final snackbar class state

| Class | Background | Text | Contrast | WCAG AA Status |
|---|---|---|---|---|
| `.success-snackbar` | #FF7062 (brand red) | #ffffff (fixed) | 3.0:1 | Passes AA Large Text (3:1 threshold); below AA Normal Text (4.5:1) — brand constraint |
| `.danger-snackbar` | #FE6F61 (brand red) | #ffffff | 3.1:1 | Same — brand constraint |
| `.warning-snackbar` | #b45309 (amber-800) | #ffffff | 5.02:1 | AA pass |
| `.info-snackbar` | #6b7280 (gray-500) | #ffffff | 4.83:1 | AA pass (large/bold) |

Success and danger use the brand red palette (~3:1). This passes WCAG AA Large Text but not Normal Text. Improving these would require a brand-level color decision — outside scope of this audit.

---

## Accessibility Notes

### aria-live
Angular Material `MatSnackBar` uses `aria-live="polite"` by default. For `danger-snackbar` (all failed), `assertive` would be more appropriate — screen readers should interrupt to announce errors immediately rather than waiting.

**Angular 13 limitation:** Overriding `aria-live` requires creating a custom `ToastComponent` and using `openFromComponent()` instead of `open()`. This is out of scope for a safe-fix pass. Flagged as D-03.

### Toast durations
All durations are appropriate for the message lengths:
- 4000ms success: adequate for "N candidates added." (~3 words)
- 5000ms single-duplicate info: adequate for "This contact is already in your list." (~8 words)
- 6000ms warning/multi-info/danger: adequate for longest message "No new contacts were added. These contacts are already in your list." (~14 words, ~5-6s read time)

### Reduced-motion
The global `prefers-reduced-motion` block in `styles.scss` covers all `transition-duration` and `animation-duration` values globally, suppressing Material's snackbar slide-in. No additional action needed.

---

## Deferred Findings

| ID | Issue | Severity | Recommended Action |
|---|---|---|---|
| D-01 | Partial-failure toasts show count but not which items failed | Low | Add a failure detail list in the dialog, not the toast |
| D-02 | success/danger snackbar contrast ~3:1 (brand red) — below AA for normal-size text | Low | Brand-level color decision required |
| D-03 | danger-snackbar should use `aria-live="assertive"` for screen readers | Medium | Implement custom `ToastComponent` wrapper in Angular Material |
| D-04 | `contact.success` / `candidate.success` reducer fields are never populated — dead code branches in list components | Low | Remove dead branches in contact-list.component.ts:102 and candidate-list.component.ts:100 |

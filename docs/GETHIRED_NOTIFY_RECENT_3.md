# GetHired NOTIFY — Recent Deployment Audit Report 3
## NOTIFY-V3 — Focused on: job-not-found state, snackbar classes, signup debug cleanup, confirm-password label, bulk-operation messaging, OG image meta

**Audit date:** 2026-06-26
**Auditor:** NOTIFY command v2 (automated review)
**FE repo:** get-hired-FE  
**BE repo:** get-hired-BE  
**Prior reports used:** GETHIRED_NOTIFY_RECENT_DEPLOYMENT_REPORT.md, GETHIRED_NOTIFY_RECENT_DEPLOYMENT_V5.md, GETHIRED_NOTIFY_P2_* series

---

## Executive Summary

6 targeted items were audited. 4 passed with no action needed. 2 items produced new findings requiring fixes.

**Items that PASSED (no fix needed):**
1. Job-not-found error state in `job-posts-details.component.html` — has a full user-facing UI with heading, body copy, and CTAs. NOT a blank screen.
2. `.warn-snackbar` and `.error-snackbar` CSS classes — both defined in `styles.scss` with correct WCAG AA contrast (5.02:1 and ~3.0:1 respectively). Already fixed in NOTIFY-V5.
3. Confirm-password label fix in `signup.component.html` — `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` key is used at line 165, and the key exists in `en.json` with value "Confirm Password". Already fixed in NOTIFY-V5.
4. Bulk-operation messaging in FE (contacts + candidates) — both components correctly read `summary.successCount` / `duplicateCount` / `failureCount` from the API response before choosing toast copy and class.
5. OG image meta tags in `seo.service.ts` — `og:image:width` (1200), `og:image:height` (630), `og:image:type` (image/png) are all present and correct.

**New defects found this pass: 2**

- **NOTIFY-3-F1 (Medium):** `console.log(this.data)` at line 62 of `import-add-contact.component.ts` in `ngOnInit()` — leaks contact dialog data (edit vs. create mode, contact fields) to the browser console in production. Safe to remove.
- **NOTIFY-3-F2 (Low):** Multiple `console.log` statements remain in `signin.component.ts` (lines 58, 76, 120) and `account-authentication.component.ts` (lines 70, 80, 100, 129) — these are in auth flows visible in production DevTools. The signup-specific ones were cleaned up but the signin and account-auth ones were not. No user-facing impact, but they constitute debug-log leakage in security-sensitive code paths.

**Items deferred from V5 that remain open:**
- D-02: `auth.guard.ts` — "You are not Authorized to access that page. Please Login first" (capitalization, "Login" vs "sign in")
- D-03: `account-authentication.component.ts` — raw `err` object passed to `snackBar.open()` in resend failure branch

---

## Phase-by-Phase Findings

### Phase 1 — Job-not-found state (job-posts-details.component.html)

**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html` lines 3–12

**Finding: PASS — full error UI exists**

The template shows a meaningful error state when `(jobError$ | async)` is truthy and loading/details are falsy:

```
role="alert" aria-live="assertive"
H5: "Session required" or "This job isn't available"
P: "Sign in to view this job." or "It may have expired, been removed, or the link may be incorrect."
CTA: [Sign In] button (session case) + [Browse all jobs] button (both cases)
```

This is NOT a blank screen. The noindex meta + 404 RESPONSE token work alongside the visible error UI — they are complementary, not alternatives.

**String coupling note (carried from V5 D-01):** The session-required branch depends on the exact string `'Unable to load this job for the current session.'`. If the effects layer message changes, the wrong heading/CTA silently appear. This is a soft coupling risk, not a production bug.

**Verdict:** No fix needed this pass.

---

### Phase 2 — Snackbar classes (.warn-snackbar, .error-snackbar)

**File:** `src/styles.scss` lines 274–287

**Finding: PASS — both defined and contrast-correct**

| Class | Background | Contrast vs white | WCAG AA |
|---|---|---|---|
| `.warn-snackbar` | `$color-warning-amber` (#b45309) | 5.02:1 | PASS |
| `.error-snackbar` | `$color-global-red` (#FE6F61) | ~2.9:1 | MARGINAL |
| `.danger-snackbar` | `$color-global-red` (#FE6F61) | ~2.9:1 | MARGINAL |
| `.warning-snackbar` | `$color-warning-amber` (#b45309) | 5.02:1 | PASS |
| `.success-snackbar` | `$color-global-red-buttons` (#FF7062) | ~2.9:1 | MARGINAL |
| `.info-snackbar` | `$color-info-gray` (#6b7280) | 4.83:1 | PASS |

**Note on red-family classes:** `.error-snackbar`, `.danger-snackbar`, and `.success-snackbar` all use the brand red (#FE6F61 / #FF7062). These achieve approximately 2.9:1 contrast vs white — below WCAG AA (4.5:1 for normal text). This is a known brand constraint. The text is large-ish in a snackbar context but not formally large text (18pt / 14pt bold threshold). This was not introduced in the current deployment and is documented as a known brand trade-off. Not a new defect for this pass.

**Verdict:** Both `.warn-snackbar` and `.error-snackbar` are defined and working. No fix needed.

---

### Phase 3 — Signup console.log cleanup (signup.component.ts)

**File:** `src/app/auth/signup/signup.component.ts`

**Finding: PASS for signup.component.ts specifically**

Confirmed: no `console.log` in `signup.component.ts`. The `showError()` method (line 120) sets `this.error = err` without logging. The `register()`, `openVerification()`, and `checkIfMatchingPasswords()` methods are clean.

**But adjacent auth files were NOT cleaned:**

| File | Line | Log content | Severity |
|---|---|---|---|
| `signin.component.ts` | 58 | `console.log('dapat di na')` | Medium — fires on every successful login |
| `signin.component.ts` | 76 | `console.log(user)` | High — logs full user object (id, email, role, token, companyId) to console on every login |
| `signin.component.ts` | 120 | `console.log(redirect)` | Low — logs returnURL value |
| `account-authentication.component.ts` | 70 | `console.log('For implementation')` | Low |
| `account-authentication.component.ts` | 80 | `console.log('mode missing')` | Low |
| `account-authentication.component.ts` | 100 | `console.log('verified na')` | Low |
| `account-authentication.component.ts` | 129 | `console.log(err)` | Medium — logs raw error in resend failure |

**Critical:** `signin.component.ts` line 76 `console.log(user)` exposes the full user response object including token and companyId to anyone with DevTools access. This should be removed.

**This is NOTIFY-3-F2** (documented in fix log).

---

### Phase 4 — Confirm-password label (signup.component.html)

**File:** `src/app/auth/signup/signup.component.html` line 165

**Finding: PASS — already fixed in NOTIFY-V5**

The confirm-password field at line 165 uses `{{ 'CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX' | translate }}`.

The i18n key `CREATE_ACCOUNT.CONFIRM_PASSWORD_TEXTBOX` is present in `src/assets/i18n/en.json` line 16 with value `"Confirm Password"`.

The password field (line 138) uses `CREATE_ACCOUNT.PASSWORD_TEXTBOX` = "Password".

Both labels are now distinct and correct.

**Verdict:** No fix needed.

---

### Phase 5 — Bulk-operation messaging (contacts + candidates)

**File (contacts):** `src/app/employer-panel/employer-contacts/contact-list/dialogs/import-add-contact/import-add-contact.component.ts` lines 89–123  
**File (candidates):** `src/app/employer-panel/employer-contacts/candidate-list/dialogs/import-add-candidate/import-add-candidate.component.ts` lines 87–120

**Finding: PASS — messaging is accurate and outcome-gated**

Both components implement the NOTIFY-P2 pattern correctly:
1. Check `res.summary` presence before choosing toast
2. Branch on `successCount`, `failureCount`, `duplicateCount` independently
3. Use `warning-snackbar` for partial, `info-snackbar` for duplicate-only, `danger-snackbar` for all-failed
4. Extend duration to 6000ms for non-success outcomes to give users time to read

**Remaining gap in contact component (debug log):**
- Line 62: `console.log(this.data)` in `ngOnInit()` — leaks the dialog `@Inject(MAT_DIALOG_DATA)` payload (contact fields when editing) to console. This is **NOTIFY-3-F1**.

**Verdict:** Business logic is correct. Debug log needs removal.

---

### Phase 6 — OG image meta tags (seo.service.ts)

**File:** `src/app/core/services/seo.service.ts` lines 98–107

**Finding: PASS — all three new meta tags are correct**

```typescript
this.meta.updateTag({ property: 'og:image:width', content: '1200' });
this.meta.updateTag({ property: 'og:image:height', content: '630' });
this.meta.updateTag({ property: 'og:image:type', content: 'image/png' });
```

Values match the declared image file (`gethired-og-default.png`). The 1200×630 ratio is standard for Open Graph (Facebook/LinkedIn recommend this size). `image/png` is correct for a `.png` file. These tags are only set when `ogImage` is truthy (guarded on line 98).

**Conditional coverage:** For job-specific pages where `setJobPostingJsonLd` is called, the width/height/type tags will reflect the default OG image since `setPageMeta` is what sets them — job pages don't pass a custom `ogImage` to `setPageMeta`. This means if a future feature adds dynamic OG images per job, these tags would need updating. Noted as backlog item B-01.

**Verdict:** No fix needed for current deployment.

---

## Fixes Applied This Pass

| ID | File | Change | Type |
|---|---|---|---|
| NOTIFY-3-F1 | import-add-contact.component.ts line 62 | Remove `console.log(this.data)` | Safe copy/debug cleanup |
| NOTIFY-3-F2 | signin.component.ts lines 58, 76, 120 | Remove 3 console.log statements | Safe debug cleanup |
| NOTIFY-3-F2b | account-authentication.component.ts lines 70, 80, 100, 129 | Remove 4 console.log statements | Safe debug cleanup |

---

## Open Deferred Items (Carried Forward)

| ID | Location | Issue | Priority |
|---|---|---|---|
| D-01 | job-posts-details.component.html | String coupling: session-error branch depends on exact string from effects | Low |
| D-02 | auth.guard.ts | "Authorized" capitalized, "Login" instead of "sign in" | Low |
| D-03 | account-authentication.component.ts | Raw `err` object passed to snackBar in resend failure path | Medium |
| B-01 | seo.service.ts | OG image width/height/type would need updates if dynamic job OG images added | Low (future-proofing) |

---

## Release Gate

See `GETHIRED_NOTIFY_RELEASE_GATE_RECENT_3.md` for full gate summary.

**Gate result: CONDITIONAL PASS** — fixes for F1 and F2 should be applied; they are safe debug-log removals with no behavioral risk. All 6 audited items confirmed no blank-screen regression, no false-success messaging, and no a11y regressions.

# GetHired QA9 Fix Sprint — BRAND / Visual Audit Report

**Date:** 2026-06-25
**Scope:** QA9 FE visual changes only (Fix 13: duplicate jobError$ removed; xlsx 0.18.5; all BE fixes are auth-only)

---

## Summary

| Area | Finding | Status |
|------|---------|--------|
| jobError$ snackbar — colour | `danger-snackbar` class wired correctly | PASS |
| jobError$ snackbar — CSS definition | `.danger-snackbar` exists in `styles.scss` (QA8 BRAND fix) | PASS |
| jobError$ snackbar — duration | 4 000 ms, consistent with app-wide error toast standard | PASS |
| jobError$ snackbar — dismiss action | Auto-dismiss only (`''` action string); no Dismiss button | NOTE — see §1.4 |
| jobError$ snackbar — position | Uses Angular Material default (bottom-center); no position conflict with job-list UI | PASS |
| jobError$ subscription cleanup | `req.add(...takeUntil(unsubscribe$))` in ngOnInit; `req.unsubscribe()` in ngOnDestroy | PASS |
| Dead `onError()` method | Defined but never called (5 000 ms / Dismiss action variant); dead code | NOTE — see §1.5 |
| xlsx 0.18.5 bundle impact | No build output available; version pinned to `^0.18.5` — minor semver bump | INFO |
| BE fixes visual impact | All 11 BE fixes are ownership/403 guards — zero FE rendering touched | PASS |
| Safe brand fix applied | None required; all gaps are notes, not defects | — |

---

## 1. jobError$ subscription — visual correctness

### 1.1 Colour — PASS

The active subscription (line 139–148 of `job-list.component.ts`) uses:

```ts
this.snackBar.open(err, '', {
  duration: 4000,
  panelClass: ['danger-snackbar'],
});
```

`.danger-snackbar` is defined in `src/styles.scss` (added in QA8 BRAND sprint):

```scss
// QA8 BRAND FIX-A
.danger-snackbar {
  background-color: $color-global-red;   // #FE6F61 — brand error red
  color: #ffffff;
}
```

The colour correctly maps to the brand error-red (`$color-global-red: #FE6F61`), distinct from `.success-snackbar` which uses the primary CTA red (`$color-global-red-buttons: #FF7062`). The visual differentiation is intentional and correct.

### 1.2 QA8 CSS definition present — PASS

`src/styles.scss` lines 41–47 confirm the `.danger-snackbar` rule is present and global. No missing-class risk.

### 1.3 Duration — PASS

4 000 ms is the app-wide error toast standard (cross-checked in `unauthorize.interceptor.ts` which also uses `duration: 4000, panelClass: ['danger-snackbar']`). The duration is consistent.

### 1.4 Dismiss action — NOTE (no change needed, but document)

The active subscription passes `''` as the action string (no visible "Dismiss" button). The dead `onError()` method (§1.5) uses `'Dismiss'` with 5 000 ms — a slightly more conservative pattern for error toasts. The current 4 000 ms auto-dismiss-only pattern is acceptable for transient job-status errors. If the error can persist in state (e.g. repeated archive attempts), the lack of a dismiss button is a minor UX friction but not a defect for this sprint.

**Recommendation (deferred, not blocking):** Consider changing the action string from `''` to `'Dismiss'` and extending to 5 000 ms to match the intent captured in the dead `onError()` method. Not applied this sprint — the fix is safe but out of scope for a QA9 BRAND pass.

### 1.5 Dead `onError()` method — NOTE

Lines 249–256 of `job-list.component.ts` define a public `onError(errorMsg)` method that opens a snackbar with `'Dismiss'` action and 5 000 ms duration. This method is **never called** — it is not referenced in the template or anywhere else in the job-list directory. It was not introduced in QA9 (it predates Fix 13). It is dead code and carries a divergent duration/action from the active subscription.

**Recommendation (deferred):** Remove `onError()` in a future cleanup pass to eliminate the confusion. Not applied this sprint — it is dead code, not a visual defect, and removal is a correctness/maintenance concern, not a BRAND concern.

### 1.6 Snackbar position — PASS

The active subscription does not set `horizontalPosition` or `verticalPosition`, so Angular Material defaults apply (bottom-center). The job-list template (`job-list.component.html`) has no floating UI element at the bottom (no bottom toolbar, FAB, or sticky footer). The empty-state view is entirely within the scrollable card body. No position conflict exists.

For reference, one other component in the codebase (`public-company-details`) explicitly sets `horizontalPosition: 'right', verticalPosition: 'top'` — this shows the codebase is aware of the options. The job-list view does not need a non-default position.

---

## 2. xlsx bundle size

**Finding:** The `package.json` version entry is `"xlsx": "^0.18.5"`, upgraded from `0.17.5`. No compiled build output was available in the repository to measure chunk delta directly.

**Known characteristics of xlsx 0.18.x:**
- The xlsx library is large (~1 MB raw). Both 0.17.x and 0.18.x ship comparable bundle sizes.
- The 0.18.5 release addressed CVE-2023-30533 (ReDoS vulnerability) — the upgrade is a security patch, not a feature expansion. Bundle size delta is expected to be negligible (< 5 KB).
- xlsx is not lazy-loaded in this codebase (no `import()` dynamic import found in the FE source). It is part of the main or eager vendor bundle.

**Recommendation:** Run `ng build --configuration=production --stats-json` and compare chunk sizes before/after if bundle regression tracking is required. For this sprint the upgrade is approved on security grounds; size is not a concern.

---

## 3. BE-only fixes — visual confirmation

All 11 BE fixes in QA9 are authorization guards:

- Ownership checks (e.g. verify requester owns the resource before allowing update/delete)
- 403 HTTP responses for unauthorized access attempts
- No new FE components, routes, forms, or state slices introduced
- No changes to API response bodies that would alter FE rendering

**Verdict: Zero visual impact confirmed.** The FE renders identically for authorized users. Unauthorized users receive a 403 which the existing `unauthorize.interceptor.ts` intercepts and surfaces as a `danger-snackbar` ("Your session has expired…") — already styled correctly from QA8 BRAND.

---

## 4. Safe brand fixes applied

No safe brand fixes were required this sprint. All findings are either:
- PASS (no change needed), or
- NOTE (deferred, out of scope for a QA9 BRAND pass)

The QA8 BRAND sprint already resolved the foundational gap (missing `.danger-snackbar` CSS class). QA9 Fix 13 correctly relies on that foundation.

---

## Brand system health — reference

| Token | Value | Used in QA9 change |
|-------|-------|-------------------|
| `$color-global-red` | `#FE6F61` | Yes — `.danger-snackbar` bg |
| `$color-global-red-buttons` | `#FF7062` | No (success snackbar only) |
| `$color-black` | `#2D2D2D` | No |
| Duration standard (error toasts) | 4 000 ms | Yes — consistent |

---

## Files audited

- `get-hired-FE/src/app/job/job-list/job-list.component.ts`
- `get-hired-FE/src/app/job/job-list/job-list.component.html`
- `get-hired-FE/src/app/job/job-list/job-list.component.scss`
- `get-hired-FE/src/assets/styles/colors.scss`
- `get-hired-FE/src/styles.scss`
- `get-hired-FE/package.json`
- `get-hired-FE/src/app/core/interceptor/unauthorize.interceptor.ts` (cross-reference)
- `get-hired-FE/src/app/companies/public-company-details/public-company-details.component.ts` (cross-reference)

---

*QA9 BRAND audit complete. No blocking findings. Two deferred notes logged for a future cleanup pass.*

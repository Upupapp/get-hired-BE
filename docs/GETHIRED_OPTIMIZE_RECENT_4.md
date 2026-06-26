# GETHIRED OPTIMIZE — RECENT_4 Performance Audit

**Date:** 2026-06-26
**FE HEAD:** 8a41f25  |  **BE HEAD:** 35f7754
**Scope:** SnackbarService, HapticService, import-add-user refactor, axios 1.7.9, OG PNG, star.svg CLS, SSR localStorage guards

---

## 1. SnackbarService — PASS (no leaks)

**File:** `src/app/core/services/snackbar.service.ts`

- Stateless wrapper over `MatSnackBar`. No subscriptions, no timers, no streams held open.
- Every method is SSR-gated with `isPlatformBrowser` — safe in Universal context.
- `MatSnackBar.open()` returns a `MatSnackBarRef` which auto-dismisses after `duration` ms; the returned ref is not stored, so no manual cleanup needed.
- `providedIn: 'root'` — correct singleton scope.
- **Finding:** Service was ALSO listed in `CoreModule.providers`, which causes Angular to create a second injector-scoped instance shadowing the root singleton. Any component injecting the root instance gets the wrong copy when the CoreModule instance is the one registered. FIXED (see fix log).

## 2. HapticService — PASS (no leaks)

**File:** `src/app/core/services/haptic.service.ts`

- Thin wrapper over `navigator.vibrate`. No subscriptions, no timers.
- Wrapped in `try/catch` with `isPlatformBrowser` guard — SSR-safe and resilient on devices without Vibration API.
- `providedIn: 'root'` — correct singleton scope.
- **Finding:** Same duplicate-provider issue as SnackbarService — listed in `CoreModule.providers` in addition to `providedIn: 'root'`. FIXED.

## 3. import-add-user.component — MINOR ISSUES FOUND & FIXED

**File:** `src/app/company/company-users/dialogs/import-add-user.component/import-add-user.component.ts`

### 3a. `unsubscribe$` Subject — dead code / incomplete teardown (FIXED)
- A `private unsubscribe$ = new Subject<void>()` is declared on line 39.
- The field is never used with `takeUntil`, never completed or next'd anywhere.
- `ngOnDestroy` only calls `this.req.unsubscribe()` — the Subject is leaked (open handle, never GC'd cleanly by RxJS).
- **Fix applied:** Added `this.unsubscribe$.next(); this.unsubscribe$.complete();` to `ngOnDestroy`. Subject is now properly terminated on component destruction, making it eligible for GC.

### 3b. NgRx store subscription — CORRECTLY managed
- `this.req` = `this.invitedCompanyUsers$.subscribe(...)` is assigned in `ngOnInit`.
- `ngOnDestroy` explicitly calls `this.req.unsubscribe()`.
- No infinite Observable (NgRx store `select` completes only when store is destroyed, which is fine — manual unsubscribe covers it).

### 3c. setInterval / setTimeout — NONE found
- No `setInterval` or `setTimeout` calls in this component or the new services.

### 3d. Invite result panel — no infinite subscriptions
- `showResultPanel`, `successCount`, `failedEmails`, `allFailed` are plain boolean/number/array fields set inside the store subscription callback.
- No secondary Observable chained on the result panel. Clean.

### 3e. SSR localStorage guard — CORRECT
- `ngOnInit` reads `localStorage` only after `isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined'`.
- `copyFailedEmails()` gates `navigator.clipboard` with `isPlatformBrowser`. Correct.
- Double-guard (`isPlatformBrowser` + `typeof localStorage`) adds ~1 ns overhead per call — negligible; guard is correct for edge-case environments like Deno or non-standard SSR adapters.

## 4. axios 1.7.9 BE — PASS (no interceptor leaks)

**Files:** `helpers/firebaseFunctions.js`, `controllers/paymentController.js`

- Both files use `axios.request(config)` as a one-shot call per request — no persistent interceptors (`axios.interceptors.request.use` / `axios.interceptors.response.use`) anywhere in the codebase.
- `paymentController.js` uses `require("axios").default` (CommonJS) and `firebaseFunctions.js` uses `import axios from 'axios'` (ESM). Both resolve to the same global axios singleton — safe in Node.js module cache.
- No `axios.create()` instances with interceptors registered.
- **Result:** No cleanup risk. axios 1.7.9 upgrade has no performance or leak implications in current usage.

## 5. OG PNG size — PASS

**File:** `src/assets/brand/gethired-og-default.png`
- Size: **66,154 bytes (~65 KB)**
- Social crawler limit: 8 MB (Facebook), 5 MB (Twitter/X), 1 MB recommended for fast preview.
- 65 KB is well within all crawler limits. No action needed.
- `og:image:width=1200`, `og:image:height=630`, `og:image:type=image/png` are correctly set in SeoService (lines 104-106). Crawlers will not need to fetch image to size the preview card.

## 6. star.svg CLS — PARTIAL FIX APPLIED

**Files checked:**
| File | Had width? | Fixed? |
|------|-----------|--------|
| `src/app/views/home/pages/job-post-details-apply/steps/profile-preview/components/applicant-avatar/applicant-avatar.component.html` | YES (14x14) | Already correct |
| `src/app/views/home/pages/company-details/components/company-banner/company-banner.component.html` | YES (17x17) | Already correct |
| `src/app/applicant/profile-details/components/avatar/avatar.component.html` | NO (height only) | FIXED — added width="17" |
| `src/app/companies/public-company-details/public-company-details.component.html` | NO (height only) | FIXED — added width="17" |

- Note: `height="17px"` (with CSS unit suffix) was used instead of `height="17"` (unitless HTML attribute). The attribute with the `px` suffix is technically invalid HTML (attribute values should be unitless integers) but all modern browsers handle it. The unitless values applied in the fix match the pattern of the already-correct files.

## 7. SSR localStorage guards — PASS (no overhead concern)

- `SnackbarService`: all 4 methods begin with `if (!isPlatformBrowser(...)) { return; }` — 1 boolean check, no measurable cost.
- `HapticService.vibrate()`: `isPlatformBrowser` + `typeof navigator !== 'undefined'` + `navigator.vibrate` property check — 3 guards, negligible.
- `import-add-user.component.ngOnInit`: localStorage guarded with `isPlatformBrowser && typeof localStorage !== 'undefined'` — runs once at component init, not in hot path.
- `public-list.component.getUserRole()`: async localStorage via `asyncLocalStorage.getItem()` wraps a microtask around a `typeof localStorage` check. Called once per init. No overhead concern.
- `SeoService.setCanonical / clearCanonical / setJsonLd / clearJsonLd`: use Angular `DOCUMENT` token — no `typeof` guards needed and none used. Correct pattern.

## 8. HostListener window:resize SSR guard (public-list) — FIXED

**File:** `src/app/public/public-list/public-list.component.ts`

- `ngOnInit` already had an `isPlatformBrowser` guard for the initial `window.innerWidth` read.
- The `onResize` HostListener was missing the same guard — it would throw `ReferenceError: window is not defined` if Angular Universal's DOM emulation triggers resize simulation.
- **Fix applied:** Added `isPlatformBrowser(this.platformId)` guard inside `onResize`.

## 9. Legacy snackBar.open() callers (migration note, no fix required)

- **38 direct `this.snackBar.open(...)` calls** exist across older components (employer-contacts, job-create, applicant profile forms, guards, interceptors, etc.).
- These are safe (they work) but bypass the new SnackbarService's SSR guard, consistent theming (`panelClass`), and `politeness` aria attributes.
- **Not fixed** (out of scope, not a regression, auth/routing untouched per constraint).
- Recommend migrating in a future NOTIFY cycle.

## Summary

| Check | Status |
|-------|--------|
| SnackbarService memory leaks | PASS |
| HapticService memory leaks | PASS |
| CoreModule duplicate provider | FIXED |
| import-add-user unsubscribe$ dead code | FIXED |
| import-add-user req.unsubscribe | PASS (already correct) |
| setInterval/setTimeout without clear | NONE FOUND |
| Invite result panel infinite subscription | NONE FOUND |
| axios interceptor leaks | NONE FOUND |
| OG PNG size | PASS (65 KB) |
| star.svg width+height CLS (applicant avatar) | FIXED |
| star.svg width+height CLS (public company) | FIXED |
| star.svg width+height CLS (apply preview, company banner) | PASS (already correct) |
| SSR localStorage guard overhead | PASS (negligible) |
| onResize HostListener SSR guard | FIXED |

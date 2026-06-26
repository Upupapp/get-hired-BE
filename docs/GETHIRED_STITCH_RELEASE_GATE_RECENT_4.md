# GETHIRED STITCH RELEASE GATE RECENT_4

**Date:** 2026-06-26
**FE HEAD:** 8a41f25 | **BE HEAD:** 35f7754
**Verdict:** PRODUCTION CLEAR

---

## Gate Checklist

| # | Seam | Check | Result |
|---|---|---|---|
| 1 | SnackbarService ↔ CoreModule | `providers: [... SnackbarService ...]` present in `core.module.ts`; service is `@Injectable({ providedIn: 'root' })` | PASS |
| 2 | SnackbarService ↔ import-add-user | Component injects `SnackbarService`, not raw `MatSnackBar`; uses `.success()`, `.warning()`, `.error()`, `.info()` | PASS |
| 3 | Invite response shape ↔ FE dialog | BE `addCompanyUser` returns `{ emails: [{email, status, msg}] }`; FE reads `companyUserRes.emails`, filters on `status === 'failed'` | PASS |
| 4 | axios 1.7.9 ↔ PayMongo | No `CancelToken`, no `paramsSerializer`; both BE axios call sites use `axios.request(config)` — stable API | PASS |
| 5 | bcryptjs ↔ auth services | Only `bcryptjs` imported anywhere in BE; no bare `bcrypt` import found; all auth controllers consume `hashPassword`/`comparePassword` from `helpers/validation.js` | PASS |
| 6 | Job.companyName ↔ templates | `companyName` typed on `Job`, `BasicJob`, `NormalizedJob`; all template consumers use typed field or documented `(job as any)` fallback chain; no unsafe bracket access | PASS |
| 7 | CORS ↔ FE API calls (production) | Live header: `Access-Control-Allow-Origin: https://gethiredonline.app`; matches FE production origin exactly | PASS |

---

## Non-blocking findings (do not hold release)

| ID | File | Finding |
|---|---|---|
| NB-1 | `get-hired-BE/env.js` lines 57-58, 91-92 | Staging branches read `APP_URL` instead of `APP_URL_DEV`/`APP_URL_EUCANNAJOBS` when setting CORS origin. Production unaffected. See FIX LOG RECENT_4 Fix 1. |
| NB-2 | `import-add-user.component.ts` `InviteResult` | Dead field `message?` — BE only sends `msg`. Cosmetic. See FIX LOG RECENT_4 Fix 2. |

---

## Release decision

**CLEARED FOR PRODUCTION.**

All 7 integration seams verified passing against the live deployment. The two non-blocking findings are staging-only or cosmetic and do not affect any user-facing path.

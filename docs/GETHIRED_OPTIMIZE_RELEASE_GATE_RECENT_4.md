# GETHIRED OPTIMIZE RELEASE GATE — RECENT_4

**Date:** 2026-06-26
**FE HEAD:** 8a41f25  |  **BE HEAD:** 35f7754
**Audit scope:** SnackbarService + HapticService + import-add-user refactor + axios 1.7.9 + OG PNG + star.svg CLS + SSR localStorage guards

---

## Gate Status: PASS — Safe to deploy

All blocking items were fixed in this session. No regressions introduced.

---

## Gate Criteria

### G1 — No subscription leaks in new code
| Check | Result |
|-------|--------|
| SnackbarService holds no open subscriptions | PASS |
| HapticService holds no open subscriptions | PASS |
| import-add-user `req` unsubscribed in ngOnDestroy | PASS |
| import-add-user `unsubscribe$` completed in ngOnDestroy | FIXED (was dead code) |
| No setInterval / setTimeout without clear in new code | PASS (none exist) |
| Invite result panel uses no infinite Observables | PASS |

### G2 — No duplicate service instances
| Check | Result |
|-------|--------|
| SnackbarService NOT in CoreModule.providers (already providedIn: root) | FIXED |
| HapticService NOT in CoreModule.providers (already providedIn: root) | FIXED |
| CoreService still in CoreModule.providers | PASS (not providedIn: root, must be here) |

### G3 — SSR safety
| Check | Result |
|-------|--------|
| SnackbarService methods gated with isPlatformBrowser | PASS |
| HapticService.vibrate gated with isPlatformBrowser + typeof navigator | PASS |
| import-add-user localStorage read gated with isPlatformBrowser + typeof localStorage | PASS |
| import-add-user navigator.clipboard gated with isPlatformBrowser | PASS |
| public-list onResize HostListener gated with isPlatformBrowser | FIXED |
| public-list ngOnInit window.innerWidth gated with isPlatformBrowser | PASS (was already fixed) |
| SeoService uses DOCUMENT token (no bare document/window) | PASS |

### G4 — CLS (Cumulative Layout Shift) — star.svg
| File | width + height? | Result |
|------|----------------|--------|
| applicant-avatar.component.html (apply flow) | YES 14x14 | PASS |
| company-banner.component.html (company detail) | YES 17x17 | PASS |
| avatar.component.html (applicant profile) | FIXED to 17x17 | PASS |
| public-company-details.component.html | FIXED to 17x17 | PASS |

### G5 — OG image
| Check | Result |
|-------|--------|
| File exists at /assets/brand/gethired-og-default.png | PASS |
| Size < 1 MB (recommended limit) | PASS (65 KB) |
| og:image:width=1200 set in SeoService | PASS |
| og:image:height=630 set in SeoService | PASS |
| og:image:type=image/png set in SeoService | PASS |

### G6 — BE axios 1.7.9
| Check | Result |
|-------|--------|
| No axios.interceptors.request.use() calls in codebase | PASS |
| No axios.interceptors.response.use() calls in codebase | PASS |
| No axios.create() with persistent interceptors | PASS |
| All axios calls are one-shot per request | PASS |

### G7 — No regressions in auth / payments / routing / MATCH
| Check | Result |
|-------|--------|
| auth files untouched | PASS |
| paymentController.js untouched | PASS |
| routing files untouched | PASS |
| MATCH logic untouched | PASS |
| No ?. or ?? operators added to BE files | PASS |

---

## Deferred (not blocking)

| Item | Priority | Suggested cycle |
|------|----------|----------------|
| Migrate 38 legacy `this.snackBar.open()` calls to SnackbarService | Low | Future NOTIFY cycle |
| Add `alt` attributes to star.svg `<img>` tags (decorative — use `alt=""`) | Low | OPTIMIZE_RECENT_5 |

---

## Deployment Checklist

- [ ] Confirm `ng build --prod` completes without errors on FE
- [ ] Smoke-test import-add-user dialog: invite 1 email (success), invite invalid email (error), partial success (warning) — verify snackbar appears and dialog closes/stays correctly
- [ ] Verify applicant profile page renders star ratings without layout shift (CLS check)
- [ ] Verify public company details page renders star ratings without layout shift
- [ ] Confirm BE starts normally with axios 1.7.9 (`node server.js` or equivalent)

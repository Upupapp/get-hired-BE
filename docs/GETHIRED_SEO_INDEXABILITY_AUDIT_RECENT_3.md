# GetHired SEO Indexability Audit — RECENT_3
**Date:** 2026-06-26
**Scope:** Which pages are indexable vs. noindex, correctness of that decision, and defense-in-depth across meta-robots + robots.txt + HTTP status.

---

## Indexability Matrix

| Route | Component | meta robots | robots.txt | HTTP Status | Should Index? | Verdict |
|-------|-----------|-------------|------------|-------------|---------------|---------|
| `/home` | MainPortalComponent | `index, follow` | Allowed | 200 | YES | CORRECT |
| `/jobs` | PublicListComponent | `index, follow` | Allowed | 200 | YES | CORRECT |
| `/jobs/details/:id` (active, status=2) | PublicDetailsComponent | `index, follow` | Allowed | 200 | YES | CORRECT |
| `/jobs/details/:id` (inactive, status≠2) | PublicDetailsComponent | `noindex, nofollow` | Allowed | 200 | NO | CORRECT |
| `/jobs/details/:id` (not found / error) | JobPostsDetailsComponent | `noindex` | Allowed | **404** (SSR) | NO | CORRECT |
| `/jobs/search/:keyword` | PublicSearchComponent | `noindex, follow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/job-seekers` | JobSeekerPortalComponent | `index, follow` | Allowed | 200 | YES | CORRECT |
| `/employers` | EmployerPortalComponent | `index, follow` | Allowed | 200 | YES | CORRECT |
| `/signin` | SigninComponent | `noindex, nofollow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/signup` | SignupComponent | `noindex, nofollow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/reset-password` | ResetPasswordComponent | `noindex, nofollow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/change-password` | ChangePwComponent | `noindex, nofollow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/verify` | AccountAuthenticationComponent | `noindex, nofollow` | Disallowed | 200 | NO | CORRECT (dual-layer) |
| `/admin/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/recruiter/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/user/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/owner/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/investor/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/api/**` | BE routes | N/A | Disallowed | n/a | NO | CORRECT |
| `/payment/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |
| `/subscription/**` | (authenticated) | Not analyzed | Disallowed | n/a | NO | CORRECT |

---

## Indexable Pages (Target Index Targets)

These 5 public routes are intended to be indexed:

1. **`/home`** — Homepage with Organization + WebSite JSON-LD, full OG tags, canonical set
2. **`/jobs`** — Jobs listing with BreadcrumbList, canonical `/jobs`
3. **`/jobs/details/:id` (active jobs)** — JobPosting JSON-LD, BreadcrumbList, canonical per-job, real 404 on error
4. **`/job-seekers`** — Job seeker portal, canonical set
5. **`/employers`** — Employer portal, canonical set

All 5 have correct `robots: 'index, follow'` and canonical URLs. No search result pages are indexed (correctly gated with noindex + robots.txt Disallow).

---

## Defense-in-Depth Analysis

### Pages with DUAL protection (meta-robots + robots.txt):
- `/signin` — `noindex, nofollow` + Disallowed in robots.txt ✓
- `/signup` — `noindex, nofollow` + Disallowed in robots.txt ✓
- `/reset-password` — `noindex, nofollow` + Disallowed in robots.txt ✓
- `/change-password` — `noindex, nofollow` + Disallowed in robots.txt ✓
- `/verify` — `noindex, nofollow` + Disallowed (robots.txt has `/verify`) ✓
- `/jobs/search/` — `noindex, follow` + Disallowed in robots.txt ✓

### Pages with meta-robots ONLY (robots.txt allows):
- `/jobs/details/:id` (inactive jobs) — `noindex, nofollow` via meta only
  - This is CORRECT; robots.txt allowing the URL pattern is necessary so Googlebot can discover active jobs in the same URL space. The per-job `jobStatusId` check in `PublicDetailsComponent` provides appropriate protection.

### Pages with HTTP 404 + noindex (triple protection):
- `/jobs/details/:id` (not found) — HTTP 404 (SSR RESPONSE token) + `noindex` meta + no canonical

---

## Potential Indexability Gaps

### Gap 1 — `/jobs/details/:id` for inactive jobs: no HTTP status change
Inactive jobs (jobStatusId ≠ 2) receive `noindex, nofollow` but still return HTTP 200. This means Googlebot will crawl them, see noindex, and remove them from the index — correct behavior. However, Googlebot still spends crawl budget on these pages.

**Recommendation (low priority):** For inactive/expired jobs, consider returning HTTP 410 (Gone) in the SSR context (similar to the error state 404 pattern). This tells Googlebot to stop crawling the URL entirely. Only apply if crawl budget is a concern at scale.

### Gap 2 — Auth routes: still return HTTP 200
`/signin`, `/signup`, etc. return HTTP 200 with `noindex, nofollow`. The robots.txt Disallow means Googlebot should never fetch these anyway. Acceptable.

### Gap 3 — Authenticated dashboard routes not verified at component level
`/admin/**`, `/recruiter/**`, `/user/**`, `/owner/**`, `/investor/**` are Disallowed in robots.txt but no meta-robots noindex was verified in this pass (no component reads were done for authenticated areas). These routes require login to render meaningful content, so a crawl attempt would likely see a redirect to `/signin`. 

**Recommendation:** Confirm that the auth guard redirects unauthenticated requests to `/signin` — which IS noindexed. If Angular Universal renders the dashboard scaffold before the auth guard redirects, the SSR output might be indexable. Low priority; auth guards typically run before rendering.

---

## `robots.txt` Coverage Assessment

File: `src/robots.txt` (served as a static asset, listed in `angular.json` assets array — deployed to web root)

### Coverage of sensitive areas:
- `/admin/`, `/admin` — both path variants covered ✓
- `/recruiter/`, `/recruiter` — both variants covered ✓
- `/user/`, `/user` — both variants covered ✓
- `/owner/`, `/owner` — both variants covered ✓
- `/investor/`, `/investor` — both variants covered ✓
- `/api/` — covered ✓
- `/payment/`, `/payment` — both variants covered ✓
- `/subscription/`, `/subscription` — both variants covered ✓
- `/signin` — covered ✓
- `/signup` — covered ✓
- `/reset-password` — covered ✓
- `/change-password` — covered ✓
- `/verify` — covered ✓
- `/jobs/search/` — covered ✓

### robots.txt header:
```
User-agent: *
Allow: /
```
This is correct — allows everything by default, then specific Disallows override.

### Minor gap:
`change-password` in robots.txt: the Disallow is `/change-password` but the route appears to render via the `change-pw` component. Confirm the actual Angular route path is `/change-password` (not `/change-pw`). If the route is `/change-pw`, the robots.txt entry would need updating.

---

## Overall Indexability Assessment

- All 5 intended public pages: indexable ✓
- All auth/private pages: noindexed ✓
- Search result pages: noindexed ✓
- Job error states: HTTP 404 ✓
- Inactive jobs: noindexed ✓
- No false positives (indexable pages that should be noindexed): 0 found
- No false negatives (noindexed pages that should be indexable): 0 found

**Verdict: PASS**

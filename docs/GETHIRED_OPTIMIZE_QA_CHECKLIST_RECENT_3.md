# GETHIRED_OPTIMIZE_QA_CHECKLIST_RECENT_3
## QA Checklist — OPTIMIZE Round 3
Date: 2026-06-26

Manual verification steps for this round's changes before deploying.

---

## SSR VERIFICATION

- [ ] `ng build --configuration=production` completes without errors
- [ ] `node dist/server/main.js` starts without errors
- [ ] `curl -s http://localhost:4000/jobs` returns HTML with `<title>` tag present (not blank)
- [ ] `curl -s http://localhost:4000/jobs` does not return a Node.js error stack trace
- [ ] `curl -s http://localhost:4000/jobs/search/developer` returns HTML without error
- [ ] `curl -s http://localhost:4000/jobs/details/VALID_JOB_ID` returns HTML with `<link rel="canonical">` in `<head>`
- [ ] `curl -s http://localhost:4000/jobs/details/VALID_JOB_ID` returns HTTP 200
- [ ] `curl -s http://localhost:4000/jobs/details/INVALID_JOB_ID` returns HTTP 404
- [ ] `curl -s http://localhost:4000/jobs/details/INVALID_JOB_ID` contains `<meta name="robots" content="noindex">` in head

---

## BROWSER FUNCTIONAL VERIFICATION

- [ ] Navigate to `/jobs` — page loads, job list renders, banner renders
- [ ] Banner on `/jobs` shows correct login state (logged in: shows user data; logged out: shows sign-in prompt)
- [ ] Search from banner → navigates to `/jobs/search/:keyword`
- [ ] `/jobs/search/:keyword` renders results filtered by keyword
- [ ] Navigate away from `/jobs/search/:keyword` — no console errors about "already unsubscribed"
- [ ] Navigate back to `/jobs/search/:keyword` — no previous state leaked from prior visit
- [ ] Navigate to `/jobs/details/:id` for valid job — title shows job title
- [ ] Navigate away from `/jobs/details/:id` — title resets to "Get Hired - Hire experts or be hired..."
- [ ] Navigate to applicant dashboard — banner renders with correct user data (not blank)
- [ ] DevTools Memory panel: confirm no growth in active subscription count after 10+ navigations

---

## SUBSCRIPTION LEAK SPOT CHECK

- [ ] Open DevTools Performance tab
- [ ] Navigate: Home → Jobs → Job Detail → Jobs → Job Detail → Jobs (5 round trips)
- [ ] Confirm no "Maximum update depth exceeded" or "Cannot read properties of null" errors in console
- [ ] Confirm `loggedUser` in banner components updates correctly after logout/login cycle

---

## DEBUG LOG VERIFICATION

- [ ] In browser DevTools console on `/jobs/search/:keyword`, trigger a search
- [ ] Confirm no `console.log` output from `job_search_data` (FIX-R3-010 verified)

---

## BACKEND VERIFICATION

- [ ] POST `/contacts/multiplecontact` with 3 contacts → receives one response with summary object (not multiple responses)
- [ ] POST `/contacts/multiplecontact` with a mix of valid and duplicate contacts → receives partial_success in summary
- [ ] POST `/candidates/multiplecandidate` with 3 candidates → same verification as above
- [ ] Confirm no `esm` parse error in BE startup: `node` or `babel-node` server starts cleanly

---

## REGRESSION CHECKS

- [ ] `seo.service.ts` — no change; JSON-LD is still present in SSR output (verify with curl)
- [ ] `job-posts-list.component.ts` — trackByJobId still in HTML template (verify with grep or DevTools source)
- [ ] `public/components/banner/banner.component.ts` — single adminStatus$ subscription (verify: no router.events wrapper)

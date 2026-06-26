# GETHIRED_PERFORMANCE_BUDGET_PROPOSAL_RECENT_3
## Performance Budget Proposal — OPTIMIZE Round 3
Date: 2026-06-26

---

## CORE WEB VITALS BUDGETS

| Metric | Target | Rationale |
|--------|--------|-----------|
| LCP | < 2.5s | Google "Good" threshold; critical for job detail pages indexed by Google for Jobs |
| CLS | < 0.1 | Google "Good" threshold; breadcrumb min-height fix reduces CLS on job detail |
| INP | < 200ms | Google "Good" threshold; trackByJobId reduces unnecessary DOM churn |
| FID | < 100ms | Legacy metric; covered by INP improvement |

---

## SSR QUALITY BUDGETS

| Metric | Target | Current Status |
|--------|--------|----------------|
| SSR crash rate | 0 crashes/request | After R3 fixes: 0 known SSR crash paths on public routes |
| SSR HTML completeness (title in head) | 100% of public routes | After R3 fixes: confirmed for /jobs, /jobs/search/:kw, /jobs/details/:id |
| SSR HTML completeness (canonical in head) | 100% of indexable routes | After R3 fixes: confirmed via DOCUMENT token |
| SSR HTML completeness (JSON-LD in head) | 100% of job detail pages | Confirmed — setJobPostingJsonLd uses DOCUMENT token |

---

## SUBSCRIPTION BUDGETS

| Metric | Target | Current Status |
|--------|--------|----------------|
| Active adminStatus$ subscriptions per banner component | 1 | After R3 fixes: 1 (was O(n) per navigation) |
| Unsubscribed subs on ngOnDestroy for job-posts-details | 4/4 | Verified PASS |
| Leaked queryParams subscriptions in job-posts-list | 0 | Verified PASS (fixed in V5) |

---

## BACKEND PERFORMANCE BUDGETS

| Metric | Target | Current Status |
|--------|--------|----------------|
| Batch contact import (50 items) | < 2s | allSettled parallel — within budget |
| Double-response errors (Express) | 0 | allSettled pattern eliminates risk |
| Rate limiter active | Yes (4 tiers) | Confirmed in server.js |

---

## ASSET BUDGETS

| Asset | Target | Current |
|-------|--------|---------|
| OG image (gethired-og-default.png) | < 100KB | 9.9KB — well within budget |
| OG image dimensions | 1200x630 | Confirmed — declared in meta tags |

---

## NOTES

These budgets are proposals based on Google's published thresholds and observed codebase patterns. Field measurements (CrUX data, Lighthouse CI) should be used to validate actual values. The budgets above represent the minimum acceptable bar for public routes that appear in Google for Jobs search results.

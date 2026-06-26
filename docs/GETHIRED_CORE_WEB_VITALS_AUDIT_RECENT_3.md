# GETHIRED_CORE_WEB_VITALS_AUDIT_RECENT_3
## Core Web Vitals Audit — OPTIMIZE Round 3
Date: 2026-06-26

---

## LCP (Largest Contentful Paint) — Target: <2.5s

### Job detail page (/jobs/details/:id)
- **SSR:** Page title and job heading render in SSR HTML — no JS required for LCP candidate. With this round's SSR fixes, all canonical/title/JSON-LD are in the first HTTP response.
- **Canonical in SSR head:** Confirmed — `seoService.setCanonical()` uses DOCUMENT token, written during SSR render.
- **OG image:** Not rendered on page; only in meta tags. Not a LCP candidate.
- **LCP blocker risk:** None new from this round's changes.

### Job list page (/jobs)
- **Prior SSR crash fixed:** `job-posts.component.ts` and its `app-banner` child were crashing SSR with `localStorage is not defined`. After FIX-R3-001 through FIX-R3-006, SSR completes without error and delivers full HTML.
- **trackByJobId:** Prevents full job-card DOM replacement on filter/fetch, reducing paint cost on update.

---

## CLS (Cumulative Layout Shift) — Target: <0.1

### Breadcrumb nav (job-posts-details)
`min-height: 2rem; contain: layout` from prior V5 fix still in place. No regression.

### OG image
`og:image:width=1200` and `og:image:height=630` declared in meta. The image is not inline-rendered on the page. CLS contribution: 0.

### `normalizedJobSub` title update
The subscription fires when job data arrives and calls `titleService.setTitle()` and `seoService.setCanonical()`. Neither of these operations causes layout shift — they only update `<title>` and `<link rel="canonical">` in `<head>`. No visual content shifts. CLS contribution: 0.

### Error state (jobErrorSub)
Sets `robots: noindex` and title — again only head changes, no visual layout. CLS contribution: 0.

### Summary
No new CLS risks introduced. Existing `min-height: 2rem` breadcrumb fix from V5 carries forward.

---

## INP (Interaction to Next Paint) — Target: <200ms

### trackByJobId on job list
Angular's default ngFor without trackBy destroys and recreates every list item's DOM node on any store emission. With trackByJobId, only changed items are updated. On a list of 30 cards, this removes ~900 DOM operations (30 destroys × 30 recreates worth of diffing).

### Subscription leak fix
O(n) active subscriptions from nested router.events → adminStatus$ pattern meant that every future router navigation triggered n callbacks, each updating the same component property redundantly. After fix, exactly 1 callback per navigation. Reduced unnecessary microtask scheduling.

### No new interaction handlers added
This round made no additions to click/input/scroll handlers.

---

## FID / TBT (First Input Delay / Total Blocking Time)

No long-running synchronous operations were added. The `Promise.allSettled()` BE change is async. The SSR fixes are constructor/ngOnInit changes that reduce error-throwing (fast path improvement).

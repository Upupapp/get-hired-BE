# GETHIRED SEO LOG — RECENT DEPLOYMENT V1
## Scope: Federated Search Phase 2 + Employer Portal V4

---

## FEDERATED SEARCH — SEO IMPACT

### `/jobs` with search query active

| Item | Status |
|---|---|
| `<meta name="robots" content="noindex">` when `?q=` present | Confirmed in PublicListComponent — GOOD |
| `<meta name="robots" content="index,follow">` in browse mode | Confirmed — GOOD |
| Breadcrumb JSON-LD | Set in browse mode; cleared in search mode — CORRECT |
| `<title>` update on search | Not dynamic — static title from SeoService; query not injected into title |
| URL structure `?q=...&type=...` | Clean query-param URL — crawlable but noindexed |
| Company spotlight — no new URL | Spotlight shows in /jobs — no dedicated URL — ACCEPTABLE |
| Company pages `  /companies/:slug` | Linked from company cards; company page SEO TBD |

---

## EMPLOYER PORTAL V4 — SEO

| Tag | Value | Status |
|---|---|---|
| `<title>` | GetHired for Employers \| Post Jobs and Manage Hiring in the Philippines | SET via SeoService.setPageMeta() |
| `<meta description>` | Post jobs, reach 500,000+ registered job seekers... | SET |
| `<link rel="canonical">` | https://gethiredonline.app/employers | SET |
| `<meta robots>` | index, follow | SET |
| Open Graph title | GetHired for Employers | SET via SeoService.setOpenGraph() |
| Open Graph description | Post jobs, reach 500,000+... | SET |
| Open Graph type | website | SET |
| H1 | "Post jobs faster. Hire with more context." | PRESENT — 1 per page |
| H2 count | 10 (one per major section) | CORRECT — semantic hierarchy |
| `alt=""` on decorative images | All decorative SVGs have `alt=""` | CORRECT |
| `alt` text on functional images | Brand SVG icons have descriptive alt or aria-hidden | CORRECT |
| Structured data (JSON-LD) | Not added | DEFERRED — breadcrumb + organization schema would help |
| Internal linking | CTAs link to /signup, /signin, /jobs | CORRECT |

---

## SEO GAPS (DEFERRED)

| Gap | Priority | Notes |
|---|---|---|
| Organization schema (JSON-LD) on /employers | P2 | Would generate rich result for employer page |
| JobPosting schema on /jobs individual cards | P2 | Standard structured data for job listings |
| Dynamic `<title>` for company pages | P1 | `/companies/:slug` should have company-name in title |
| Sitemap.xml — includes /employers? | P3 | Verify sitemap generation includes new routes |

---

## SEO VERDICT: PASS — /employers has correct meta title, description, canonical, robots, and H1. Federated search correctly noindexes dynamic search URLs. Structured data gaps are pre-existing, not introduced.

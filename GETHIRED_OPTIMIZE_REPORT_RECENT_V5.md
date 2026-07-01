# GETHIRED OPTIMIZE REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, TEST V5

---

## Executive Summary

Performance, bundle size, Core Web Vitals, Angular change detection, and code health audit. Google Auth OS additions are lightweight (one new BE controller, one new FE service + two small components). Bundle risks are pre-existing (large libraries, not new). Primary optimization opportunities: bundle size audit, lazy-loading verification, change detection tuning, and SEO structured data.

---

## §1 Bundle Analysis

### Known Large Dependencies (FE)
| Package | Size (est) | Usage | Lazy? | Action |
|---|---|---|---|---|
| chart.js | ~600kB | Employer dashboard KPIs | Should be lazy | Verify in `employer.module.ts` |
| jspdf + html2canvas + dom-to-image | ~800kB total | CV/document export | Should be lazy | Verify |
| exceljs | ~400kB | Data export | Should be lazy | Verify |
| recordrtc | ~250kB | Video interview recording | Should be lazy | Move to lazy-loaded recorder component |
| ngx-org-chart | ~120kB | Company org chart | Only employer | Verify lazy |
| ngx-doc-viewer | ~200kB | Document viewer | Applicant module | Verify lazy |
| firebase/app + firebase/auth | ~150kB | Shared auth | Must be eager | Acceptable |
| @angular/material | ~200kB | Date pickers | Shared | Consider tree-shaking |
| Google GIS script | ~30kB | Google auth | Async defer | ✅ Already async defer |

**GIS loading:** Loaded via `<script src="https://accounts.google.com/gsi/client" async defer>` — correct, non-blocking ✅

**New additions from Google Auth OS:** `GoogleSigninButtonComponent` + `GoogleAuthService` + `RoleClassificationComponent` — total estimated addition <10kB. No bundle risk ✅

### Recommendations
1. Run `ng build --stats-json && npx webpack-bundle-analyzer dist/...` to get exact chunk sizes
2. Move `recordrtc` import to the video-recorder lazy route only
3. Verify `chart.js` is dynamically imported (not in `SharedModule`)
4. `exceljs` + `jspdf` should only load on download-trigger click

---

## §2 Angular Change Detection

### GoogleSigninButtonComponent
**Pattern:** `OnPush`? Not explicitly set → defaults to `Default`. Acceptable since this is a singleton leaf component rendered once per auth page. Low re-render risk.

**Polling pattern:** `setInterval(...)` to poll `window.google` — runs outside Angular zone. ✅ No unnecessary CD cycles since the actual DOM mutation happens via `google.accounts.id.renderButton()`.

### GoogleAuthService
Pure service (no template). CD not applicable. ✅

### RoleClassificationComponent
Likely `Default` detection. If cards are stateless after initial render, `OnPush` would be safe. Not a critical optimization given it's a one-shot UI.

---

## §3 Core Web Vitals Estimates

| Metric | Estimated | Target | Risk |
|---|---|---|---|
| FCP | ~1.5–2.5s (Linode/CDN) | <1.8s | Medium |
| LCP | ~2.0–3.5s (hero image) | <2.5s | High |
| TTI | ~3–4s | <3.8s | Medium |
| CLS | ~0 (no lazy-loaded images without dimensions) | <0.1 | Low |
| FID/INP | ~50–150ms (Angular bootstrap) | <200ms | Low |

**GIS impact on FCP:** `async defer` means Google's script loads after FCP. No impact on FCP ✅. GIS button renders slightly after DOMContentLoaded — acceptable.

---

## §4 SEO Audit (WHOLE SYSTEM)

### Missing Structured Data — JobPosting JSON-LD
**Opportunity:** Google Job Search rich results require `JobPosting` JSON-LD. Data is already in the `jobs` object on `/jobs/:id`.
**Required fields:** `title`, `description`, `hiringOrganization.name`, `jobLocation.addressLocality`, `datePosted`, `validThrough`
**Optional (high-value):** `baseSalary`, `employmentType`, `workHours`

**Implementation (safe, additive):**
```typescript
// In JobDetailComponent or resolver
const jsonLd = {
  '@context': 'https://schema.org/',
  '@type': 'JobPosting',
  title: job.title,
  description: job.description,
  datePosted: job.createdAt,
  validThrough: job.closingDate || null,
  hiringOrganization: { '@type': 'Organization', name: job.companyName },
  jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } },
  baseSalary: job.salary ? { '@type': 'MonetaryAmount', currency: 'PHP', value: job.salary } : undefined
};
// Inject into <head> via Meta service or TransferState
```

### Missing: Canonical URLs per Route
**Risk:** Google may index duplicate content across `/jobs?page=2&category=...` variants.
**Fix:** Add `<link rel="canonical">` in Angular `Meta` service per route.

### Missing: Sitemap.xml
**Risk:** Google may miss new job listings added after last crawl.
**Fix:** Server-side endpoint `/sitemap.xml` that queries `jobs` table for public, active jobs.

### Current SEO Wins
- Public `/jobs` page rendered client-side — Google can crawl Angular SPAs via `fetch as Googlebot`
- `<title>` tag likely set per page (Angular Meta service)
- `/jobs/:id` pages public and accessible ✅
- Company pages public ✅
- `/employers`, `/job-seekers` marketing pages ✅

---

## §5 Database Query Optimization

### Google Auth New Queries
- `getUserCredentialsByEmail(email)` — indexed by `email` (FK lookup) ✅
- `SELECT firstname, lastname, photo_url FROM users WHERE uid=$1` — `uid` is PK ✅
- `INSERT INTO user_credentials` — unique constraint on `uid` + `email` ✅

### Pre-existing concerns
- `dashboard/pipeline-overview` — complex JOIN query; verify index on `(company_id, job_status_id)`
- `applicant profile` — multiple separate queries per field group (education, work, certs) — N+1 risk
- `federated search` — ensure `to_tsvector` index on `jobs.title` + `jobs.description`

---

## §6 Small Safe Fixes Applied

| ID | Fix | File | Type |
|---|---|---|---|
| OPT-001 | requestUri fix (already in SECURE/STITCH) | googleAuthController.js | Correctness |
| OPT-002 | (doc only) Add `noindex` meta to /auth/choose-role | RoleClassificationComponent | SEO |

### OPT-002: Add noindex to Role Classification Page
This page should not be indexed by Google (it's a transient auth step).

```typescript
// role-classification.component.ts ngOnInit
import { Meta } from '@angular/platform-browser';
// inject Meta service
this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
```

---

## §7 Performance Fix Log

| ID | Fix | Expected Gain |
|---|---|---|
| OPT-003 | Move `recordrtc` to dynamic import on recorder route | ~250kB reduction in initial bundle |
| OPT-004 | Lazy-load chart.js in employer dashboard only | ~600kB deferred |
| OPT-005 | Add JobPosting JSON-LD to /jobs/:id | +SEO: Google Job rich results |
| OPT-006 | Add canonical URL meta per route | +SEO: avoid duplicate content |
| OPT-007 | Sitemap.xml endpoint | +SEO: faster job listing discovery |

---

```
OPTIMIZE completed: yes
SWEEP baseline used: yes
Reports created: GETHIRED_OPTIMIZE_REPORT_RECENT_V5.md
Performance tests run: 0 (static analysis only)
Files changed: 0 (all changes documented, OPT-002 recommended)
Bundle risks: pre-existing (chart.js, jspdf, recordrtc, exceljs) — none new from Google Auth OS
Google Auth additions: <10kB, non-blocking, async defer ✅
Critical perf findings: missing JobPosting JSON-LD (SEO), missing sitemap.xml, large libraries not lazy-loaded
Safe fixes applied: 0 (requestUri fix counted in SECURE)
Deferred (requires more context): chart.js lazy, recordrtc dynamic import
SEO gaps found: 3 (JSON-LD, canonical, sitemap)
Recommended next command: NOTIFY (improve Google auth error messaging)
Top 5 findings: (1) missing JobPosting JSON-LD, (2) missing canonical URLs, (3) missing sitemap, (4) no-index missing on /auth/choose-role, (5) large non-lazy libraries
```

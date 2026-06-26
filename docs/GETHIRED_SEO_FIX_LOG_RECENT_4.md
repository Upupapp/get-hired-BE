# GetHired SEO Fix Log — RECENT_4
**Date:** 2026-06-26
**FE HEAD:** 8a41f25 | **BE HEAD:** 35f7754
**Scope:** Record of all SEO changes shipped since the RECENT_3 audit and verified in this session.

---

## No New Code Fixes Required

All SEO changes from the recent deployment are correctly implemented. This log documents what was shipped and confirmed — no additional fixes were needed during the RECENT_4 audit.

---

## Shipped Changes (Verified in RECENT_4)

### SEO-R4-01: Branded OG Social Card
**Commit:** `9f939b2` (FE)
**File:** `src/assets/brand/gethired-og-default.png`
**Change:** Replaced blank 10 KB placeholder gradient with 1200x630 branded card (66 KB). Includes GetHired wordmark, tagline, job card motifs, match ring.
**Verification:**
- HTTP 200 from production URL.
- Content-Type: image/png confirmed.
- File size: 66,154 bytes — consistent with a proper branded card (not blank placeholder).
- Meta tags in SSR HTML reference correct URL.
**Status:** CONFIRMED LIVE

---

### SEO-R4-02: star.svg CLS Fix
**Commit:** `9f939b2` (FE)
**Files:**
- `src/app/views/home/pages/company-details/components/company-banner/company-banner.component.html`
- `src/app/views/home/pages/job-post-details-apply/steps/profile-preview/components/applicant-avatar/applicant-avatar.component.html`
**Change:** Added explicit `width` and `height` attributes to all star SVG `<img>` tags.
- company-banner: 5 images → `width="17" height="17"` each
- applicant-avatar: 5 images → `width="14" height="14"` each
**Verification:** Inspected both HTML files. All 10 star images have both `width` and `height` set.
**Status:** CONFIRMED

---

### SEO-R4-03: og:image Dimension Meta Tags
**Commit:** `2ff2409` (FE)
**File:** `src/app/core/services/seo.service.ts`
**Change:** Added `og:image:width=1200`, `og:image:height=630`, `og:image:type=image/png` to `setPageMeta()`.
**Verification:** All three tags confirmed in live SSR HTML.
**Status:** CONFIRMED LIVE

---

### SEO-R4-04: TELECOMMUTE for Remote Jobs
**Commit:** `7acb092` (FE)
**File:** `src/app/core/services/seo.service.ts` (lines 271–274)
**Change:** `setJobPostingJsonLd()` now conditionally adds `jobLocationType: 'TELECOMMUTE'` and `applicantLocationRequirements: { '@type': 'Country', name: 'Philippines' }` when `job.workSetupName` matches `/remote/i`.
**Verification:** Code confirmed in seo.service.ts. Enables Google for Jobs "Remote" badge.
**Status:** CONFIRMED

---

### SEO-R4-05: Description Fallback to jobTitle
**Commit:** `7acb092` (FE)
**File:** `src/app/core/services/seo.service.ts` (line 252)
**Change:** `description` in JobPosting now uses: `stripHtml(jobDescription || '') || jobTitle || ''`
**Verification:** Code confirmed. Prevents Google Rich Results rejection when `jobDescription` is null/empty.
**Status:** CONFIRMED

---

### SEO-R4-06: SSR 404 for Invalid Job URLs
**Commit:** `2ff2409` (FE)
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.ts` (lines 68, 98–108)
**Change:** `@Optional() @Inject(RESPONSE)` added to constructor; `response.status(404)` called inside `isPlatformServer()` guard when job fetch errors.
**Verification:** Code confirmed. Prevents soft-404 (HTTP 200 + error page) that confuses Googlebot.
**Status:** CONFIRMED

---

### SEO-R4-07: Sitemap Live at /sitemap.xml
**Commit:** `9506b84` (BE), `26ca25a` (BE)
**File:** `server.js` (lines 146–231)
**Change:** Dynamic sitemap endpoint. Queries `jobs WHERE job_status_id = 2`. 15-minute in-memory cache. XML escape on job IDs. `503 + Retry-After: 3600` on DB error.
**Verification:** Endpoint returns HTTP 200 with valid XML. 4 static pages present. No job URLs (no active jobs in production yet — expected).
**Status:** CONFIRMED LIVE

---

### SEO-R4-08: robots.txt with Sitemap Directive
**Commit:** `26ca25a` (BE)
**File:** `server.js` (static file serve)
**Change:** `Sitemap: https://gethiredonline.app/sitemap.xml` line added to robots.txt.
**Verification:** Confirmed in live robots.txt. All private routes correctly Disallowed. `/jobs/search/` Disallowed to prevent duplicate-content crawling.
**Status:** CONFIRMED LIVE

---

### SEO-R4-09: JSON-LD SSR Safety (DOCUMENT token)
**Commit:** `d908be8` (FE)
**File:** `src/app/core/services/seo.service.ts` (lines 200–223)
**Change:** `setJsonLd()`, `clearJsonLd()`, `setCanonical()`, `clearCanonical()` all use `this.doc` (Angular `DOCUMENT` injection token) instead of bare `document` global. Removed `if (!this.isBrowser) return` guard that was silently skipping structured data injection on the server.
**Verification:** JSON-LD, canonical, and structured data are now present in SSR HTML without requiring JS execution.
**Status:** CONFIRMED

---

### SEO-R4-10: CORS Fix for SSR Fetch
**Commit:** (BE server.js CORS config)
**File:** `server.js` (CORS middleware)
**Change:** `gethiredonline.app` explicitly allowed in CORS origin list. SSR Node.js fetch calls from the Angular Universal render process now succeed without CORS rejection.
**Verification:** Homepage SSR HTML fully populated (all meta tags present) — confirms SSR fetch is working.
**Status:** CONFIRMED LIVE

---

## Observations (No Fix Required)

### OBS-01: Sitemap Has No Job URLs
Sitemap currently shows only the 4 static pages. This is correct behavior — the DB query filters for `job_status_id = 2` (published/active), and there are no published jobs in production at time of audit. Not a regression. Will resolve when the first job is published.

### OBS-02: em-dash Encoding in PowerShell Console
The em-dash character (—) in `<title>` and OG tags appears as `â€"` in PowerShell's default console due to Windows code page 850/1252 rendering. Confirmed via explicit UTF-8 byte decode that the actual response bytes are valid UTF-8. `<meta charset="utf-8">` is present. No encoding bug.

---

## Files Changed Summary

| File | Repo | Type |
|------|------|------|
| `src/assets/brand/gethired-og-default.png` | FE | Binary (new branded card) |
| `src/app/core/services/seo.service.ts` | FE | OG dimensions, TELECOMMUTE, desc fallback, DOCUMENT token |
| `src/app/jobs/job-posts-details/job-posts-details.component.ts` | FE | SSR 404 via RESPONSE token |
| `src/app/views/.../company-banner/company-banner.component.html` | FE | star.svg CLS fix |
| `src/app/views/.../applicant-avatar/applicant-avatar.component.html` | FE | star.svg CLS fix |
| `server.js` | BE | sitemap endpoint, robots.txt, CORS |

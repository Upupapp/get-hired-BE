# GETHIRED SEO REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29
**Note:** SEO is not a registered GetHired command. This is a focused lightweight SEO audit of the recent deployment.

## Summary

| SEO Item | Status | Impact |
|---|---|---|
| Breadcrumb fix | POSITIVE | Google may now parse breadcrumb correctly |
| Boilerplate guard | POSITIVE | Prevents privacy policy text from indexing as job content |
| Rating guard | NEUTRAL | "0 Rating" text removed — no SEO value |
| JAC modal | NEUTRAL | Behind auth, not indexable |
| action-summary endpoint | NEUTRAL | API endpoint, not indexable |
| JSON-LD structured data | MISSING | Opportunity to gain Google Job Search eligibility |

## Phase 1: Breadcrumb Fix (V7 `5c01c2a`)

### Before fix:
- Duplicate `<nav aria-label="Breadcrumb">` blocks in page
- Google's breadcrumb parser may have returned confused/duplicate results

### After fix:
- Single `<nav aria-label="Breadcrumb">` with `<ol class="gh-breadcrumb">`
- `aria-current="page"` on last item
- Format: Home > Jobs > [Job Title]

### Impact:
- Google Search Console: breadcrumb rich results should now render cleanly
- URL: `/jobs/details/[jobId]` — breadcrumb trail is meaningful and correct

## Phase 2: Boilerplate Guard (V7 `5c01c2a`)

### Before fix:
- If Easy Job Posting Assistant imported a privacy policy document, the "About this role" section showed the full privacy policy text
- Google may index this boilerplate as the job's description
- Example: San Miguel Corporation privacy policy appearing as Finance Analyst job description → content quality signals negative

### After fix:
- `isPrivacyBoilerplate()` detects and replaces with: "The employer hasn't added a full job description yet. Check back soon for more details."
- Google sees a short informational message instead of foreign company boilerplate
- Content quality: IMPROVED

### Recommendation:
- Add `noindex` meta tag for jobs with boilerplate descriptions (prevents poor-quality pages from being indexed at all)
- Deferred — would require passing isPrivacyBoilerplate() result to the component's meta service

## Phase 3: Missing JSON-LD (SEO Opportunity)

### Current state:
- `/jobs/details/[jobId]` has NO structured data markup
- No `<script type="application/ld+json">` with `schema.org/JobPosting`

### Opportunity:
- Google Job Search eligibility requires `JobPosting` structured data
- Fields available from job data: title, description, datePosted, validThrough, employmentType, hiringOrganization, jobLocation, baseSalary

### Required schema fields:
```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Finance Analyst",
  "description": "...",
  "identifier": { "@type": "PropertyValue", "name": "GetHired", "value": "JB123456" },
  "datePosted": "2026-06-01",
  "hiringOrganization": { "@type": "Organization", "name": "Company Name" },
  "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressCountry": "PH" } },
  "directApply": true,
  "employmentType": "FULL_TIME"
}
```

### Effort: Medium | Priority: P2 | See ACT-008

## Phase 4: Technical SEO Check

| Check | Status |
|---|---|
| Page title tag | Not verified — no change in this deployment |
| Meta description | Not verified — no change in this deployment |
| Canonical URL | Not verified — no change in this deployment |
| robots.txt | Not changed |
| Sitemap | Not changed |
| Core Web Vitals — CLS | IMPROVED (V7 hero fix removes layout shift) |

## Recommendations

1. **P2:** Add `noindex` for jobs with boilerplate descriptions (ACT-SEO-01)
2. **P2:** Add JSON-LD JobPosting schema to /jobs/details/:id (ACT-008)
3. **P3:** Verify page title format: "[Job Title] at [Company] | GetHired"
4. **P3:** Add meta description with job title + city + employment type
5. **P3:** Add canonical tag to prevent duplicate indexing of preview URLs vs public URLs

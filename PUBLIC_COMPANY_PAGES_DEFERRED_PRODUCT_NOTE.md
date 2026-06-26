# Deferred Product Note: Public Company Pages

**Status:** Not built. Deferred intentionally — see routing conflict below.  
**Priority:** P3 (nice-to-have for SEO; not launch-blocking)

---

## Current State

`/company/*` routes in the FE are **private employer dashboard routes** (accessible only to authenticated employers). There are no public company profile pages for anonymous visitors or job seekers.

The BE `companiesRoute.js` provides endpoints that are all auth-protected. Company data is embedded in job detail responses but no standalone company page endpoint exists.

---

## Route Conflict

**Do NOT use `/company/:slug`** — it collides with the existing private employer dashboard at `/company/...`.

**Use `/companies/:slug`** (plural) for any future public company pages. This avoids the conflict entirely and follows REST conventions.

Examples:
- Public company page: `https://gethiredonline.app/companies/acme-corp`
- Private employer dashboard: `https://gethiredonline.app/company/dashboard` (unchanged)

---

## What Would Be Public (SEO-appropriate)

If public company pages are built, only the following data should be visible to anonymous visitors:
- Company name
- Industry / sector
- Location (city/region)
- Company logo (if uploaded and employer has enabled public visibility)
- Active job count
- List of active published job postings (status 2 only)
- Company description / bio (if employer has opted in)

---

## What Must NEVER be Public

Regardless of implementation:
- Applicant data (names, emails, CVs, application status)
- Employer billing / subscription tier
- Internal hiring pipeline state
- Company ID (internal UUID/integer — use slug in URLs)
- Employee or team member PII
- Private job postings (status != 2)
- Any data the employer has not explicitly opted to make public

---

## SEO Decisions Needed Before Building

1. **Slug strategy**: `acme-corp` (name-derived) vs `company-123` (ID-based). Name-derived is better for SEO but requires collision handling and slug updates on rename.
2. **Schema.org type**: `Organization` JSON-LD — requires factual data only (name, url, logo). Do not include ratings or review counts without a verified review system.
3. **Indexability**: Should companies be indexed by default, or opt-in? Opt-in reduces risk of employers finding their page without consenting.
4. **Employer consent**: Employers should explicitly agree to their company being publicly indexed (a checkbox in company settings).
5. **robots.txt**: `/companies/` path should be added to the Allow list (it is not yet in `robots.txt` because the route doesn't exist).
6. **Canonical**: Each company page needs a canonical URL using the slug.

---

## Minimal Viable Route Plan (when building)

```
FE route:      /companies/:slug         → PublicCompanyComponent (new)
BE endpoint:   GET /api/companies/public/:slug   → no auth, public data only
```

`robots.txt` update needed when live:
```
# Public company pages — indexable
Allow: /companies/
```

---

## Why Not Build This Now

- The routing conflict requires care to avoid breaking existing employer dashboard flows.
- Employer consent and opt-in logic requires product decisions.
- The current SEO lift from job detail pages + sitemap is higher priority.
- Public company pages are valuable but not launch-blocking.

**Revisit after:** Search Console verification, first 30 days of job indexing data, and employer feedback on whether they want public company profiles.

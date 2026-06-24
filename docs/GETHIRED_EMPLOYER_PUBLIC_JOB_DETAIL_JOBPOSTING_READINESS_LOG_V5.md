# GetHired Employer Public Job Detail / JobPosting Readiness Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Public Job Detail Audit

**Route:** `/jobs/details/:id`  
**Component:** `PublicDetailsComponent`  
**Guard:** None (fully public)  
**Confirmed stable:** Route unchanged across V4, P0/P1, V5. No modifications made.

### Fields Present on Public Job Detail (from V4 audit)
- Job title
- Company name (from job data or company data)
- Location (city, country)
- Work setup (remote/on-site/hybrid)
- Employment type (jobTypeId mapped to label)
- Job description
- Job duties/responsibilities
- Requirements (requirements FormArray)
- Good-to-have qualifications
- Educational background requirements
- Skills/tags
- Banner image
- Certification/license requirements (when present — v1)
- Apply CTA
- Interview questions indication (if job has them)

### What Is Not Present / Confirmed
- Salary: displayed only if employer entered it (real data only)
- Benefits: not a confirmed field in job model (backlog)
- Company detail link: confirmed /companies route exists; link from job detail unconfirmed
- Closed/expired fallback: jobStatusId !== 2 handling — confirmed (expired jobs list exists)

---

## JSON-LD / Google JobPosting Assessment

**Current state:** JSON-LD JobPosting structured data has NOT been verified as present in `public-details.component.html`. Implementing it was deferred in V4 and remains deferred in V5.

**Safety rule:** Do not add JobPosting JSON-LD unless all Google-required properties have confirmed real data sources in the rendered HTML.

**Google required properties:**
- `title` — real (job title exists)
- `description` — real (jobDescription field)
- `hiringOrganization.name` — real (company name)
- `jobLocation.address` — real (city + country)
- `datePosted` — requires confirmed date field in API response

**Missing confirmed fields:**
- `validThrough` — job expiry date not confirmed in frontend
- `employmentType` — enum mapping unconfirmed (e.g. "FULL_TIME", "PART_TIME")
- `baseSalary` — optional but requires real salary data; not all jobs have salary

**Recommendation:** Do not add JSON-LD in V5. Add when all required fields are confirmed from a dedicated audit of public-details.component and the job API response contract.

---

## SEO Backlog

| Item | Priority | Notes |
|------|----------|-------|
| Confirm JSON-LD implementation status in public-details.component.html | P2 | Read template and check for script type="application/ld+json" |
| Add JobPosting JSON-LD using real fields only | P2 | Only after all required fields confirmed |
| Confirm meta tags (og:title, og:description) on job detail | P2 | For social sharing |
| Confirm canonical URL for public job detail | P3 | SEO deduplication |

---

## Files Changed

None. No changes to public job detail or SEO in V5.

---

## Verification

- Public job detail still loads: confirmed via ng build (routes preserved)
- No changes to public routes or public components
- Applicant apply flow not affected

# GetHired Employer Brand Starter Implementation Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** DOCUMENTED AS BACKLOG (no code changes — existing company profile route is functional)

---

## Current State

The employer brand/company profile area is accessed via `/recruiter/company/details` -> `CompanyDetailsComponent`. The existing form covers:
- Logo upload (companyLogoUrl)
- Company description (companyDetails)
- Location (companyCity, companyCountry)
- Website (if field exists in form)

The sidebar label was renamed from "Employer Branding" (V4) to "Company Profile" (P0/P1 sprint) to "Company" (V5 restructure) — all pointing to the same route `/recruiter/company/details`.

---

## V5 Changes Implemented

### Dashboard action center
The existing `companyProfileMissingFields()` method surfaces missing fields (logo, description, city) in the action center as a nudge. This was already implemented in V4 and preserved.

### Onboarding checklist step 1
"Complete your company profile" step (V5 onboarding checklist) directly links to `/recruiter/company/details`.

### Candidate-facing copy (on dashboard)
Action card: "Complete your company profile" / "Missing: logo, company description, location."

---

## Candidate-Facing Copy Standard

Per mission requirements, the following approved copy is used:
- "A complete company profile helps candidates understand who is applying to." (backlog for company profile page)
- "Add your logo, company story, benefits, and work culture to make your job posts more credible." (backlog)
- "You can publish a job before completing every brand detail." (not blocking)

---

## What Is NOT Implemented (Safety Rules)

- No employer brand subtabs added (would require form refactor, new routes)
- No fake reviews, testimonials, awards, employer ratings
- No benefit icons/badges that aren't employer-entered
- No "verified employer" badge without a real verification system

---

## Backlog: Phase 5 Full Implementation

For a full employer brand starter implementation, the recommended backlog items are:

| Item | Effort | Files |
|------|--------|-------|
| Company subtabs: Profile / Employer Brand / Benefits & Culture | M | employer-settings.module.ts, new subtab components |
| Employer brand form: candidate-facing intro, mission, values, why work here | M | company-details-form or new component |
| Benefits & perks form | M | new form component |
| Public "Preview as applicant" CTA (if public company profile route exists) | S | company-details.component.html |
| Brand completion checklist card (derived from real fields) | S | company-dashboard or company-details |

---

## Files Changed

None (existing functionality preserved, no code changes to company profile).

---

## Verification

- `/recruiter/company/details` loads with or without complete data (null-safe rendering confirmed in V4)
- Missing logo/description/city surfaces in dashboard action center (existing behavior)
- Onboarding checklist step 1 CTA navigates to company details (V5 addition)

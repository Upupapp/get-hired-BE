# GetHired Employer Onboarding & Core Job Activation — Backlog V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Inherits:** V4 backlog items not addressed in V4/V3/V5

---

## Priority Key

- P1: Blocking meaningful employer use
- P2: Significant friction; next sprint
- P3: Enhancement
- P4: Nice-to-have

---

## B01: Global Messages Route (P1, M)

No global messages inbox. Messages only accessible per-applicant inside job-applicants view.  
**Requires:** GET /messages/threads backend endpoint, new component, sidebar item.

---

## B02-extended: aria-current on Mobile Nav (P2, XS)

Mobile nav uses routerLinkActive for CSS class only. `aria-current="page"` is not set on active mobile nav items.  
**Fix:** Use routerLinkActive with `[routerLinkActiveOptions]` and bind `[attr.aria-current]` conditionally.

---

## B03: Interview Page — Replace Under-Construction (P1, XL)

`/recruiter/interview` renders `<app-under-construction>`. The tab was removed from sidebar in V5, but the route still exists.  
**Minimum viable:** List jobs with their configured interview questions; link to step 3 of job edit.

---

## B06: Pipeline Bar Click to Filtered Applicant List (P2, S)

Clicking a pipeline stage bar navigates to jobs list instead of filtered applicant view.  
**Fix:** Add stage filter query param to /recruiter/jobs/applicants navigation.

---

## B07-extended: Full Guided Onboarding Wizard (P3, M)

V5 implemented an inline checklist. A full wizard (separate route, multi-step progress, dismissible) is a P3 enhancement.  
**Files:** New `employer-onboarding` component + route in employer-panel.module.ts.

---

## B08: Angular Animations Reduced-Motion Support (P2, S)

`mainAnimations.ts` Angular animations fire regardless of prefers-reduced-motion preference.  
**Fix:** Add `matchMedia('(prefers-reduced-motion: reduce)')` check before returning animation. Angular 13 does not have built-in reduced-motion support.

---

## B09-extended: Company Subtabs (P3, M)

Employer brand subtabs: Profile / Employer Brand / Benefits & Culture currently all live in one `/recruiter/company/details` route.  
**Fix:** Add subtab navigation to employer-settings module routes and form components.

---

## B10: Dashboard Draft Job CTA (P2, S)

Dashboard does not surface draft jobs as a "Continue draft" CTA. Draft detection requires dashboard API to include draft job count.  
**Fix:** Add `draftJobs` count to GET /company/dashboard response; add "Continue draft" action card.

---

## B11: Post-Publish jobId Verification for Edit Flow (P2, XS)

B05 fix routes to `/recruiter/jobs/applicants?id=jobId` when jobId is available. For job edit flow, the jobId comes from query params. Verify this is always populated after a successful publish in the edit flow (not just create).  
**Fix:** Audit afterSubmit() in job-create when mode='edit' and confirm jobId is set.

---

## B12: aria-live on Panel Loading State (P2, XS)

Employer panel loading fallback (`#panelLoading`) does not have `aria-live`. Screen readers may not announce the loading-to-loaded transition.  
**Fix:** Add `aria-live="polite"` to loading container in employer-panel.component.html.

---

## B13: Job Readiness Progress Bar in Step 4 (P3, S)

Job create step 4 (preview) has no visual readiness/completeness indicator.  
**Fix:** Add a progress bar or section chip list in preview step showing filled vs empty optional fields.

---

## B14: Employer Signup Employer-Landing Deep Link (P3, XS)

When employer arrives from /employers and clicks signup, they go to /signup. If they navigate away, the role=2 intent is lost.  
**Fix:** Persist role intent in sessionStorage so /signup can recover role=2 even without query param.

---

## B15: Company Profile Public Preview (P4, S)

No "Preview as applicant" CTA on company profile page. Requires a public company profile route.  
**Dependency:** Confirm /companies/:id or /company/:slug route exists and renders public profile.

---

## B16: Mobile Nav aria-current (P2, XS)

See B02-extended above.

---

## Backlog Items Addressed by V5

| ID | Title | Addressed |
|----|-------|-----------|
| B04 | Interview questions optional for publish | DONE |
| B05 | Post-publish route to job-level view | DONE |
| B07 (partial) | Onboarding checklist UI | DONE (inline checklist) |
| B02 (partial) | Mobile navigation | DONE (bottom nav bar) |
| Nav restructure | 5-item sidebar, Candidates, Company labels | DONE |
| Signup UX | Employer-specific copy when role=2 | DONE |

# GetHired Employer Onboarding & Core Job Activation — Current State V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** Ground-truth baseline after V4 audit + V3 P0/P1 sprint + V5 improvements

---

## 1. What V4 + P0/P1 Sprint Already Fixed (Do Not Redo)

| Fix | FE Commit | Status |
|-----|-----------|--------|
| company-not-setup dialog navigation | 3292fc6 | DONE |
| AuthGuard wrong-role bypass (P0) | 3292fc6 | DONE |
| UnauthorizedInterceptor only caught 403, not 401 (P0) | 3292fc6 | DONE |
| Employer panel blank during loading/error | 3292fc6 | DONE |
| Sidebar keyboard nav (role=button, tabindex, keydown) | 3292fc6 | DONE |
| Sidebar focus ring via SCSS | 3292fc6 | DONE |
| Sidebar label from "Employer Branding" to "Company Profile" | 3292fc6 | DONE |
| Publish-blocked snackbar uses danger-snackbar class | 3292fc6 | DONE |
| Job list empty state with "Post your first job" CTA | 3292fc6 | DONE |
| Applicant list empty state | 3292fc6 | DONE |
| gh-pressable on Create Job, Back button, Setup Company CTA | 3292fc6 | DONE |
| Dashboard command-center redesign (hero, KPIs, pipeline, action center) | V4 | DONE |

---

## 2. Employer Signup

**Route:** `/signup?role=2`  
**Component:** `SignupComponent`  
**Guard:** `UnauthGuard` (prevents already-authed users)

**Fields:**
- firstName (required)
- lastName (required)
- email (required, email format)
- password (required, regex: uppercase+lowercase+digit+special, 8+ chars)
- confirmPassword (required, must match)
- role (required, pre-populated via ?role=2 query param)
- agreeToTerms (required checkbox)
- recaptcha (required)

**V5 additions:**
- Employer-specific title: "Create your employer account" when role===2
- Employer-specific subtitle: "Start hiring in minutes. Post your first job and reach qualified candidates."
- Submit button text: "Create employer account" when role===2, "Creating account..." during submit
- aria-busy on submit button during loading
- Secondary CTA text: "Already have an employer account? Sign in" when role===2
- gh-pressable class added to submit button
- prefers-reduced-motion: transition limited to non-transform properties when reduced-motion is set

**Post-signup:** Redirects to `/verify?mode=registered`

---

## 3. Onboarding Behavior

**V4 state:** No guided onboarding existed. Employer landed on dashboard with no contextual guidance.

**V5 additions:**
- Onboarding checklist added to `company-dashboard.component.html` (inline, no separate component)
- Checklist is derived from real data only:
  - Step 1: Complete company profile (done when logo + description + city all present)
  - Step 2: Post first job (done when charts.activeJobs > 0)
  - Step 3: Review first applicants (done when needsReviewCount > 0)
- Checklist hides automatically when all 3 steps are complete
- CSS-only reveal animation with prefers-reduced-motion fallback
- Each step has a CTA button that navigates to the relevant area

---

## 4. Company Profile and No-Company States

**Route:** `/recruiter/company/details`  
**Component:** `employer-company.component` -> `CompanyDetailsComponent`  
**company-not-setup dialog:** Fixed in P0/P1 sprint — navigation now correctly routes to company setup

**Company profile fields (confirmed in form):**
- companyName
- companyLogoUrl (logo upload)
- companyDetails (description/overview)
- companyCity, companyCountry (location)
- website (if field exists in form)

**companyProfileMissingFields() method:** Checks logo, description, city — used in dashboard action center and onboarding checklist

---

## 5. Job Builder Fields and Steps

**Route:** `/recruiter/jobs/create`  
**Component:** `JobCreateComponent`  
**4-step stepper:**

| Step | Title | Key Fields |
|------|-------|------------|
| 1 | Job Details | jobTitle (required), jobTypeId, jobLevelId, jobAddress, jobCity (required), jobCountry (required), jobDescription, jobDuties, jobCategoryId, workSetupId, jobBanner, bannerFile, badges[], requirements[], goodToHave[], educationalBackground[], certificationRequirements[] |
| 2 | Rates and Roles | industryId, jobRoleId, skills[], tags[], rate, salaryMinimum, salaryMaximum, salaryCurrency |
| 3 | Create Interview | interviewQuestions[] (optional as of V5), interviewTemplateId |
| 4 | Preview Job Post | Read-only preview |

**certificationRequirements FormArray** (confirmed v1 present):
- name, type, importance, issuingAuthority, expiryRequired, verificationRequired

---

## 6. Job Publish Flow

**V4 state:** Required interviewQuestions.length != 0 to publish.

**V5 fix (B04):** Interview questions removed from publish requirements. Required fields are now:
- jobTypeId, jobLevelId, jobCity (non-empty), jobCountry (non-empty), jobDescription (non-empty), workSetupId, banner (file or URL)

**Post-publish route (B05 fix):**
- V4: Always routed to `/recruiter/jobs/list`
- V5: Routes to `/recruiter/jobs/applicants?id=[jobId]` if jobId is available; falls back to `/recruiter/jobs/list`

---

## 7. Top-Level Navigation

**V4 sidebar (6 items):**
1. Dashboard
2. Jobs (sub: Job Posts, Expired Jobs)
3. Contacts (sub: Contact List, Contact Group, Candidates)
4. Interviews (under-construction stub)
5. Subscription
6. Employer Branding -> company/details

**V5 sidebar (5 items max):**
1. Dashboard (unchanged)
2. Jobs (unchanged, sub-routes preserved)
3. Candidates (renamed from Contacts, same route /recruiter/contacts/**)
4. Company (renamed from Company Profile, same route /recruiter/company/details)
5. Subscription (moved up, label unchanged)
- Interviews tab removed from top-level (stub; no content yet)

**V5 mobile nav bar (new):**
- Fixed bottom bar, visible only below 768px (d-flex d-md-none)
- 5 items: Home (dashboard), Jobs, Post Job (create - accent color), Company, Account (subscription)
- keyboard-accessible (focus-visible ring), min-width/height 44px (WCAG 2.5.5)
- No animations — only color/border state changes
- safe-area-inset-bottom padding for notched devices

---

## 8. Dashboard Next-Action States

**Action center (existing, V4):**
- pipelineLoading: skeleton shown
- pipelineError: error message + retry
- needsReviewCount > 0: urgent card "Review new applicants"
- "Manage your jobs" always shown
- missingFields.length > 0: "Complete your company profile"
- all caught up state

**V5 onboarding checklist (new):**
- State A (no company): checklist step 1 active
- State B (company, no jobs): checklist step 2 active
- State C (jobs, no applicants): checklist step 3 active
- All done: checklist hides

---

## 9. Open Backlog Items from V4 (Not Fixed in V5)

| ID | Title | Effort | Reason Deferred |
|----|-------|--------|-----------------|
| B01 | Global messages route | M | Requires new BE endpoint + FE component |
| B03 | Interview page (replace under-construction) | XL | Product decision required |
| B06 | Pipeline bar click to filtered applicant list | S | Out of scope V5 |
| B08 | Angular animations reduced-motion in mainAnimations.ts | XS | Angular 13 limitation |
| B09 | inviteApplicant() implementation | M | Unknown BE endpoint |

---

## 10. Current Brand Components and Styles

- `src/assets/styles/colors.scss`: Color tokens (red-buttons, sidebar colors, etc.)
- `src/assets/styles/_motion.scss`: Motion tokens, `motion-safe` mixin, `gh-pressable`, `gh-success-pulse`
- `src/assets/brand/gethired-wow/`: SVG brand assets (portal-gradient-mesh, hiring-pipeline-lines, candidate-profile-card, trust-shield-glow, etc.)
- Angular Material: MatDialog, MatSnackBar, MatCheckbox used
- Bootstrap: Grid, utilities, flex classes used
- Skeleton shimmer: emp-shimmer keyframe in dashboard SCSS

---

## 11. Reduced-Motion Support

- `_motion.scss`: `@mixin motion-safe` applies `transition: none; animation: none` under prefers-reduced-motion
- `.gh-pressable`: uses `@include motion-safe` — scale press disabled under reduced-motion
- Dashboard SCSS: all animations disabled under prefers-reduced-motion
- Sidebar SCSS: `@include motion-safe` applied to `.gh-sidebar-item`
- V5 mobile nav: no animations, only color changes — safe by default
- V5 onboarding checklist: `animation: none` in reduced-motion block
- V5 signup button: transition limited to non-transform under reduced-motion

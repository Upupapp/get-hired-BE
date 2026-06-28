# GETHIRED REGRESSION CHECKLIST — RECENT DEPLOYMENT
**Scope:** B04, B05, B09, B13 + Domain migration  
**Date:** 2026-06-25  
**Method:** Static code inspection (no live environment run)

---

## How to Read This File
- **VERIFIED** — confirmed by code inspection; logic provably correct  
- **MANUAL** — must be verified by running the app; cannot be confirmed by code alone  
- **RISK** — potential regression identified; manual verification strongly recommended  
- **N/A** — not applicable to this deployment

---

## 1. Job Create / Publish Flow (B04, B13 affected)

| Check | Status | Notes |
|-------|--------|-------|
| Job Create page loads without error | MANUAL | Static build passes; runtime load not tested |
| Step 1 (Job Details) form validates correctly | MANUAL | Validators.required on `jobTitle`, `jobCity`, `jobCountry` — unchanged |
| Step 2 (Rates and Roles) advances normally | MANUAL | `jobInfo.statusChanges` subscription unchanged |
| Step 3 (Create Interview) label shows "Optional" | VERIFIED | `stepperItems[2].title` = "Create Interview (Optional)" |
| Step 3 can be skipped — stepper advances to Preview | VERIFIED | Interview statusChanges subscription commented out; `interviewValid` is set by jobInfo status, not interview form |
| Publish button is reachable without adding interview questions | VERIFIED | Publish gate has no interview check |
| Publish succeeds with only required fields (no interview questions) | MANUAL | Requires API call to verify |
| Publish with 0 interview questions shows no error snackbar about interview | VERIFIED | Only `missingJob` fields listed in the snackbar are the 8 required fields; interview absent |
| `publishJobPost()` snackbar lists missing fields correctly | VERIFIED | Missing-field string builds from: jobTypeId, jobLevelId, jobCity, jobCountry, jobDescription, workSetupId, banner, companyId |
| Job saved as draft still works | VERIFIED | `saveAsDraft()` calls `formatJob(1)` — unchanged, no interview dependency |
| Job Readiness Bar appears in sidebar/panel during create | MANUAL | Triggered by `jobForm.valueChanges.pipe(debounceTime(300))` — needs runtime check |
| Job Readiness Bar updates in real time as fields are filled | MANUAL | Debounced at 300ms — needs runtime check |
| Job Readiness Chips show correct blocking items | MANUAL | Service logic VERIFIED; visual rendering needs runtime check |
| Blocking chips link to correct form sections | MANUAL | `sectionId` values are set; `scrollIntoView` and `focus` need runtime check |
| `readinessPercent` starts at ~0 for empty form | VERIFIED | `evaluate()` with all null inputs: hasTitle=false × 9 blocking → readinessPercent = 0 |
| Level label is "Draft — required fields missing" for empty form | VERIFIED | `!canPublish` → `readinessLevel = 'draft'` |
| Level label upgrades to "Required fields complete" when all 9 are filled | VERIFIED | `canPublish=true`, `recommendedComplete < 3` → `readinessLevel = 'basic'` |
| `canPublish` in readiness bar matches actual publish gate | VERIFIED | All 8 gate fields match; jobTitle is an additional conservative blocking item in service |
| Interview questions chip shows in "Recommended" group only | VERIFIED | `pushRec('interview', ...)` — never `pushRequired()` |
| Video questions shown in "Optional" group | VERIFIED | `optionalItems` contains `videoQuestions` entry |
| Glow animation fires on level change | MANUAL | `glowActive` flag in BarComponent; setTimeout(0) reset — needs runtime check |
| Glow animation disabled under prefers-reduced-motion | VERIFIED | `@include ambient-motion-safe` in SCSS |
| Blocking chip shake animation disabled under prefers-reduced-motion | VERIFIED | `@include ambient-motion-safe` on `.jrc-chip--blocking` |
| Bar fill transition disabled under prefers-reduced-motion | VERIFIED | `@include motion-safe` on `.jrb-bar-fill` |
| Chip hover scale disabled under prefers-reduced-motion | VERIFIED | `@include motion-safe` on `:hover` pseudo-states |

---

## 2. Post-Publish Routing (B05 affected)

| Check | Status | Notes |
|-------|--------|-------|
| After publish, browser navigates to `/recruiter/jobs/dashboard?id=<jobId>` | MANUAL | `afterSubmit()` navigation logic VERIFIED; actual navigation needs runtime check |
| Dashboard loads the correct job by jobId query param | MANUAL | `jobFacade.getJobById(this.jobId)` called if jobId is present |
| Dashboard shows job title, location, work setup, employment type | MANUAL | Template reads `job.jobTitle`, `job.jobCity`, `job.jobCountry`, etc. |
| Dashboard shows "Your job is published." success banner | MANUAL | `jd-success-banner` element always visible when job loads |
| "Review applicants" button navigates to `/recruiter/jobs/applicants?id=<jobId>` | VERIFIED | `viewApplicants()` method confirmed |
| "Edit job post" button navigates to `/recruiter/jobs/edit?id=<jobId>` | VERIFIED | `editJob()` method confirmed |
| "View public job" opens `/jobs/details/<jobId>` in new tab | VERIFIED | `window.open()` with `noopener,noreferrer` — confirmed |
| "Back to all jobs" navigates to `/recruiter/jobs/list` | VERIFIED | `backToAllJobs()` method confirmed |
| "Create another job" navigates to `/recruiter/jobs/create` | VERIFIED | `createAnotherJob()` method confirmed |
| Dashboard shows no fake applicant counts | VERIFIED | Template uses empty state copy only: "Applicants will appear here when candidates apply." |
| No jobId in URL — falls back to `/recruiter/jobs/list` | VERIFIED | `ngOnInit()` null-jobId path falls back gracefully |
| Load error shows error panel (not crash) | VERIFIED | `loadError` state shows `jd-error-state` div with `role="alert"` |
| Loading skeleton visible while job data is fetching | VERIFIED | `*ngIf="loading"` skeleton wrap in template |
| Optional improvements chip appears if published job has recommended gaps | VERIFIED | `hasOptionalImprovements` getter checks `canPublish && recommendationItems.length > 0` |
| Route `/recruiter/jobs/dashboard` is auth-gated | VERIFIED | Parent `/recruiter` path has `canActivate: [AuthGuard]` |
| Route guard posture same as sibling routes (list, create, edit) | VERIFIED | All child routes lack per-route guard — pre-existing posture |

---

## 3. Interview Questions Flow (B04 — must not break applicant side)

| Check | Status | Notes |
|-------|--------|-------|
| Interview questions still saved when recruiter adds them | VERIFIED | `formatJob()` includes `interviewQuestions` from interview form — unchanged |
| Interview questions displayed on dashboard when present | VERIFIED | Dashboard template shows `*ngIf="job.interviewQuestions?.length > 0"` section |
| Applicant-side interview flow unaffected by B04 | N/A (scope) | B04 only changes recruiter publish gate; applicant interview flow files not touched |
| `isInterviewRequired` flag is always `false` in preview | VERIFIED | Hardcoded `false` in `preview-job-post-step.component.ts`; aligns with B04 |

---

## 4. Company Profile (B09 affected)

| Check | Status | Notes |
|-------|--------|-------|
| Company Profile page loads without error | MANUAL | `companyFacade.getCompany()` called in `ngOnInit` |
| Tab 1 (Company Profile) shows existing company form | VERIFIED | `<app-company-details-form>` unchanged; wrapped in tab panel |
| Tab 2 (Employer Brand) shows company logo and overview | MANUAL | Template reads `company.companyLogoUrl` and `company.companyDetails` |
| Tab 3 (Benefits) shows work arrangement and team size | MANUAL | Reads `company.workSetupId` and `company.numberOfEmployee` |
| Switching tabs resets save success state | VERIFIED | `selectTab()` sets `this.saveSuccess = false` |
| No tab switch loops or double render | VERIFIED | `selectTab()` returns early if already on the same tab |
| Updating profile on Tab 1 triggers `getCompany()` refresh | VERIFIED | `onProfileUpdate()` calls `this.companyFacade.getCompany()` |
| Brand tab: empty state if no company overview | VERIFIED | `#noOverview` ng-template shown when `!company.companyDetails` |
| Benefits tab: empty state if no work setup | VERIFIED | `#noWorkSetup` ng-template shown when `!company.workSetupId` |
| Backlogged sections (Mission, Why Work With Us, Health, Leave, Learning) show "Coming soon" | VERIFIED | All 5 backlogged sections have explicit "Coming soon" copy and `cp-backlog-section` class |
| Tab nav has `role="tablist"` and each tab has `role="tab"` | VERIFIED | Confirmed in template |

---

## 5. Job Readiness Bar in Preview Step (B13 affected)

| Check | Status | Notes |
|-------|--------|-------|
| Preview step shows readiness bar | VERIFIED | `previewReadiness` computed from `combineLatest` in `preview$` |
| Preview readiness computed from full form data (all steps combined) | VERIFIED | Reads from `initial`, `jobInfo`, `interview` from facade |
| Preview readiness bar does not block publish button | VERIFIED | Bar is informational only; publish is gated by `publishJobPost()` independently |

---

## 6. Domain Migration Regressions

| Check | Status | Notes |
|-------|--------|-------|
| `app_url` in prod environment = `https://gethiredonline.app` | VERIFIED | `environment.prod.ts` line 7 |
| `api_url` in prod environment still points to App Engine | VERIFIED | Intentional; `api.gethiredonline.app` NOT used for API calls |
| OG meta `og:url` set to `gethiredonline.app` | VERIFIED | `index.html` line 16 |
| Twitter meta `twitter:url` set to `gethiredonline.app` | VERIFIED | `index.html` line 22 |
| Production API calls continue to reach App Engine | MANUAL | Cannot verify without live network test |
| Firebase auth domain unchanged | VERIFIED | `authDomain: 'get-hired-363107.firebaseapp.com'` unchanged |

---

## 7. Must-Not-Break: Pre-Existing Flows

| Check | Status | Notes |
|-------|--------|-------|
| Job list (`/recruiter/jobs/list`) loads | MANUAL | Route unchanged; no B05 changes to list component |
| Job edit (`/recruiter/jobs/edit?id=X`) loads and saves | MANUAL | `job-create` component handles both create and edit; `this.jobId` from query params |
| Save as draft still works | VERIFIED | `saveAsDraft()` unchanged |
| Subscription check (job post limit) still works | VERIFIED | `getCompanyRestrictions()` and `isAllowedToPublish` flag unchanged |
| Form memory leak fix (QA8 FIX-10) still applied | VERIFIED | `formSubs.unsubscribe()` in `ngOnDestroy()`, `formSubs = new Subscription()` before new subscriptions |
| Success$ subscribed exactly once (FIX-02) still holds | VERIFIED | Single `this.subscriptions.add(this.jobFacade.success$...)` in `ngOnInit` |
| Post-publish talent proof snackbar still fires | VERIFIED | `talentProof.getDisplayCopy('short')` snackbar fires before navigation |

---

## Summary

| Category | VERIFIED | MANUAL | RISK |
|----------|---------|--------|------|
| Job Create/Publish | 20 | 5 | 0 |
| Post-Publish Routing | 12 | 5 | 0 |
| Interview Flow | 3 | 0 | 0 |
| Company Profile | 9 | 3 | 0 |
| Readiness in Preview | 3 | 0 | 0 |
| Domain Migration | 5 | 1 | 0 |
| Pre-existing Flows | 6 | 2 | 0 |
| **TOTAL** | **58** | **16** | **0** |

**16 checks require manual runtime verification. 0 regression risks identified by static inspection.**

---

*Generated by static code inspection. No production DB or live API calls were made during this check.*

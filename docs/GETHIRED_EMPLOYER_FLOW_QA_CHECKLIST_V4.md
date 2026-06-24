# GETHIRED EMPLOYER FLOW QA CHECKLIST V4

**Document:** 31 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Method:** Code analysis — no live test runner executed  
**Status:** Production reference

---

## How to Read This Checklist

- **PASS:** Confirmed working via code analysis
- **FAIL:** Confirmed broken or missing via code analysis
- **FIXED:** Was failing; fixed in V4 pass
- **PARTIAL:** Partially implemented; known gap
- **DEFER:** Deferred to backlog; not a V4 blocking issue
- **UNVERIFIED:** Not confirmed in this pass; flag for manual QA

---

## 1. Guest and Public Layer

| Check | Status | Notes |
|---|---|---|
| Employer landing page at `/employers` renders | PASS | Public employer portal component |
| Employer landing page CTAs navigate to signup | PASS | CTAs present in template |
| Public job detail page still renders for applicants | PASS | Separate public route, not affected by employer panel |
| Employer landing analytics events fire | PASS | PublicPortalAnalyticsService confirmed |
| Hero CTA "Post a Job" links to signup or job create | PASS | CTA present |

---

## 2. Authentication and Role Guard

| Check | Status | Notes |
|---|---|---|
| Employer login navigates to employer panel | PASS | Route guards in place |
| Wrong role (applicant) blocked from employer routes | PASS | Role-based guard confirmed |
| Expired session redirects to login | PASS | Auth middleware |
| No company: CompanyNotSetupComponent dialog opens | PASS | Dialog trigger confirmed |
| CompanyNotSetupComponent "Setup Company" navigates to details | FIXED | V4 fix applied |
| Company setup page loads at `/recruiter/company/details` | PASS | Route exists |
| Returning employer with company bypasses setup dialog | PASS | Conditional on company record |

---

## 3. Jobs: Create and Edit

| Check | Status | Notes |
|---|---|---|
| Job create route at `/recruiter/jobs/create` loads | PASS | Route and component confirmed |
| Step 1 (Job Details) form renders | PASS | initialData FormGroup |
| Step 2 (Rates and Roles) disabled until step 1 valid | PASS | stepperItems[1].disabled |
| Step 3 (Create Interview) disabled until step 2 valid | PASS | stepperItems[2].disabled |
| Step 4 (Preview) disabled until step 2 valid | PASS | stepperItems[3].disabled (jobInfo valid) |
| Draft save opens success dialog | PASS | UpdatedDialogComponent for 'asDraft' |
| Draft save navigates to job list after dialog | PASS | afterSubmit() routes to /recruiter/jobs/list |
| Publish attempt with missing fields shows error snackbar | PASS | publishJobPost() logic |
| Publish blocked snackbar uses error color | FIXED | V4 fix: danger-snackbar |
| Publish success opens success dialog | PASS | UpdatedDialogComponent for 'published' |
| Publish success shows talent proof snackbar | PASS | talentProofAnalytics + snackbar |
| Publish success navigates to job list | PASS | navigateByUrl('recruiter/jobs/list') |
| Edit job loads existing job data | PASS | getJobById() + setFormGroup(data) |
| Job edit pre-populates certificationRequirements | PASS | FormArray initialized from data |
| Job edit pre-populates interview questions | PASS | interviewQuestions FormArray |
| Subscription limit blocks publish | PASS | isAllowedToPublish flag + SubscriptionAlertComponent |

---

## 4. Jobs: List and Expired

| Check | Status | Notes |
|---|---|---|
| Jobs list route loads | PASS | /recruiter/jobs/list |
| Expired jobs route loads | PASS | /recruiter/jobs/expired |
| Draft jobs visible in list | PASS | jobStatusId=1 |
| Published jobs visible in list | PASS | jobStatusId=2 |

---

## 5. Certification Requirements

| Check | Status | Notes |
|---|---|---|
| Employer can add certification requirement in job create | PASS | certificationRequirements FormArray |
| Certification fields: name, type, importance, authority, expiry, verification | PASS | FormGroup structure confirmed |
| Old jobs without certification data render without error | PASS | FormArray initializes empty if data absent |
| Certifications not used as match scoring input | PASS | No certificationRequirementFactor() found |
| Certifications displayed to applicants on job detail | UNVERIFIED | Likely yes; not confirmed in this pass |

---

## 6. Applicant List and Detail

| Check | Status | Notes |
|---|---|---|
| Applicant list loads for a job | PASS | /recruiter/jobs/applicants + jobId |
| Empty applicant list shows empty state | PASS | Table renders empty |
| Applicant detail panel opens on row click | PASS | Panel component |
| Snapshot card renders with completeness% and matchLevel | PASS | Data binding confirmed |
| Snapshot loading state: aria-live polite | PASS | Template attribute confirmed |
| Match signals disclaimer has role="note" | PASS | Template confirmed |
| hasAnyMatchSignal() prevents false disclaimer | PASS | Guard function confirmed |
| matchSignalLabel fallback: "Match signals unavailable" | PASS | Fallback string confirmed |
| Applicant status change requires modal confirmation | PASS | ApplicantActionModal |
| Video response viewed via VideoPreviewComponent | PASS | viewCv() opens VideoPreviewComponent |
| No automated video evaluation | PASS | No AI API calls found |
| Company-scoped applicant data only | PASS | companyId from verifyAuth |

---

## 7. Messages

| Check | Status | Notes |
|---|---|---|
| Message thread opens within applicant detail panel | PASS | openThread() in job-applicants |
| Thread polls every 8 seconds | PASS | 8s interval confirmed |
| Empty thread shows chat UI (not blank page) | PASS | UI renders with empty list |
| Thread load failure shows error copy | PASS | "Could not open this conversation. Please try again." |
| Message send success: message appears in thread | PASS | sendMessage() success path |
| Message send success: compose input cleared | PASS | newBody cleared on success |
| Message send failure: error shown | PASS | Error copy shown |
| Message send failure: compose input NOT cleared | PASS | Text preserved on error |
| Global /recruiter/messages route | FAIL | Not implemented (B01) |
| Sidebar messages item | FAIL | Not present (B01) |
| Unread message count/badge | FAIL | Not implemented (B01) |

---

## 8. Interviews

| Check | Status | Notes |
|---|---|---|
| /recruiter/interview renders | PASS | Renders under-construction |
| /recruiter/interview is useful | FAIL | Dead end (B03) |
| Interview questions configured in job create step 3 | PASS | interviewQuestions FormArray |
| Empty interview questions blocks publish | PASS | length check in publishJobPost() |
| Video responses viewable via VideoPreviewComponent | PASS | viewCv() confirmed |
| Interview scheduling available | FAIL | Not implemented (B03) |
| inviteApplicant() implemented | FAIL | TODO placeholder only (B10) |

---

## 9. Dashboard

| Check | Status | Notes |
|---|---|---|
| Company dashboard loads at /recruiter/dashboard | PASS | Route and component |
| KPI cards render with real data | PASS | Data from API |
| Pipeline widget renders stages | PASS | role="list", stage labels |
| Pipeline error: retry CTA | PASS | Retry button present |
| Action center: missing profile fields shown | PASS | missingFields array |
| Action center: needsReview applicants shown | PASS | needsReviewCount > 0 |
| Action center: caught-up empty state | PASS | Copy confirmed |
| Action center: error with retry | PASS | Error copy + Retry |
| Dashboard skeletons during load | PASS | emp-dash-* classes |
| employer-panel.component: employee$ null fallback | PARTIAL | No loading fallback confirmed |

---

## 10. Effects and Accessibility

| Check | Status | Notes |
|---|---|---|
| .gh-pressable buttons render | PASS | Class applied |
| mainAnimations entry animations | PASS | @animate trigger |
| @fadeInOut state transitions | PASS | Trigger confirmed |
| HapticFeedbackService available | PASS | Service defined with all methods |
| Reduced-motion: main-animations | FAIL | No prefers-reduced-motion wrap (B08) |
| Sidebar nav: keyboard accessible | FAIL | Divs not buttons (B09) |
| Sidebar: role="navigation" | FAIL | Missing (B09) |
| Sidebar: aria-current="page" | FAIL | Missing (B09) |
| Pipeline: role="list/listitem" | PASS | Confirmed |
| Pipeline: aria-label on stages | PASS | Confirmed |
| Snapshot: aria-live polite | PASS | Confirmed |
| Snapshot: role="region" | PASS | Confirmed |
| Match disclaimer: role="note" | PASS | Confirmed |
| Company-not-setup button: navigate fixed | FIXED | V4 fix applied |
| Skip link | FAIL | Not implemented (B09) |

---

## 11. Sidebar

| Check | Status | Notes |
|---|---|---|
| Dashboard link | PASS | Route 'dashboard' |
| Jobs link with sub-routes | PASS | jobs/list + jobs/expired |
| Contacts link with sub-routes | PASS | contacts/list, contacts/groups, contacts/candidates |
| Interviews link | PASS | Routes to under-construction page |
| Subscription link | PASS | Route 'subscription' |
| Company Profile label (was "Employer Branding") | FIXED | V4 fix applied |
| Company Profile link | PASS | Route 'company/details' |
| Active item CSS class | PASS | subRouteActive() method |
| Active item aria-current | FAIL | Not set (B09) |

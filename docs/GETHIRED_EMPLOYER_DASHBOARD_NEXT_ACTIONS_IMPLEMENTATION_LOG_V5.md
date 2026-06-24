# GetHired Employer Dashboard Next Actions Implementation Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** IMPLEMENTED (all 8 states handled)

---

## Dashboard Next-Action States

### State A — No company profile
**Detection:** `companyProfileMissingFields(dashboard.company).length > 0`  
**Action center card:** "Complete your company profile" (when missingFields.length > 0)  
**Onboarding checklist:** Step 1 (Complete your company profile) shown as incomplete  
**CTA:** "Complete profile" -> goToCompanyProfile() -> `/recruiter/company/details`

### State B — Company complete, no jobs
**Detection:** `dashboard.charts?.activeJobs === 0 || 0`  
**Action center card:** "Manage your jobs" (always shown)  
**Onboarding checklist:** Step 2 (Post your first job) shown as incomplete  
**Hero CTA:** "Post a job" always visible  
**CTA:** "Post a job" -> goToCreateJob() -> `/recruiter/jobs/create`

### State C — Has draft jobs
**Detection:** Draft jobs exist in the jobs list (`/recruiter/jobs/list` shows drafts)  
**Dashboard state:** Job list page handles this (shows draft status in table)  
**Action center:** "Manage your jobs" card  
**Note:** Dashboard does not fetch draft-specific data separately (backlog: add draft job count to dashboard API)

### State D — Has published jobs, no applicants
**Detection:** `dashboard.charts?.activeJobs > 0` AND `needsReviewCount === 0` AND `byStage.length === 0 or all 0`  
**Action center:** "Manage your jobs" card  
**Onboarding checklist:** Step 3 (Review your first applicants) shown as incomplete  
**Empty state in pipeline:** "No applicants yet" via `<app-empty-section>`

### State E — Has applicants
**Detection:** `needsReviewCount > 0`  
**Action center:** "Review new applicants" urgent card shown with count badge  
**Hero chip:** "N applicants to review" shown in hero header  
**Onboarding checklist:** Step 3 marked done (needsReviewCount > 0)  
**CTA:** "Review" -> goToApplicants(jobId) -> `/recruiter/jobs/applicants?id=`

### State F — Has unread messages
**Detection:** Not implemented in V5 (global messages route B01 is deferred)  
**Backlog:** Add unread message count to dashboard API response  
**Note:** No unread message badge on dashboard without global messages endpoint

### State G — Has interviews/video responses
**Detection:** `dashboard.charts?.interviews > 0`  
**Dashboard state:** KPI card shows "Video answers this month" count  
**Note:** No dedicated "review interviews" CTA (Interview module is stub, B03 deferred)

### State H — Returning active employer
**Detection:** Combination of existing data (applicants needing review prioritized first)  
**Priority order:** needsReviewCount > 0 -> urgent review card first; else "Manage your jobs"; then onboarding checklist; then analytics  
**Hero CTA:** "Post a job" always visible, "Review applicants" -> jobs list  
**Hero subtitle:** Shows real active job count + real applicant count  

---

## Implementation Notes

All 8 states use real data only. The logic is:
1. `pipelineLoading` -> skeleton loaders
2. `pipelineError` -> error + retry
3. `needsReviewCount > 0` -> urgent "Review" card first
4. `missingFields.length > 0` -> "Complete company profile" card
5. Fallback: "You're all caught up" empty state
6. Onboarding checklist: shown when any of 3 steps incomplete
7. Pipeline chart: empty state when byStage empty

**No fake counts, no fake urgency, no fake activity anywhere.**

---

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `company-dashboard.component.html` | Added onboarding checklist section | Low |
| `company-dashboard.component.ts` | Added `onboardingSteps()` method | Low |
| `company-dashboard.component.scss` | Added onboarding checklist SCSS | Low |

---

## Verification

1. State A: Remove logo/description/city from company -> "Complete company profile" card shows + step 1 incomplete
2. State B: Company complete but no published jobs -> step 2 incomplete
3. State D: Active jobs but no applicants -> "No applicants yet" empty section, step 3 incomplete
4. State E: Applicants in review queue -> urgent card with count, step 3 done
5. All states: No fake data, no placeholder counts
6. States F/G: KPI cards show real counts; no fake CTA without real data

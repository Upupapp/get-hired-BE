# GETHIRED_JOB_READINESS_BAR_CHIPS_TEST_LOG_V1

## Unit Test Coverage (planned spec)

### JobReadinessService — unit testable (pure function)
Test file location: `src/app/job/services/job-readiness.service.spec.ts`

#### Test cases:
1. Empty input → canPublish false, readinessLevel 'draft', blockingItems has 9 items
2. All required fields present → canPublish true, readinessLevel at least 'basic'
3. All required + < 3 recommended → readinessLevel 'basic'
4. All required + 3 recommended → readinessLevel 'strong'
5. All required + all 7 recommended → readinessLevel 'excellent'
6. interviewQuestions present → appears in completedItems, NOT blockingItems (B04)
7. interviewQuestions absent → appears in recommendationItems, NOT blockingItems (B04)
8. certificationRequirements present → NOT in blockingItems, NOT in recommendationItems
9. companyId present → not blocking; absent → blocking
10. bannerFile[0] present → banner check passes; jobBanner string → also passes
11. readinessPercent formula: (done/total)*100 rounded, capped at 100
12. nextBestAction: first blocking when blocking exists; first recommended when canPublish

### Component Tests (deferred)
- `JobReadinessBarComponent`: renders skeleton when result null; renders bar when result present
- `JobReadinessChipsComponent`: emits jumpToSection on blocking chip click; renders 4 optional chips

## Build verification
`ng build --configuration production` passed 0 errors as of 2026-06-25.
Output: main.f97672ac0bc4620d.js (2.05 MB), styles (485 KB), employer-jobs chunk 23 KB.
Pre-existing autoprefixer warnings (add-contact-group.component.scss lines 344-345) not from B13.

## Manual QA checklist
- [ ] Open /recruiter/jobs/create — readiness bar shows skeleton briefly, then bar
- [ ] Empty form → bar shows "Draft — required fields missing" with red chips
- [ ] Fill jobTitle → title chip moves to green complete area
- [ ] Fill all required → canPublish true, bar goes to 'basic' level
- [ ] Add 3 recommended → 'strong' level
- [ ] Add all 7 recommended → 'excellent' level
- [ ] Click a blocking chip → page scrolls to that form section
- [ ] Navigate to step 4 (preview) → readiness card appears above matchability card
- [ ] Publish a job → land on /recruiter/jobs/dashboard → optional improvements chip appears if gaps
- [ ] Under reduced-motion OS setting → no animations, no shakes, no shimmers
- [ ] Tab through chips with keyboard → focus visible on each

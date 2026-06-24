# GetHired Employer Returning Employer Loop Implementation Log V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Status:** IMPLEMENTED via dashboard next-action states

---

## Returning Employer States (All Based on Real Data)

### With Drafts
- Dashboard: Action center shows "Manage your jobs" card
- Job list: Draft jobs appear in table with "Draft" status
- Returning employer can click "Job Posts" in sidebar -> see drafts -> click edit
- No dedicated "Continue draft" card on dashboard (backlog: add draft count to dashboard API)

### With Published Jobs
- Dashboard hero subtitle: "N active jobs"
- Action center: "Manage your jobs" card
- Dashboard KPI: Active jobs count

### With Applicants Needing Review
- Dashboard hero chip: "N applicants to review" (real count only when > 0)
- Action center: "Review new applicants" urgent card (red border, count badge)
- Needs-review list below pipeline shows top applicants (real data)

### With Messages (Current State)
- No global messages route exists (B01 deferred)
- No dashboard "reply to messages" CTA (would require new BE endpoint)
- Returning employer must navigate to specific job -> specific applicant to see messages

### With Video Responses / Interviews
- Dashboard KPI card: "Video answers this month" (real chart data)
- No dedicated interview review CTA (B03: interview module is stub)

### With No Activity
- Onboarding checklist prompts next action
- Dashboard "Manage your jobs" action card always visible
- Hero CTA "Post a job" always visible

---

## Priority Order for Returning Employer (V5)

When employer returns to dashboard:
1. If `needsReviewCount > 0`: urgent "Review new applicants" card is first in action grid
2. If profile incomplete: "Complete your company profile" card
3. If all complete: "You're all caught up" message
4. Onboarding checklist shows remaining incomplete steps
5. Hero always has "Post a job" CTA

---

## What Is NOT Fake

The following are real data sources only:
- applicants needing review count: derived from pipeline API /company/dashboard/pipeline-overview
- active jobs count: from /company/dashboard response
- video answers count: from /company/dashboard response
- company profile missing fields: from /company/usercompany response

No fake new-applicant badges, no fake message counts, no fake activity, no fake urgency.

---

## Frontend Effects for Returning Employer

| Effect | Where | Real Data Required |
|--------|-------|--------------------|
| Urgent badge (red border + count) | .emp-dash-action-card--urgent | Yes (needsReviewCount > 0) |
| Action card hover lift | .emp-dash-action-card | N/A (all cards) |
| KPI card hover lift | .emp-dash-kpi-card | N/A (all KPI cards) |
| Hero chip "N to review" | .emp-dash-chip | Yes (needsReviewCount > 0) |
| Pipeline bar fill | .emp-dash-pipeline-bar | Yes (byStage counts) |
| Needs-review list reveal | .emp-dash-review-card | Yes (needsReview.length > 0) |

All effects: reduced-motion fallbacks in place.

---

## Files Changed

None specific to returning employer loop (all handled by existing dashboard code + V5 onboarding checklist).

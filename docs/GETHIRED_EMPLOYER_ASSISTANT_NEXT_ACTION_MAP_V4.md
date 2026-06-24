# GETHIRED EMPLOYER ASSISTANT NEXT ACTION MAP V4

**Document:** 24 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference

---

## 1. Overview

The employer next-action system is implemented as the "Action Center" widget inside the company dashboard component. It is data-driven and reactive: it reads real state from the backend and surfaces the highest-priority action the employer should take right now.

There is no AI assistant or chat-based guidance. Suggestions are deterministic, based on business rules applied to live data.

---

## 2. Current Implementation: Action Center

**Component:** `company-dashboard` (employer panel)  
**Data source:** Dashboard API response  
**Rendering:** Action center widget, positioned prominently on the dashboard

### Decision Logic (implemented)

Actions are determined by evaluating the following conditions in priority order:

| Condition | Action Surfaced |
|---|---|
| `missingFields.length > 0` | "Complete your company profile" (profile setup CTA) |
| `needsReviewCount > 0` | "Review applicants" (link to applicant list) |
| Always (fallback) | "Manage your jobs" (link to job list) |

The action center shows the highest-urgency available action. When all conditions resolve (profile complete, no applicants needing review), the fallback "Manage your jobs" action is shown.

### Empty / Caught-Up State

When `needsReviewCount === 0` and profile is complete:  
Copy: "You're all caught up. No applicants are waiting for review right now."

### Error State

When the action center data fails to load:  
Copy: "Couldn't load your action items right now." + Retry button

---

## 3. Next Action Scenarios: Full Map

### Scenario 1: No Company Set Up

- **Trigger:** Employer is authenticated but has no company record; `CompanyNotSetupComponent` dialog opens
- **Action shown:** "Setup Company" button in the dialog
- **After fix (V4):** Clicking "Setup Company" closes the dialog and navigates to `/recruiter/company/details`
- **Previous behavior (bug):** Dialog closed but navigation was commented out; employer was stranded on the current page

### Scenario 2: Company Exists but Incomplete

- **Trigger:** `missingFields.length > 0` on the dashboard response
- **Fields checked:** logo, company description, city/location
- **Copy shown:** "Missing: logo, company description, location"
- **Action surfaced:** Complete profile CTA linking to company details

### Scenario 3: No Jobs Created

- **Trigger:** Job list is empty
- **Action surfaced:** "Manage your jobs" (fallback) or a "Post your first job" CTA
- **Gap:** No dedicated "Post your first job" next-action is surfaced in the current action center when zero jobs exist. The employer sees the generic jobs link.

### Scenario 4: Draft Jobs Only (No Published Jobs)

- **Trigger:** Jobs exist but all have `jobStatusId === 1` (draft)
- **Action surfaced:** "Manage your jobs" (fallback)
- **Gap:** No "Finish your draft" or "Publish your first job" specific guidance

### Scenario 5: Published Job, No Applicants

- **Trigger:** Active published jobs, `needsReviewCount === 0`, no waiting applicants
- **Action surfaced:** "Manage your jobs" (fallback)
- **Gap:** No job quality/visibility guidance ("Your job has 0 views in 7 days — try improving the description")

### Scenario 6: Applicants Waiting for Review

- **Trigger:** `needsReviewCount > 0`
- **Action surfaced:** "Review applicants" — highest urgency, shown first
- **CTA destination:** Applicant list for the relevant job(s)

### Scenario 7: Subscription Limit Reached

- **Trigger:** `isAllowedToPublish === false` (job post count at limit)
- **Action surfaced:** `SubscriptionAlertComponent` dialog on publish attempt; Upgrade CTA
- **Dashboard:** No proactive subscription nudge on the dashboard itself

---

## 4. What Is NOT Implemented

The following next-action types are not implemented and are in the backlog:

| Missing Guidance | Notes | Backlog |
|---|---|---|
| "Post your first job" specific CTA | When job count is zero | B07 |
| "Finish your draft" nudge | When only drafts exist | B07 |
| Job quality recommendations | Completeness, views, application rate | B12 |
| Messages nudge | Unread thread badge or action | B01 |
| Interview scheduling nudge | No scheduling system exists | B03 |
| Subscription upgrade nudge on dashboard | Only shown on publish attempt | — |
| Onboarding checklist UI | Progressive completion tracker | B07 |
| "Your job has low views" recommendation | No analytics data available | B15 |

---

## 5. All Allowed Next Actions and Their Current Status

| Next Action | Implemented | Entry Point |
|---|---|---|
| Set up company profile | Yes (via dialog fix) | CompanyNotSetupComponent |
| Complete company profile | Yes | Action center missing-fields CTA |
| Post a job | Yes | Dashboard "Post a Job" button / jobs CTA |
| Finish a draft job | Partial (jobs list shows drafts) | Jobs list |
| Publish a job | Yes (from job-create, step 4) | Job create flow |
| Review waiting applicants | Yes | Action center needsReview CTA |
| Open applicant detail | Yes | Applicant list row click |
| Change applicant status | Yes | Status change modal |
| View video response | Yes | viewCv() from applicant list |
| Message an applicant | Yes (inline only) | Applicant detail panel |
| Upgrade subscription | Partial (on publish block only) | SubscriptionAlertComponent |
| Extend job listing | Not confirmed | — |
| Share job link | Not confirmed (backend: GET /job/sharelink exists) | B13 |
| Invite applicant | Not implemented (TODO) | B10 |

---

## 6. Design Rules: What Is Prohibited

The next-action system must not:

- Show fake urgency ("3 people are viewing your job right now")
- Show fabricated activity indicators
- Generate AI-written job descriptions and present them as employer-authored without disclosure
- Auto-reject applicants
- Surface protected-attribute data (race, gender, age, disability) as a basis for action
- Send messages to applicants without explicit employer initiation

These constraints are enforced by the current architecture: the action center is driven by real backend data, human initiation is required for all applicant-facing actions, and no applicant-hidden-by-score logic exists.

# GetHired Employer Applicant Review Flow Map V4

**Document:** GETHIRED_EMPLOYER_APPLICANT_REVIEW_FLOW_MAP_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Full applicant review flow from entry to status change, covering applicant list, detail panel, messaging, video CV, match signals, fair hiring guardrails, and known bugs.

---

## Table of Contents

1. [Entry Points](#1-entry-points)
2. [Applicant List View](#2-applicant-list-view)
3. [Match Signals](#3-match-signals)
4. [Applicant Detail Panel](#4-applicant-detail-panel)
5. [Snapshot Card States](#5-snapshot-card-states)
6. [Message Thread](#6-message-thread)
7. [Video CV Review](#7-video-cv-review)
8. [Status Change Flow](#8-status-change-flow)
9. [Navigation and Breadcrumb](#9-navigation-and-breadcrumb)
10. [Fair Hiring Rules](#10-fair-hiring-rules)
11. [Known Bugs](#11-known-bugs)

---

## 1. Entry Points

There are three ways for an employer to reach the applicant review view:

| Entry Point | Component | Route | Trigger |
|-------------|-----------|-------|---------|
| Dashboard urgent action card | `<app-company-dashboard>` -> `goToApplicants(jobId)` | `/recruiter/jobs/applicants?id={jobId}` | "Review new applicants" CTA when `needsReviewCount > 0` |
| Job list row action | `JobListComponent` row action menu | `/recruiter/jobs/applicants?id={jobId}` | "View Applicants" action on a job row |
| Job view page | `EmployerJobviewComponent` / `<app-job-view>` | `/recruiter/jobs/applicants?id={jobId}` | "View Applicants" CTA in job detail view |

All three entry points navigate to the same route with the `jobId` as a query parameter.

---

## 2. Applicant List View

**Route:** `/recruiter/jobs/applicants?id={jobId}`
**Component:** `EmployerApplicantsComponent` -> `<app-job-applicants>`
**Data source:** `jobId` read from query params. Applicant data fetched from API using this jobId.
**Match signals:** Fetched separately from `/job/applicants/signals`, keyed by `userId`.

### 2.1 Table columns

The applicant list table has 10 columns:

| Column | Data Source | Notes |
|--------|-------------|-------|
| `applicantProfileId` | Applicant record | Internal ID |
| `fullName` | Applicant profile | First + last name |
| `dateApplied` | Application record | Date formatted |
| `address` | Applicant profile | City, country |
| `salary` (expected) | Application | Expected salary from applicant |
| `cv_link` | Application | "View CV" button (opens document or video) |
| `jobApplicationStatusName` | Application status | Current pipeline stage label |
| `matchSignalLabel` | `/job/applicants/signals` response | "Match signals unavailable" when no real signals |
| Action menu | -- | Per-row actions |

### 2.2 Empty state

When no applicants exist for the job, the table is replaced by an empty state component. The exact empty state message is not confirmed; likely "No applicants yet" consistent with the dashboard empty section.

### 2.3 Match signal column behavior

**When signals exist:** `matchSignalLabel` shows the signal label (e.g., "Strong Match", "Possible Match", "Low Match").

**When no signals:** Column shows "Match signals unavailable".

**Match signal disclaimer:** A disclaimer message is rendered below the table (or above) when `hasAnyMatchSignal()` returns true. The disclaimer clarifies that match scores are advisory only and do not constitute hiring decisions. The disclaimer is NOT shown when all applicants have "Match signals unavailable".

---

## 3. Match Signals

**Endpoint:** `GET /job/applicants/signals` (or similar, keyed by `userId` in response)
**Fetch timing:** Separate from the main applicant list fetch. May be fetched after the table renders.

**Signal levels:**

| Level | Badge style | Notes |
|-------|-------------|-------|
| Strong Match | `.bg-success` (green) | High compatibility score |
| Possible Match | `.bg-info` (blue) | Moderate compatibility |
| Low Match | `.bg-secondary` (grey) | Low compatibility |
| null / unavailable | Text: "Match signals unavailable" | No score data |

**Fair hiring context:** Match signals are advisory. Employers can see the signal but are not prevented from selecting any applicant regardless of signal level. No applicants are hidden based on match score.

---

## 4. Applicant Detail Panel

### 4.1 Trigger

The detail panel is triggered from the row action menu:

1. Employer clicks action menu icon on applicant row.
2. `ApplicantActionModalComponent` opens (modal or inline).
3. In `ApplicantActionModalComponent`, employer selects "Profile" action.
4. Modal closes with result `{ profile: true }`.
5. Component receives result and sets `showProfile = true`.
6. Detail panel renders alongside or replacing the table.

### 4.2 Detail panel contents

When `showProfile === true`:

| Element | Component | Data |
|---------|-----------|------|
| Applicant avatar | `<app-applicant-avatar>` | Applicant's profile photo or initials |
| Application snapshot card | Inline (loading or data state) | `completeness%`, `matchLevel`, `matchDisclaimer` |
| Application preview | `<app-application-preview>` | Full application content (CV, answers, etc.) |
| Message thread | `<app-message-thread>` | Inline messaging with applicant |

---

## 5. Snapshot Card States

The snapshot card has three states:

### 5.1 Loading state

**Trigger:** `snapshotSummaryLoading === true`
**Display:** Skeleton placeholder matching the snapshot card dimensions. Shimmer animation.

### 5.2 No snapshot state

**Trigger:** `snapshotSummary.hasSnapshot === false` (API returns that no snapshot is available)
**Display:** Static text "No snapshot available" or equivalent message. No empty action.

### 5.3 Data state

**Trigger:** `snapshotSummary.hasSnapshot === true`
**Display:**

| Field | Display | Notes |
|-------|---------|-------|
| `completeness%` | Percentage text or progress bar | Applicant profile completeness |
| `matchLevel` | Badge | See match level badges below |
| `matchDisclaimer` | Disclaimer text | "Match scores are advisory" |

**Match level badges in snapshot:**

| Level | Badge CSS | Label |
|-------|-----------|-------|
| Strong | `.bg-success` | "Strong Match" |
| Possible | `.bg-info` | "Possible Match" |
| Low or null | `.bg-secondary` | "Low Match" or no badge |

---

## 6. Message Thread

**Component:** `<app-message-thread>`
**Inputs:**
- `jobId` -- context for the thread
- `applicantUid` -- the applicant being messaged
- `otherPartyLabel` -- display name shown in thread header
- `currentUserRole` -- employer role identifier

### 6.1 Thread initialization

On `showProfile = true`, `<app-message-thread>` calls `openThread()` which creates or retrieves the existing message thread for this employer-applicant-job combination.

### 6.2 Polling

**Interval:** 8 seconds
**Behavior:** Every 8 seconds, the thread component fetches the latest messages. New messages from the applicant appear without a page reload.

### 6.3 Sending messages

The employer types in the `newBody` input field and clicks "Send".

**On success:**
- Message sent to backend.
- `newBody` is reset to empty string.
- Thread refreshes.

**On error:**
- Error message is shown in the thread.
- `newBody` is reset to empty string.
- **BUG:** Typed text is NOT preserved when send fails. The employer must retype their message. See Known Bugs section.

### 6.4 Error recovery

Error states in the message thread are shown inline (not as a modal). The thread continues to display previous messages. The employer can retry by typing and sending again.

---

## 7. Video CV Review

**Trigger:** Row action "view" or `cv_link` button in the table.

**Method:** `viewCv()` in `<app-job-applicants>`

**Behavior:**
1. `viewCv()` called with the applicant's CV URL.
2. `VideoPreviewComponent` dialog opens.
3. Dialog renders the video URL (likely an iframe or HTML5 video element).
4. Employer views the video interview response or CV presentation.

**Component:** `VideoPreviewComponent` (dialog)
**Input:** Video URL from `cv_link` field

**Note:** This is used for video CV/interview responses. Standard document CVs may open differently (direct download or document viewer). Confirm by reviewing `viewCv()` implementation.

---

## 8. Status Change Flow

### 8.1 Trigger

Status changes are initiated from the `ApplicantActionModalComponent` accessible via the row action menu.

### 8.2 Available actions in ApplicantActionModalComponent

| Action | Result |
|--------|--------|
| "Profile" | Sets `showProfile=true` in parent, opens detail panel |
| Status change (Screening, Interview, Offer, Hired, etc.) | Calls status change API |
| "View CV" | Opens `VideoPreviewComponent` |
| "Invite" | Calls `inviteApplicant()` -- **BUG: empty TODO, no implementation** |

### 8.3 Status change API

**Endpoint:** `PUT /job/changestatus`
**Payload:** `{ status, jobId }` (note: confirm if this is applicant-level status or job-level status -- the endpoint name is ambiguous)
**Result on success:** Applicant row in table updates `jobApplicationStatusName` to reflect new status.

### 8.4 Pipeline stage labels

| statusId | Label |
|----------|-------|
| 1 | Applied / Pending Review |
| 3 | Under Review |
| Others | Screening, Interview, Offer, Hired (from DB, not hardcoded) |

---

## 9. Navigation and Breadcrumb

### 9.1 Breadcrumb

The applicant list page has a breadcrumb navigation. Confirmed structure:

```
Jobs / {jobId} / Applicants / {profileId}
```

**Note:** The breadcrumb shows `jobId` and `profileId` directly (raw IDs) rather than human-readable labels (job title, applicant name). This is a potential UX improvement but not confirmed as a bug.

### 9.2 Back button

The applicant list has a back button that calls `location.back()`. This navigates to the previous browser history entry, which may be the job list, the job view, or the dashboard depending on the entry path.

---

## 10. Fair Hiring Rules

The applicant review system enforces the following fair hiring principles:

| Rule | Implementation |
|------|---------------|
| Match scores are advisory only | Match signal disclaimer shown when signals exist |
| No applicants hidden based on score | All applicants visible in table regardless of match level |
| Status changes are human-confirmed | Status changes require explicit employer action in modal |
| No auto-rejection | `inviteApplicant()` is empty (no automated acceptance either) |
| No hidden filtering | Applicant list query does not filter by match score or cert compliance |
| Disclaimer always visible when signals shown | `hasAnyMatchSignal()` check gates disclaimer display |

These rules must not be changed without an explicit product and legal review.

---

## 11. Known Bugs

| # | Bug | Location | Impact | Priority |
|---|-----|----------|--------|----------|
| 1 | `inviteApplicant()` is an empty TODO | `<app-job-applicants>` or `ApplicantActionModalComponent` | Employer clicks "Invite" and nothing happens | Medium |
| 2 | `newBody` reset on send error -- typed text not preserved | `<app-message-thread>` | Employer must retype message after failed send | Medium |
| 3 | Breadcrumb shows raw IDs not human-readable labels | `<app-job-applicants>` template | Poor UX clarity | Low |
| 4 | No breadcrumb on most employer pages except job applicants | Application-wide | Inconsistent navigation context | Low |
| 5 | Match signal fetch is separate from applicant list -- potential race condition if signals load after table | `<app-job-applicants>` | Match signal column may show "unavailable" briefly even when data exists | Low |

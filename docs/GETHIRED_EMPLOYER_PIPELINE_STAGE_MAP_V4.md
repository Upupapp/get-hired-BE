# GetHired Employer Pipeline Stage Map V4

**Document:** GETHIRED_EMPLOYER_PIPELINE_STAGE_MAP_V4.md
**Version:** 4.0
**Date:** 2026-06-24
**Scope:** Pipeline stage definitions, status ID mapping, dashboard visualization, applicant-level status changes, fair hiring rules, known gaps, and deferred items.

---

## Table of Contents

1. [Status ID Reference](#1-status-id-reference)
2. [Status vs State Disambiguation](#2-status-vs-state-disambiguation)
3. [Dashboard Pipeline Stages](#3-dashboard-pipeline-stages)
4. [Needs Review Count Logic](#4-needs-review-count-logic)
5. [Applicant-Level Status Changes](#5-applicant-level-status-changes)
6. [Status Change API](#6-status-change-api)
7. [Pipeline Visualization on Dashboard](#7-pipeline-visualization-on-dashboard)
8. [No Drag-and-Drop Pipeline](#8-no-drag-and-drop-pipeline)
9. [Fair Hiring Rules](#9-fair-hiring-rules)
10. [Safe Improvements](#10-safe-improvements)
11. [Deferred Items](#11-deferred-items)

---

## 1. Status ID Reference

GetHired uses integer status IDs for both job statuses and applicant statuses. These two namespaces share some IDs but are distinct.

### 1.1 Job status IDs

| statusId | Label | Description |
|----------|-------|-------------|
| 1 | Draft | Job saved but not published. Not visible to applicants. |
| 2 | Published / Active | Job is live and visible to applicants. |
| 3 | Expired | Job has passed its closing date. No longer in public listing. |
| 4 | Archived | Employer-deleted / soft-deleted. Hidden from all views. |

### 1.2 Applicant / application status IDs

| statusId | Label | Notes |
|----------|-------|-------|
| 1 | Applied / Pending Review | New application, not yet reviewed by employer. Counted in `needsReviewCount`. |
| 3 | Under Review | Employer has opened or acknowledged the application. Still counted in `needsReviewCount`. |
| Others | Screening, Interview, Offer, Hired, Rejected | Labels sourced from database. Not hardcoded in frontend. |

**Note:** There is no confirmed statusId=2 for applicants. Job statusId=2 (Published) has no direct applicant-status equivalent. The exact full list of applicant statusIds comes from the database `job_application_statuses` table (or equivalent) and is fetched as a reference list.

---

## 2. Status vs State Disambiguation

This document and the codebase use "status" in two different contexts. The following disambiguation prevents confusion:

| Term | Context | Table / Field |
|------|---------|--------------|
| Job status | The publication state of a job posting | `jobs.jobStatusId` |
| Applicant status / Application status | The pipeline stage of a specific applicant for a specific job | `job_applications.statusId` or equivalent |
| `jobApplicationStatusName` | The label shown in the applicant table | Derived from applicant statusId via lookup |

When reading `PUT /job/changestatus`, note that "job" in this endpoint name is ambiguous. The endpoint is used to change both job statuses (publish, archive) and, possibly, applicant statuses (move through pipeline). Confirm the exact payload structure by reviewing the backend controller.

---

## 3. Dashboard Pipeline Stages

### 3.1 Data source

**Endpoint:** `GET /company/dashboard/pipeline-overview`

**Response shape:**

```typescript
byStage: [
  {
    statusId: number,   // Applicant statusId
    label: string,      // Human-readable stage label from DB
    count: number       // Number of applicants at this stage
  }
]
```

**Label source:** Stage labels (`label` field) come from the database, not from a frontend enum. This means stage labels can be updated without a frontend deployment, but also means the frontend cannot predict label values in advance.

### 3.2 Stage coverage

The `byStage[]` array may include any combination of applicant status stages depending on which stages have at least one applicant. Stages with zero applicants may or may not be included (depends on backend query).

**Confirmed stages used in dashboard context:**
- statusId 1: Applied / Pending Review
- statusId 3: Under Review
- Additional stages from DB (Screening, Interview, Offer, Hired)

---

## 4. Needs Review Count Logic

**Computed field:** `needsReviewCount`

**Definition:** Count of applicants at statusId=1 (Applied/Pending Review) OR statusId=3 (Under Review).

**Purpose:** Surfaces the employer's urgent review backlog. An employer with `needsReviewCount > 0` has applicants they have not fully processed.

**Dashboard usage:**
- Urgent coral chip in hero section (shows count)
- Pulsing urgent action card in action center
- `needsReview` KPI card
- `needsReview[]` list at bottom of dashboard

**Calculation:** The backend returns `needsReview[]` as an array. `needsReviewCount` is derived from `needsReview.length` or from summing `byStage` entries for statusId=1 and statusId=3.

---

## 5. Applicant-Level Status Changes

### 5.1 Trigger

An employer changes an applicant's pipeline status via the `ApplicantActionModalComponent`, accessible from the applicant list row action menu.

### 5.2 Flow

```
Employer clicks action menu on applicant row
    |
    v
ApplicantActionModalComponent opens
    |
    +-- Employer selects new pipeline stage
    |
    v
Status change API called (PUT /job/changestatus or applicant-specific endpoint)
    |
    +-- Success: applicant's `jobApplicationStatusName` in table updates
    +-- Error: error shown in modal, no change
```

### 5.3 Available transitions

Status transitions are not constrained by the frontend. An employer can move an applicant to any available stage from any current stage. There are no enforced linear progression rules (e.g., cannot skip from "Applied" directly to "Hired" -- but this is not enforced).

**Note:** The absence of transition guards means an employer could accidentally skip stages. This is a product policy decision, not a bug.

---

## 6. Status Change API

**Endpoint:** `PUT /job/changestatus`

**Payload (confirmed structure):** `{ status: <statusId>, jobId: <jobId> }`

**Ambiguity:** The endpoint is named `/job/changestatus` and the payload includes `jobId`. It is unclear from the frontend code whether this endpoint:
a) Changes the JOB's status (e.g., publish, archive), or
b) Changes an APPLICANT's status within a job, or
c) Is overloaded to handle both based on the `status` value

**Recommendation:** Review the backend controller for `PUT /job/changestatus` to confirm whether a separate applicant status endpoint exists (e.g., `PUT /job/applicant/changestatus` or `PUT /application/changestatus`).

Until confirmed, document the endpoint as used for both job-level and applicant-level status changes, with `jobId` context in both cases.

---

## 7. Pipeline Visualization on Dashboard

### 7.1 Visual design

The pipeline is rendered as a bar chart on the dashboard:
- Each stage in `byStage[]` maps to one vertical bar
- Bar height is proportional: `(count / maxCount) * 100%`
- Bars are coral colored (primary brand accent)
- Stage label and count are displayed per bar
- Accessible via `aria-label` on each bar element

### 7.2 Current click behavior

Clicking any pipeline bar calls `goToJobsList()` -> `/recruiter/jobs/list`.

**This is a gap.** The visual implies clicking a bar filters to applicants at that stage. The current implementation navigates to the general job list instead, losing all stage context.

### 7.3 Why stage-filtered click is not yet implemented

The applicant list route (`/recruiter/jobs/applicants?id={jobId}`) currently does not accept a `statusId` query parameter for pre-filtering. Implementing the stage-filtered click would require:

1. Adding `statusId` query param support to the applicant list route and component.
2. Filtering the applicant table by `statusId` on component init if the param is present.
3. Updating `goToJobsList()` (or adding a new `goToApplicantsAtStage(statusId)` method) to pass `statusId`.

This is a backlog item. See Safe Improvements section.

---

## 8. No Drag-and-Drop Pipeline

The current applicant management UI is table-based, not a kanban board.

**What exists:**
- Applicant list table with `jobApplicationStatusName` column
- Status change via `ApplicantActionModalComponent` (dropdown or button selection)
- Dashboard pipeline visualization (bar chart, visual only)

**What does not exist:**
- Drag-and-drop kanban board
- Cards per applicant movable between stage columns
- Bulk status changes across multiple applicants

**Deferred:** Drag-and-drop kanban is a significant UI effort and is deferred. The table+modal pattern is sufficient for current scale.

---

## 9. Fair Hiring Rules

The pipeline system enforces the following fair hiring principles:

| Rule | Implementation |
|------|---------------|
| All applicants visible regardless of match score | No match-score-based filter applied to applicant list query |
| Status changes require explicit employer action | Status changes initiated only via modal, not automatically |
| No auto-rejection at any stage | No automated status change to "Rejected" based on any system signal |
| Status changes are logged (assumed) | Backend should log status changes for audit trail; confirm in backend |
| No hidden applicants | All applicants for a job appear in the list; no backend filter hides applicants |
| Match disclaimer visible when signals shown | `hasAnyMatchSignal()` gates disclaimer rendering |

**These rules must not be changed without product and legal review.**

---

## 10. Safe Improvements

| # | Improvement | Files to Change | Effort | Priority |
|---|-------------|----------------|--------|----------|
| 1 | Make pipeline bar click route to applicant list filtered by statusId when filter support is added | `company-dashboard.component.ts` (`goToJobsList` method), `job-applicants.component.ts` (add statusId param handling) | Medium | Medium |
| 2 | Add stage count badges to the needs-review list rows | `company-dashboard.component.html` | Low | Low |
| 3 | Show stage label in applicant list status column using consistent formatting with dashboard | `job-applicants.component.html` | Low | Low |
| 4 | Confirm `/job/changestatus` endpoint handles applicant vs job status separately -- document or refactor endpoint naming | Backend controller | Low | Medium |

---

## 11. Deferred Items

| # | Item | Reason Deferred |
|---|------|----------------|
| 1 | Drag-and-drop kanban pipeline board | High effort, requires significant UI refactor and state management changes |
| 2 | Bulk status change across multiple applicants | Requires multi-select UI and batch API endpoint |
| 3 | Stage-specific notifications (e.g., "Applicant moved to Interview") | Requires notification infrastructure integration |
| 4 | Automated stage progression rules (e.g., auto-move to Under Review after 48 hours) | Requires backend scheduler and product policy decision |
| 5 | Pipeline analytics (time-in-stage, drop-off rates) | Requires backend analytics pipeline, not current priority |

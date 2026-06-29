# GETHIRED NOTIFY REPORT — RECENT DEPLOYMENT
**Scope:** FE `5c01c2a` + `fa8865a` | BE `8caa558`
**Date:** 2026-06-29
**Source reports used:** SWEEP, TEST, OPTIMIZE, STITCH, ACTIONS

## Executive Summary

| Area | Readiness |
|---|---|
| Public portal messaging | Ready |
| Employer/recruiter messaging | Ready with caution (double-confirm UX) |
| Applicant messaging | N/A (no applicant-facing changes) |
| Admin messaging | N/A |
| Accessibility messaging | Ready with caution (nested role=dialog) |
| Email notification safety | N/A (no email changes) |

## Phase 1: Message Inventory (Recent Deployment Only)

### JAC Modal Messages

| ID | Area | Role | Message | Type | Issue |
|---|---|---|---|---|---|
| M-001 | JAC modal | Recruiter | "View public job post" | Action label | Clear ✅ |
| M-002 | JAC modal | Recruiter | "Open the candidate-facing job page." | Description | Clear ✅ |
| M-003 | JAC modal | Recruiter | "Preview job post" | Action label | Clear ✅ |
| M-004 | JAC modal | Recruiter | "See how this job will look before publishing." | Description | Clear ✅ |
| M-005 | JAC modal | Recruiter | "Publish this job to make it visible publicly." | Description | Clear ✅ |
| M-006 | JAC modal | Recruiter | "Update job post" | Action label | Clear ✅ |
| M-007 | JAC modal | Recruiter | "Edit details, requirements, media, badges, and application settings." | Description | Good specificity ✅ |
| M-008 | JAC modal | Recruiter | "Review applicants" | Action label | Clear ✅ |
| M-009 | JAC modal | Recruiter | "Open applications, statuses, answers, and video responses." | Description | Good specificity ✅ |
| M-010 | JAC modal | Recruiter | "Create interview" | Action label | Clear ✅ |
| M-011 | JAC modal | Recruiter | "Schedule or create an interview for applicants to this job." | Description | Clear ✅ |
| M-012 | JAC modal | Recruiter | "N question(s) ready" | Inline badge | Clear ✅ |
| M-013 | JAC modal | Recruiter | "Copy public link" | Action label | Clear ✅ |
| M-014 | JAC modal | Recruiter | "Publish this job first to get a shareable link." | Disabled state | ✅ Explains why disabled |
| M-015 | JAC modal | Recruiter | "Copy the candidate-facing job URL to share anywhere." | Description | Clear ✅ |
| M-016 | JAC modal | Recruiter | "Link copied!" | Success feedback | Clear, 2.2s duration ✅ |
| M-017 | JAC modal | Recruiter | "Delete job post" | Action label | Clear, in Danger Zone ✅ |
| M-018 | JAC modal | Recruiter | "Permanently remove this job post." | Description | Appropriately direct ✅ |
| M-019 | JAC modal | Recruiter | "Delete job post?" | Confirm title | Clear ✅ |
| M-020 | JAC modal | Recruiter | "You are about to delete [ID] — [title]. This will permanently remove the job from your dashboard and public job pages." | Confirm body | Specific, consequence-aware ✅ |
| M-021 | JAC modal | Recruiter | "This job has N applicant(s). Review applicants before deleting." | Warning | Helpful, not blocking ✅ |
| M-022 | JAC modal | Recruiter | "Actions are based on your workspace access." | Footer | Appropriate permission notice ✅ |

### V7 Job Detail Messages

| ID | Area | Role | Message | Type | Issue |
|---|---|---|---|---|---|
| M-023 | Job detail | Anonymous/Applicant | "The employer hasn't added a full job description yet. Check back soon for more details." | Content quality notice | Clear, honest, not shaming ✅ |

### BE Error Messages

| ID | Area | Role | Message | Type | Issue |
|---|---|---|---|---|---|
| M-024 | action-summary API | Recruiter | "jobId is required." | 400 error | Simple and correct ✅ |
| M-025 | action-summary API | Recruiter | "You do not have access to this job." | 403 error | Safe, no info disclosure ✅ |
| M-026 | action-summary API | Recruiter | "Job not found or you do not have access." | 404 error | Safe (deliberate 403/404 ambiguity) ✅ |
| M-027 | action-summary API | Recruiter | "Could not load job summary. Please try again." | 500 error | Safe, actionable ✅ |

## Phase 2: Message Quality Analysis

### M-019/M-020 (Delete confirm copy) — EXCELLENT
- Specific: names the job ID and title
- Consequence-clear: "permanently remove the job from your dashboard and public job pages"
- Includes applicant count warning when relevant
- Cancel is presented first (destructive second) ✅

### M-023 (Privacy boilerplate fallback) — GOOD
- Honest: doesn't pretend the content exists
- Forward-looking: "Check back soon"
- Not shaming: doesn't say "the employer made an error"
- Could improve: add a CTA to apply anyway if interested → deferred

### M-016 (Link copied) — GOOD
- Immediate: appears instantly
- Self-clearing: resets after 2.2s
- Paired with haptic: 8ms vibrate on copy ✅

### M-014 (Disabled share — explanation) — EXCELLENT
- Never leaves user wondering why the button is disabled
- Explains what to do: "Publish this job first"
- Matches the pattern: disabled state = reason shown ✅

## Phase 3: Issues Found

### NOTIFY-01 · LOW · Double delete confirm creates messaging contradiction
- User clicks "Delete job post" in danger zone → sees "Delete job post?" confirm panel → clicks "Delete job post" → SECOND external ConfirmationDialogComponent appears asking again
- Message contradiction: two separate "are you sure?" flows with different copy/styling
- SAME as FINDING-01/ACT-004
- Fix: remove second ConfirmationDialogComponent

### NOTIFY-02 · INFO · M-023 could add apply CTA
- Boilerplate fallback: "The employer hasn't added a full job description yet. Check back soon for more details."
- Opportunity: add "You can still apply if interested." with Apply Now CTA
- Risk: applicant might be misled about job quality
- Recommendation: defer, add only if apply flow confirmed to work without description

## Phase 4: Code Changes Made

None — all messages already excellent for this deployment.

## Release Gate

| Gate | Status |
|---|---|
| A Message safety | PASS — no secrets/raw errors/stack traces in messages |
| B Public portal messaging | PASS — boilerplate notice is clear and honest |
| C Applicant guidance | N/A — no applicant changes |
| D Recruiter/admin messaging | PASS WITH CAUTION (double-confirm UX — NOTIFY-01) |
| E Accessibility messaging | PASS WITH CAUTION (nested role=dialog — FINDING-02) |
| F Email notification safety | N/A — no email changes |

**Recommended next:** Fix ACT-004 (double confirm) then re-run NOTIFY

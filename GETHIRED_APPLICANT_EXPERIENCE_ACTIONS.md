# GETHIRED APPLICANT EXPERIENCE ACTIONS
## QA Cycle 11

**Generated:** 2026-06-25
**Scope:** All actions affecting the job seeker / applicant journey: discovery, apply, status tracking, CV builder, messaging, interview flow.

---

## AE-01 — Fix getListByUser (Applicant Interview List is Broken)
**Priority:** P2
**ID:** GH-ACT-P2-06
**Current state:** `GET /api/interview/getlistbyuser` always returns `data: null`. Applicants cannot see scheduled interviews.
**Files:** `controllers/interviewController.js` line 224, `services/interview.service.js`
**Action:** Implement `getInterviewsOfUser(uid)` service — join `interview_recipients` with `group_interview` or the equivalent interview scheduling tables for this applicant's UID.
**Acceptance Criteria:**
- [ ] Returns list of upcoming/past interviews for the authenticated applicant
- [ ] Includes interview date, job title, company name, status
- [ ] Returns `[]` (not `null`) when no interviews exist
- [ ] HTTP 200 on empty case
- [ ] Unit test covers empty and populated cases

---

## AE-02 — Application Status Visibility for Applicants
**Priority:** P2
**Current state:** Applicants can call `/applicant/application/snapshot` for a single application. No dashboard widget shows all their statuses at a glance.
**Action:** Ensure the applicant dashboard (`getDashboard` in `applicantsController`) surfaces `application_status_name` for all active applications.
**Files:** `controllers/applicantsController.js`
**Acceptance Criteria:**
- [ ] Dashboard response includes `applications[].statusName` and `applications[].statusUpdatedAt`
- [ ] FE applicant dashboard shows status chip/badge per application
- [ ] Status updates in employer pipeline immediately visible to applicant on next poll

---

## AE-03 — CV Delete: Firebase Storage Orphan Cleanup
**Priority:** P3
**ID:** GH-ACT-P3-01
**Current state:** Deleting a CV removes the DB row but leaves the file in Firebase Storage. Applicants believe their CV is gone but it persists in storage (privacy concern).
**Files:** `controllers/cvController.js`
**Action:** Read `file_url` from the CV row before DELETE; parse the storage path; call Firebase Admin `bucket.file(path).delete()`.
**Acceptance Criteria:**
- [ ] Storage file removed on successful CV delete
- [ ] On Storage delete failure: log warn but return 200 (DB deletion already committed)
- [ ] Manual test: file no longer accessible from Firebase Storage URL after delete

---

## AE-04 — Message Thread: Applicant Unread Indicator (B01 Companion)
**Priority:** P2
**Depends on:** GH-ACT-P1-01 (recruiter_last_read_at migration ships first for recruiter side)
**Current state:** Applicants who receive a message from a recruiter have no in-app indicator.
**Action:** Add applicant-side `applicant_last_read_at` column (same migration or a separate one). FE applicant message widget shows unread dot.
**Files:** `services/message.service.js`, FE applicant messaging component
**Acceptance Criteria:**
- [ ] `applicant_last_read_at` column added in same or follow-up migration
- [ ] FE: unread dot on message icon in applicant sidebar when `thread.updated_at > applicant_last_read_at`

---

## AE-05 — Applicant Profile Completeness Nudge
**Priority:** P2
**Current state:** `GET /applicant/profile/completeness` returns a completeness score. The FE does not surface this prominently on the applicant dashboard.
**Action:** Show a completeness progress bar + "Complete your profile" CTA on the applicant dashboard home. Link to specific incomplete sections.
**Files:** FE applicant-dashboard component
**Acceptance Criteria:**
- [ ] Completeness % shown as progress bar on dashboard
- [ ] Each incomplete section (work exp, education, skills, photo) shown as a checklist item
- [ ] Clicking item navigates directly to that section's edit form
- [ ] 100% complete shows a "Profile complete" celebration state

---

## AE-06 — Video CV Playback Error State
**Priority:** P3
**Current state:** If a video CV URL is broken or expired from Firebase Storage, the player shows a browser-default error.
**Action:** Add an error handler to the video CV player component that shows a friendly "Video unavailable — please re-upload" message with a re-upload CTA.
**Files:** FE video-cv component (or wherever `saveVideoCV` output is rendered)
**Acceptance Criteria:**
- [ ] `<video>` `error` event caught and friendly message displayed
- [ ] Re-upload CTA shown in error state
- [ ] No console errors leaked to user

---

## AE-07 — Apply Flow: Duplicate Application Prevention
**Priority:** P2
**Current state:** Unclear whether `submitApplication` prevents duplicate applications (same user + same job). If not, applicants can accidentally apply twice.
**Action:** Add a unique constraint on `(job_id, candidate_id)` in `job_applicants` and a check in `submitApplication` that returns a clear 409 on duplicate.
**Files:** `controllers/applicationController.js`, DB migration
**Acceptance Criteria:**
- [ ] Second `POST /application/apply` for same job+user returns HTTP 409 `{ message: "You have already applied to this job." }`
- [ ] FE apply button shows "Applied" state after first application
- [ ] No duplicate row in `job_applicants`

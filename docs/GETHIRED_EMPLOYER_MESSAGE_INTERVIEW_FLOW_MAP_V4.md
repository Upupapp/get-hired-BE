# GETHIRED EMPLOYER MESSAGE AND INTERVIEW FLOW MAP V4

**Document:** 23 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference

---

## 1. Messages: Architecture and Access

### How Messages Are Accessed

Messages in the employer panel are not exposed via a top-level route. There is no `/recruiter/messages` page and no global inbox. The sidebar does not contain a messages item.

Messages are accessible exclusively through the applicant detail panel inside the job applicants component:

- **Route:** `/recruiter/jobs/applicants` (with jobId query parameter)
- **Component:** `get-hired-FE/src/app/job/job-applicants/job-applicants.component`
- **Access path:** Employer opens a job > clicks into an applicant row > applicant detail panel opens inline > message thread is visible in that panel

### Message Thread Component

**Component:** `app-message-thread`  
**Template location:** within the job-applicants component applicant detail panel

#### Behavior

- Thread is opened by calling `openThread()` when the applicant detail panel is activated
- Messages are fetched by calling `getThreadMessages()`
- Polling interval: 8 seconds (continuous poll while panel is open)
- New message is sent by calling `sendMessage()` with `newBody` (the compose input value)

#### Backend Endpoints

| Action | Method | Endpoint |
|---|---|---|
| Open / create thread | POST | `/messages/thread` |
| Fetch thread messages | GET | `/messages/thread/messages` |
| Send a message | POST | `/messages/thread/send` |

---

## 2. Messages: State Map

### Empty Thread (no messages yet)

- **Condition:** Thread exists but no messages have been sent
- **UI behavior:** Chat UI renders normally; message list area is empty
- **Copy shown:** None specified; the compose input is available
- **UX impact:** Employer can start the conversation; the empty list does not block input

### Thread Load Failure

- **Condition:** `openThread()` call fails (network error, server error, auth error)
- **UI behavior:** Error message displayed in place of thread
- **Copy shown:** "Could not open this conversation. Please try again."
- **User action available:** Close and reopen the applicant detail panel to retry

### Message Send Failure

- **Condition:** `sendMessage()` call fails
- **UI behavior:** Error message displayed
- **Copy shown:** "Could not send your message. Please try again."
- **Text preservation:** The compose input (`newBody`) is cleared only on success, not on error. This is correct behavior: the employer's typed text is preserved after a failed send so they can retry without retyping.

### Message Send Success

- **Condition:** `sendMessage()` resolves successfully
- **UI behavior:** New message appears in thread; `newBody` is cleared
- **Polling:** Next poll at 8-second interval will also include the sent message

### Thread Loading (in-progress)

- No explicit loading skeleton confirmed for the message thread. The thread area renders after `openThread()` resolves.

---

## 3. Messages: Known Gaps

| Gap | Impact | Backlog ID |
|---|---|---|
| No global `/recruiter/messages` route | Employer cannot check messages without opening a specific applicant panel in a specific job | B01 |
| No sidebar messages link | Unread messages are invisible from the top-level navigation | B01 |
| No persistent unread message count or badge | Employer has no ambient awareness of waiting replies | B01 |
| No messages tab or notification center | High-volume employers lose threads | B01 |

---

## 4. Interview: Architecture and Access

### Interview Page (Under Construction)

- **Route:** `/recruiter/interview`
- **Component:** `app-under-construction`
- **Current state:** Dead end. Clicking "Interviews" in the sidebar opens a placeholder under-construction screen. No interview management, scheduling, or review functionality is available at this route.

### Interview Questions in Job Creation

Interview questions are configured during job creation, not on the interview page.

- **Route:** `/recruiter/jobs/create` (step 3 of 4)
- **Step label:** "Create Interview"
- **Form group:** `interview` > `interviewQuestions` (FormArray)
- **Template:** `interviewTemplateId` can also be selected

#### Publish Requirement

In `job-create.component.ts`, `publishJobPost()` includes the following check:

```typescript
job.interviewQuestions.length != 0
```

A job cannot be published if `interviewQuestions` is empty. The missing-field snackbar will include "Interview Questions" in the missing list. This is a publish-blocking requirement.

Note: The interview step's `statusChanges` subscription is commented out in the current codebase (marked "Made Interview Optional"), but the publish-time check above is still active. The form step itself does not gate navigation to step 4, but publishing without questions is blocked.

### Video Response Viewing

Video responses from applicants are not played on an interview page. They are viewed via `VideoPreviewComponent`, opened from the applicant list by calling `viewCv()`.

- **Component:** `VideoPreviewComponent`
- **Access path:** Applicant list > applicant row action > `viewCv()` call

Video responses are played as raw video. No automated evaluation of any kind is applied.

### No Interview Scheduling System

There is no interview scheduling capability in the current codebase:

- No calendar integration
- No time-slot picker
- No invite-to-interview flow triggered from the employer panel
- The `inviteApplicant()` function exists as a TODO placeholder and is not implemented

---

## 5. Interview: State Map

| State | Location | UI |
|---|---|---|
| Interview route visited | `/recruiter/interview` | Under-construction placeholder screen |
| Interview step in job create (empty) | Step 3, job create | Empty question builder; publish will be blocked |
| Interview step in job create (filled) | Step 3, job create | Questions listed; publish is allowed |
| Video response preview | `VideoPreviewComponent` | Video player opens in dialog |
| No video available | VideoPreviewComponent | Not confirmed; assumed fallback renders empty |

---

## 6. Fair Hiring: Video Responses

Video responses are reviewed by the human employer. No automated face detection, voice analysis, accent analysis, emotion detection, or personality scoring is applied to video responses in any part of the codebase reviewed in this V4 pass.

The `VideoPreviewComponent` opens a video for playback only. No API calls to any analysis service were found in connection with video response viewing.

This is the correct behavior. Automated personality/emotion/accent/voice evaluation of video responses is prohibited under the fair hiring guardrails documented in `GETHIRED_EMPLOYER_FAIR_HIRING_AI_GUARDRAILS_V4.md`.

---

## 7. Backlog Recommendations

### B01: Global Messages Route (P1)

**Effort:** M  
**Impact:** High — employers currently cannot check messages without navigating to a specific job and opening a specific applicant panel.  
**Recommended implementation:**
- Add `/recruiter/messages` route
- Add sidebar item "Messages" (with optional unread badge)
- Backend: add a `/messages/threads` endpoint listing all threads for the authenticated employer's company
- Frontend: thread list + thread detail (reuse `app-message-thread` component)

### B03: Interview Page (P2)

**Effort:** XL  
**Impact:** High — the current under-construction page is a dead end that the sidebar links to directly.  
**Recommended implementation:**
- Replace `app-under-construction` at `/recruiter/interview` with a real interview management page
- Minimum viable: list of jobs with their configured interview questions; link to edit
- Stretch: interview response review per applicant, scheduling integration

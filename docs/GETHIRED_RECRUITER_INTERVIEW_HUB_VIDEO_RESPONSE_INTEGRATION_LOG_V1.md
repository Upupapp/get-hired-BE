# GetHired Recruiter Interview Hub — Video Response Integration Log V1

**Date:** 2026-06-25

---

## How Video Answers Flow Into the Hub

### Applicant-side submission path

1. Applicant views job with `hasVideoInterview: true` (public portal, `public-job-normalizer.service.ts`)
2. Application form includes video recording step (RecordRTC or built-in)
3. `POST /api/application/apply` with `interviewAnswers` array
4. `jobApply()` service writes:
   - `job_applicants` row with `application_status_id = 3` ("Under Review")
   - One `interview_answers` row per answer with `answer_url` (Cloud Storage URL)

### Employer-side visibility in hub

The hub endpoint subquery:
```sql
SELECT ia.applicant_id, COUNT(*) AS video_answer_count
FROM gethired.interview_answers ia
GROUP BY ia.applicant_id
```
Joined on `va.applicant_id = ap.applicant_profile_id`.

This gives the hub:
- `videoAnswerCount` — number of video answers for this applicant (across all jobs, scoped by the outer JOIN to company's jobs)
- `hasVideoAnswers` — boolean derived from count > 0

### Video Review Path

Hub does not inline video playback — this keeps the hub fast and avoids exposing raw storage URLs in list responses. To review videos:
1. Click "View applicants" or "Review responses" on a card
2. Routes to `/recruiter/contacts/candidate-list/:jobId`
3. `CandidateListComponent` → `getApplicant(candidateId)` → `GET /api/job/applicantdetails?jobId=&id=`
4. Returns `answers` array with `answerUrl` strings
5. Employer views via existing `VideoPreviewComponent` in `SharedModule`

---

## What Is NOT Integrated (intentional)

- No face/voice/emotion/personality analysis — never, by policy
- No "top video" ranking — the hub is a neutral list
- No inline video player in the hub — review is a separate deliberate action
- No AI transcription — no infrastructure for this

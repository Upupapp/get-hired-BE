# GetHired Recruiter Interview Hub — Data Contract Log V1

**Date:** 2026-06-25

---

## Decision: Option B — New Thin BE Endpoint

**Endpoint:** `GET /api/interview/hub`
**Auth:** `verifyAuth` middleware required; 403 if no company
**Controller:** `getInterviewHub` in `controllers/interviewController.js`

---

## Authorization Model

Company is ALWAYS derived from `getUserCompany(req.user.uid)` — never from query/body params. Pattern matches all other BOLA-hardened controllers in this codebase.

```
getUserCompany(uid) → callerCompany.companyId
WHERE j.company_id = $1  ← $1 = companyId, never caller-supplied
```

---

## SQL Query

```sql
SELECT
  ja.job_application_id,
  ja.candidate_id,
  ja.application_status_id,
  ja.date_applied,
  ja.updated_at,
  j.job_id,
  j.job_title,
  s.job_applicant_status_name,
  u.first_name, u.last_name, u.email, u.photo_url,
  COALESCE(va.video_answer_count, 0) AS video_answer_count
FROM gethired.job_applicants ja
JOIN gethired.jobs j ON j.job_id = ja.job_id
LEFT JOIN gethired.job_applicant_status s ON s.job_applicant_status_id = ja.application_status_id
LEFT JOIN gethired.applicants_profile ap ON ap.user_id = ja.candidate_id
LEFT JOIN gethired.users u ON u.uid = ja.candidate_id
LEFT JOIN (
  SELECT ia.applicant_id, COUNT(*) AS video_answer_count
  FROM gethired.interview_answers ia
  GROUP BY ia.applicant_id
) va ON va.applicant_id = ap.applicant_profile_id
WHERE j.company_id = $1
  AND ja.is_archived IS DISTINCT FROM true
ORDER BY COALESCE(ja.updated_at, ja.date_applied) DESC
LIMIT 200
```

**Join chain note:** `interview_answers.applicant_id` is FK to `applicants_profile.applicant_profile_id`, not directly to `job_applicants.candidate_id`. The join goes: `job_applicants.candidate_id` → `applicants_profile.user_id` → `applicants_profile.applicant_profile_id` → `interview_answers.applicant_id`.

---

## Response Shape

```json
{
  "items": [
    {
      "applicationId": "APPL-abc123",
      "applicantId": "uid-firebase-abc",
      "applicantName": "Jane Doe",
      "applicantEmail": "jane@example.com",
      "applicantPhotoUrl": null,
      "applicationStatusId": 3,
      "applicationStatus": "Under Review",
      "dateApplied": "2026-06-20T10:30:00Z",
      "lastActivity": "2026-06-20T10:30:00Z",
      "jobId": "JB-xyz456",
      "jobTitle": "Senior Engineer",
      "videoAnswerCount": 2,
      "hasVideoAnswers": true
    }
  ],
  "total": 1
}
```

---

## What Is Intentionally NOT in the Response

- No `answer_url` values (video URLs) — never expose raw storage URLs in list endpoints
- No full applicant profile details — link to contacts/candidate-list for that
- No ranking, scoring, or ordering by anything other than recency
- No scheduling data

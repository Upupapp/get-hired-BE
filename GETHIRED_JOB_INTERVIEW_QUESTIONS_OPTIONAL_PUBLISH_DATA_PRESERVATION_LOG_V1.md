# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — DATA PRESERVATION LOG V1

## Date: 2026-06-25

---

## INTERVIEW QUESTION DATA — UNCHANGED

### Storage
- Table: `interview_template_question` — rows for each question
- Parent: `job_interview_template` — one per job, template_name = "default"
- Fields: `template_question`, `template_answer_duration`, `template_question_retakes`, `sequence`
- Linked to job via `job_interview_template.job_id`

### Read path
`getJobInterviewQuestions(jobId, "default")` → called inside `mappedJob` → returns to both employer edit and applicant detail endpoints. Unchanged.

### Write path — Create
`createJobs` → `createInterviewTemplateQuestions` + `createQuestion` per question. Conditional on `interviewQuestions.length != 0`. Unchanged.

### Write path — Update
`updateJob` → `interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId)`. Calls `updateQuestionById` for existing questions, `createQuestion` for new ones. Unchanged.

### Write path — Delete single question
`deleteInterviewQuestion` endpoint → DELETE with company ownership subquery + resequence. Unchanged.

---

## APPLICANT ANSWER DATA — UNCHANGED

- Table: `interview_answers`
- Fields: `question_id`, `answer_url`, `created_at`, `job_id`, `applicant_id`
- Write: application submission endpoint (not in scope, not touched)
- Read: `getInterviewAnswers(applicantId, jobId)` → returned in `applicationOfApplicant`. Unchanged.

---

## VERDICT

Zero data schema changes. Zero service function changes. Zero query changes.
All existing interview question records and applicant answers are fully preserved.

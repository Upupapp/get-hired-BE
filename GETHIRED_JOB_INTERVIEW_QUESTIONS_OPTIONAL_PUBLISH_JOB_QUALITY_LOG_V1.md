# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — JOB QUALITY LOG V1

## Date: 2026-06-25

---

## JOB POST QUALITY SIGNALS: UNCHANGED

### Matchability score (preview)
- `JobMatchabilityService.evaluate()` is called in `preview-job-post-step.component.ts` — unchanged
- Interview questions are NOT an input to matchability scoring — the service evaluates job post clarity fields (title, description, requirements, skills, etc.)
- The matchability copy "This score reflects how clear your job post is for matching, not how good your job is." remains unchanged

### Employer guidance
- The optional badge + hint copy in Step 3 encourages employers to add questions ("Add interview questions to guide applicant responses") without making questions a gate
- The empty-state message ("You can publish now and add questions later") sets expectations without quality pressure

### What interview questions add (preserved, educational)
When questions are present:
- Applicants answer by video, enabling richer evaluation
- Answers are stored per-question, per-applicant, per-job in `interview_answers`
- Employer can review answers in `candidate-list` alongside applicant profile

When questions are absent:
- Job quality is unaffected from a match/search perspective
- Applicants still apply with profile, resume, cover letter
- Application completeness is unchanged

---

## VERDICT

Making questions optional does not degrade job post quality signals. Matchability score is unaffected. Applicant search/discovery is unaffected. The change removes a friction point for employers while preserving all quality-enhancing features when they choose to use them.

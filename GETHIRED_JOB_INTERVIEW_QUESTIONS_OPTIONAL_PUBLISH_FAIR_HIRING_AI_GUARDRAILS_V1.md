# GETHIRED JOB INTERVIEW QUESTIONS OPTIONAL PUBLISH — FAIR HIRING & AI GUARDRAILS V1

## Date: 2026-06-25

---

## COPY AUDIT

### Approved copy used (from command brief)
- "Optional for publishing" ✓
- "Add interview questions to guide applicant responses." ✓
- "Applicants may answer these questions by video as part of their application." ✓
- "Video answers are reviewed by employers and are not automatically scored." ✓
- "You can publish now and add questions later." ✓

### Forbidden copy check — PASS (none present)
Searched all new HTML/SCSS for:
- "AI evaluates" — NOT FOUND
- "auto-screen" — NOT FOUND
- "automatically rank" — NOT FOUND
- "voice" — NOT FOUND (except pre-existing unrelated uses)
- "accent" — NOT FOUND
- "emotion" — NOT FOUND
- "personality" — NOT FOUND
- "missing questions lower match score" — NOT FOUND
- "automatically scored" — USED ONLY IN NEGATED FORM: "not automatically scored" ✓

---

## MATCH SCORING GUARDRAIL

- `JobCompatibilityService` and `JobMatchabilityService`: NOT touched
- Match score in preview (`matchability`) remains informational only — copy reads "This score reflects how clear your job post is for matching, not how good your job is." (pre-existing, not modified)
- Interview questions are NOT a factor in `JobMatchabilityService.evaluate()` — the matchability score is based on job post clarity fields only
- No new signals added to MATCH or PROFILE systems

---

## VIDEO ANSWER PRIVACY

- New copy: "Video answers are reviewed by employers and are not automatically scored." — clearly states human review, denies automated scoring
- Employer review: company-scoped, requires ownership check (`getUserCompany`), no cross-company exposure
- No AI/ML processing of video answer content added, referenced, or implied

---

## SENSITIVE TRAIT SCORING: CONFIRMED ABSENT

No component, service, or API endpoint scores or exposes:
- Voice, accent, emotion, or personality inferred from video
- Age, gender, ethnicity, disability, or protected class signals
- Any automated ranked applicant ordering based on video content

---

## VERDICT

All fair hiring and AI guardrails hold. Zero forbidden phrases. Zero new automated scoring. Employer review remains human-in-the-loop. The "not automatically scored" copy explicitly reinforces this to employers.

# GetHired Employer Onboarding & Core Job Activation — Trust & Fair Hiring Guardrails V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Fair Hiring Guardrails — Changed Areas Verified

### Signup (changed in V5)
- No protected attributes collected (race, gender, age, disability, religion, national origin)
- No personality, voice, face, accent, emotion fields added
- Employer-specific title/subtitle does not imply AI screening capabilities
- Approved copy: "Start hiring in minutes. Post your first job and reach qualified candidates."
- No fake claims about hiring outcomes or guaranteed applicants

### Dashboard Onboarding Checklist (new in V5)
- Checklist derived entirely from real employer-entered data
- "Complete your company profile" — factual description of employer's own setup
- "Post your first job" — factual next step
- "Review your first applicants" — factual next step
- No applicant scores, rankings, or automated recommendations on checklist
- No implied AI action in any checklist item

### Dashboard Action Center (existing, verified)
- Applicant count: real data from API (needsReviewCount from pipeline API)
- "Review new applicants" card: factual — shows actual applicants waiting for human review
- No claim that applicants are pre-screened, ranked, or sorted by AI
- No "Best match" labels, no "Recommended candidates" from AI

### Navigation Restructure (changed in V5)
- "Candidates" label (renamed from Contacts): factual — refers to candidate/contact management
- "Company" label (renamed from Company Profile): factual
- No implied AI in nav labels

### Job Create / Publish (changed in V5 — B04)
- Interview questions made optional: no automated screening implication
- Missing field messages use factual field names: "job type", "work setup", etc.
- No message implies AI will handle missing information
- Post-publish route: employer taken to their own job's applicant list — factual navigation

### Certification/License Requirements (unchanged, verified)
- Cert requirements are employer-entered advisory fields
- No auto-scoring, no auto-rejection based on cert requirements
- No "Auto-match licenses" copy anywhere
- No "Missing certification detected" shown to applicants

---

## Copy Audit — V5 Changed Areas

### Approved Copy Found
- "Create your employer account" (signup title) — factual
- "Start hiring in minutes. Post your first job and reach qualified candidates." (signup subtitle) — factual
- "Create employer account" (signup button) — factual action
- "Already have an employer account? Sign in" (signup link) — factual
- "Getting started" (checklist section title) — factual
- "Complete these steps to get the most out of GetHired." (checklist intro) — factual
- "Complete your company profile" (checklist step 1) — factual
- "Post your first job" (checklist step 2) — factual
- "Review your first applicants" (checklist step 3) — factual
- "N applicants to review" (hero chip) — real count only when > 0
- "Home", "Jobs", "Post Job", "Company", "Account" (mobile nav) — factual labels

### Forbidden Copy — Confirmed Absent in V5 Changes
- "AI will choose the best candidates" — NOT PRESENT
- "Guaranteed applicants" — NOT PRESENT
- "Guaranteed hire" — NOT PRESENT
- "Perfect match" — NOT PRESENT
- "Auto-match licenses" — NOT PRESENT
- "Employers like you get X applicants" — NOT PRESENT
- "AI-powered screening" — NOT PRESENT
- "Auto-optimize job post" — NOT PRESENT
- Any fake urgency (e.g. "Act now! X employers are competing for these candidates") — NOT PRESENT
- Fake applicant counts (e.g. hardcoded "500+ candidates applied") — NOT PRESENT

---

## Data Claims Audit

### V5 Onboarding Checklist Data
- `hasLogo`: derived from `company.companyLogoUrl` — real
- `hasDescription`: derived from `company.companyDetails` — real
- `hasLocation`: derived from `company.companyCity` — real
- `hasActiveJob`: derived from `charts.activeJobs > 0` — real
- `needsReviewCount > 0`: derived from pipeline API — real

### Dashboard KPIs
- All KPI values are `|| 0` defaults from real API — no invented values
- Pipeline bars: real stage counts from `/company/dashboard/pipeline-overview`
- Needs-review list: real applicant names, job titles, dates from pipeline API

---

## AI/Automation Claims Audit

No AI or automated recommendation features were added in V5. The following AI-adjacent features that do NOT exist in GetHired and were NOT added:
- AI job post optimization
- AI applicant screening
- AI interview scoring
- AI certification matching
- AI personality or culture fit scoring
- AI bias detection
- Automated candidate ranking

---

## Employer Brand Fields Audit

Employer brand fields (logo, description, city) are employer-entered only. The dashboard checks these fields and surfaces them as "missing" based on null checks. No testimonials, reviews, awards, or star ratings were added.

---

## Conclusion

All V5 code changes pass fair-hiring and trust guardrail review. No fake data, no AI claims, no auto-rejection, no protected attribute handling was introduced.

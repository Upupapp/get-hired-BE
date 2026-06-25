# GetHired Recruiter Interview Hub — Fair Hiring & AI Guardrails V1

**Date:** 2026-06-25

---

## Copy Audit: Forbidden Terms

Scanned all HTML template text for:

| Term | Found in Hub? |
|------|--------------|
| "AI" | NO |
| "auto" / "automatically" | NO |
| "ranked" / "ranking" | NO |
| "scored" / "score" | NO |
| "analyzed" / "analysis" | NO |
| "emotion" | NO |
| "voice analysis" | NO |
| "face" / "facial" | NO |
| "personality" | NO |
| "top candidates" | NO |
| "best match" | NO |
| "high intent" | NO |
| "smart" | NO |
| "recommended" | NO |

---

## Count/Number Guardrails

- `videoAnswerCount` — real integer from DB aggregate `COUNT(*)` — never hardcoded
- `total` — real row count from BE — never hardcoded
- Filter chip count badge — computed from `items.filter(i => i.hasVideoAnswers).length` — real
- No "X candidates shortlisted", "Y responses awaiting" fake counts

---

## Ordering Guardrail

Applications are ordered by `COALESCE(ja.updated_at, ja.date_applied) DESC` — recency only. No implied "best" or "recommended" ordering. Recruiters see most recently active applications first.

---

## Video Response Guardrails

- Hub shows count only ("2 video responses") — no qualitative assessment
- No transcription, no sentiment, no engagement score
- Review action is an explicit recruiter choice — not pushed as "must review"
- No badge for "not yet reviewed" to avoid creating urgency pressure

---

## Status Label Guardrail

Status labels come from `job_applicant_status.job_applicant_status_name` (seeded data):
- "Pending Review", "Applied", "Under Review", "Shortlisted", "Rejected", "Hired"
- These are recruiter-assigned statuses — not AI-assigned
- The hub displays them verbatim — no reinterpretation

---

## Compliance Assessment

PASS. The hub is a neutral list interface. It surfaces real data (application count, video response count, status) with no qualitative scoring, no AI claims, and no fake urgency. Suitable for jurisdictions with algorithmic hiring disclosure requirements.

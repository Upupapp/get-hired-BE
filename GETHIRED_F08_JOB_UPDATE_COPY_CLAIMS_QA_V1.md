# GETHIRED F-08 — COPY AND CLAIMS QA
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Forbidden Copy Scan — Job Update Surfaces

Searched `job-create.component.html`, `job-create.component.ts`, `job-create.component.scss` for forbidden patterns.

### Forbidden: Company identity exposure in errors
- "wrong company" → NOT FOUND in user-facing copy
- "company_id" → NOT FOUND in user-facing copy
- "unauthorized company" → NOT FOUND
- "another company" → NOT FOUND

### Forbidden: AI/automated claims
- "AI optimized" → NOT FOUND
- "auto-screened" → NOT FOUND
- "automatically" (in save context) → NOT FOUND
- "AI-powered" → NOT FOUND

### Forbidden: Security technical details
- "JWT" → NOT FOUND in user-facing copy (only in code comments)
- "Firebase" → NOT FOUND in user-facing copy
- "403" → NOT FOUND in user-facing copy (only in code)
- "permission denied" (exact phrase) → NOT FOUND

---

## Error Copy Audit

| Error Scenario | Copy Shown | Verdict |
|----------------|-----------|---------|
| 403 BOLA block | "We couldn't update this job. It may no longer exist or you may not have access." | PASS — no security internals |
| Session expired | "Your session has expired. Please sign in again." | PASS — clear, actionable |
| Validation failure | "Please review the highlighted fields." | PASS — specific without internals |
| Generic 500 | "We couldn't update this job. Try again." | PASS — simple retry prompt |

---

## Success Copy Audit

| Scenario | Copy Shown | Verdict |
|----------|-----------|---------|
| Draft saved | Dialog: "Job successfully saved as Draft." | PASS |
| Job published | Dialog: "Job successfully Published." | PASS |
| Publish snackbar | "Your job is published and ready to be discovered by [talentProof copy]." | PASS — uses TalentProofService, not hardcoded |
| Save-in-progress | Button: "Saving..." / "Publishing..." | PASS — factual, no claims |

---

## TalentProofService Copy

Used in publish-success snackbar: `this.talentProof.getDisplayCopy('short')`

This is a service that returns verified copy from a controlled source — not hardcoded inflated claims. Existing behavior, not modified this sprint.

---

## Backend Error Messages Audit

| Scenario | Copy | Verdict |
|----------|------|---------|
| updateJob 403 — no company | "You don't have permission to update this job." | PASS |
| updateJob 403 — wrong company/not found | "You don't have permission to update this job." | PASS — uniform, no leak |
| changestatus 403 | "You don't have permission to update this job." | PASS |
| getAllApplicantOfJob 403 | "You don't have permission to do that." | PASS |

---

## Result: PASS — No Forbidden Copy Found

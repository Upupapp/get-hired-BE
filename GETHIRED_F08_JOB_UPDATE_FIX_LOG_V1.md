# GETHIRED F-08 — SAFE FIXES ONLY LOG (Every Code File Changed)
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## File 1: services/interview.service.js

**Change:** `updateQuestionById` signature hardened with optional `companyId` parameter and company-scoped WHERE clause

**Before behavior:** Updated any interview question by template_question_id with no company boundary check

**After behavior:** When `companyId` is provided, the WHERE clause includes a subquery `AND job_interview_template_id IN (SELECT ... WHERE company_id=$7)` — question update is scoped to the caller's company. Legacy fallback (no companyId) unchanged.

**Risk level:** Low — additive only; default `null` ensures backward compatibility with all existing callers

**Verification:** Code review — SQL is valid parameterized query; `if (companyId)` branch correctly routes to scoped vs unscoped query

---

## File 2: services/job.service.js

**Change 1:** `interviewQuestionsUpdate` signature: added optional 4th parameter `companyId = null`

**Before behavior:** 3-parameter function, `.map(async)` without Promise.all (fire-and-forget — errors silently dropped)

**After behavior:** 4-parameter function (companyId threaded through to updateQuestionById), `await Promise.all(...)` ensures all updates are awaited and errors propagate

**Risk level:** Low — default `null` preserves backward compatibility; Promise.all fix corrects a prior silent-swallow bug (positive side effect)

**Verification:** Code review — Promise.all pattern correct; callerCompany.companyId is always a string for authenticated employers

---

## File 3: controllers/jobsController.js

**Change:** `updateJob()` — passes `callerCompany.companyId` as 4th argument to `interviewQuestionsUpdate`

**Before behavior:** `interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId)` — no companyId propagated

**After behavior:** `interviewQuestionsUpdate(jobId, interviewQuestions, interviewTemplateId, callerCompany.companyId)` — company scope threads through to question updates

**Risk level:** None — passes existing variable that is already validated earlier in the same function

**Verification:** Code review — `callerCompany.companyId` exists at the call site (derived from getUserCompany earlier in function, guarded against null/array)

---

## File 4: src/app/job/job-create/job-create.component.ts

**Changes:**
1. Added 3 new class properties: `savingDraft`, `saveSuccessPulse`, `saveErrorMsg`
2. Added `jobError$` subscription in `ngOnInit` to map backend errors to user-safe copy
3. `saveAsDraft()`: sets `savingDraft = true`, clears error/pulse before dispatch
4. `publishJobPost()`: clears `saveErrorMsg` and `saveSuccessPulse` before dispatch
5. `afterSubmit()`: clears `savingDraft`, triggers `saveSuccessPulse` with 2s auto-clear

**Before behavior:** No loading state for draft save; no error message display for 403/404/500; no success micro-feedback

**After behavior:** Draft save shows spinner during pending request; 403/404/500 errors display user-safe message; brief success check-circle after backend success; form never cleared before success

**Risk level:** Low — additive properties; subscriptions added to existing `subscriptions` bag (unsubscribed in ngOnDestroy)

**Verification:** Code review — `jobFacade.jobError$` exists (selector defined); `savingDraft` check in error handler prevents spurious error displays for unrelated error events

---

## File 5: src/app/job/job-create/job-create.component.html

**Changes:**
1. Draft button: added `[disabled]="savingDraft || loading"`, `[attr.aria-label]`, spinner state
2. Cancel button: added `[attr.aria-label]` and `.btn-back-cancel` class
3. Added `*ngIf="saveSuccessPulse"` success pulse span with ARIA attributes
4. Added `*ngIf="saveErrorMsg"` error alert div with ARIA attributes

**Before behavior:** Draft button always enabled, no feedback states

**After behavior:** Draft button disabled during save; spinner shown; success/error micro-feedback shown below buttons

**Risk level:** None — additive HTML; existing content unchanged; Angular structural directives correct

---

## File 6: src/app/job/job-create/job-create.component.scss

**Changes:** Added new CSS classes (additive, no existing rules modified):
- `.btn-draft-save` — micro-scale press + transition
- `.btn-back-cancel` — compression
- `.btn-draft-loading`, `.draft-spinner` — draft saving spinner
- `.save-success-pulse` — success check animation
- `.save-error-alert` — error reveal animation
- `:focus-visible` glows on action buttons
- Mobile touch target min-height rules

**Before behavior:** No draft button effects; no error/success visual states; no mobile touch target enforcement

**After behavior:** Modern micro-interactions on draft + cancel buttons; success/error visual feedback; mobile-accessible touch targets; all animations have reduced-motion fallbacks

**Risk level:** None — pure CSS additions; no existing selectors modified; reduced-motion safe

# GETHIRED F-08 — FRONTEND UPDATE UX FIX LOG
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Files Changed

- `src/app/job/job-create/job-create.component.ts`
- `src/app/job/job-create/job-create.component.html`
- `src/app/job/job-create/job-create.component.scss`

---

## Fix 1: Draft Save Loading State

**Problem:** "Save as Draft" button had no loading indicator. Double-click was possible. No visual feedback during BE round-trip.

**Before:**
```html
<button (click)="saveAsDraft()">Save as Draft</button>
```

**After:**
```html
<button [disabled]="savingDraft || loading" (click)="saveAsDraft()"
  [attr.aria-label]="savingDraft ? 'Saving draft...' : 'Save as Draft'">
  <span *ngIf="!savingDraft">Save as Draft</span>
  <span *ngIf="savingDraft" aria-live="polite">
    <span class="draft-spinner" aria-hidden="true"></span>
    Saving...
  </span>
</button>
```

TS: `savingDraft = true` set before dispatch, cleared in `afterSubmit` and on error.

---

## Fix 2: Error Message Display for 403/404/500

**Problem:** When the backend returned 403 (BOLA block, wrong company, expired session), the UI showed nothing — the spinner just stopped. The user had no feedback.

**Before:** No `saveErrorMsg` property. No error display in template. Effect had good error normalization but nothing consumed it in the UI.

**After:**
```html
<div *ngIf="saveErrorMsg" class="save-error-alert" role="alert" aria-live="assertive">
  <i class="bi bi-exclamation-triangle-fill me-1"></i>
  {{ saveErrorMsg }}
</div>
```

TS: subscribes to `jobFacade.jobError$`, maps to user-safe copy:
- 403 → "We couldn't update this job. It may no longer exist or you may not have access."
- Session/token → "Your session has expired. Please sign in again."
- Field validation → "Please review the highlighted fields."
- Generic → "We couldn't update this job. Try again."

Never shows security internals. Error cleared on next save attempt.

---

## Fix 3: Success Check Pulse

**Problem:** After draft save, no micro-feedback until the dialog appeared (0.2–0.5s delay). After publish, the dialog is the only signal.

**After:**
```html
<span *ngIf="saveSuccessPulse" class="save-success-pulse" role="status" aria-live="polite">
  <i class="bi bi-check-circle-fill"></i>
</span>
```

TS: `saveSuccessPulse = true` set in `afterSubmit` immediately on success, auto-cleared after 2000ms.  
CSS: Scale-in animation with `prefers-reduced-motion: reduce` fallback (animation disabled, icon still shows).

---

## Fix 4: Prevent Duplicate Clicks

**Problem:** Both publish and draft buttons could be clicked multiple times during a pending request.

**Before:**
- Publish button: `[disabled]="!isAllowedToPublish || loading"` — loading was global
- Draft button: No disabled state

**After:**
- Publish button: unchanged (already correct)
- Draft button: `[disabled]="savingDraft || loading"` — blocked during any in-flight request

---

## Fix 5: Error Cleared on Next Attempt

**After:** Both `saveAsDraft()` and `publishJobPost()` set `saveErrorMsg = null` and `saveSuccessPulse = false` before dispatching.

---

## Preservation Checks

- Form data NOT cleared before backend success — confirmed (afterSubmit only navigates/shows dialog after success)
- B04 rule: interview/video questions still optional — unchanged
- B05 routing: post-publish → /recruiter/jobs/dashboard?id=... — unchanged
- B13 readiness bar: unchanged
- Dialog on publish success: unchanged
- Snackbar talent-proof copy on publish: unchanged
- Subscription alert: unchanged
- cancel() / resetFormState(): unchanged

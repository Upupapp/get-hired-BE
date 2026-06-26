# GetHired NOTIFY Backlog — NOTIFY-3

Items deferred from this pass. Not blocking release unless marked P0.

---

## P1 — High value, next sprint

### B-N3-01: auth.guard.ts toast copy (D-02 from NOTIFY-V5)
**File:** `src/app/shared/guard/auth.guard.ts` (or similar)  
**Issue:** "You are not Authorized to access that page. Please Login first"  
**Fix:** "You don't have permission to access that page. Please sign in." (lowercase, "sign in" not "Login")  
**Effort:** 1 line  
**Risk:** None (copy only)

### B-N3-02: account-authentication.component.ts — raw error in snackBar (D-03 from NOTIFY-V5)
**File:** `src/app/auth/account-authentication/account-authentication.component.ts`  
**Issue:** `this.snackBar.open(err, ...)` in catchError — if `err` is not a string, displays "[object Object]"  
**Fix:** `this.snackBar.open(typeof err === 'string' ? err : 'Unable to resend verification email. Please try again.', ...)`  
**Effort:** 1 line  
**Risk:** Very low (error display only, not business logic)

---

## P2 — Medium value, future sprint

### B-N3-03: Job detail error state — string coupling (D-01 from NOTIFY-V5)
**File:** `src/app/jobs/job-posts-details/job-posts-details.component.html`  
**Issue:** Session-required branch depends on exact string match `'Unable to load this job for the current session.'` from the effects layer. If effects message changes, wrong heading/CTA appears silently.  
**Fix:** Use a structured error object from the effects layer (`{ code: 'SESSION_REQUIRED', message: '...' }`) instead of raw string matching.  
**Effort:** Medium (requires effects + template change)  
**Risk:** Low if done carefully

### B-N3-04: Import dialogs — no empty-records guard before dispatch
**Files:** Both import-add-contact and import-add-candidate  
**Issue:** If CSV parses to 0 records, dispatch is called with empty array → BE returns 400 → generic error toast  
**Fix:** Add `if (!this.records || this.records.length === 0)` guard with "No valid records found in this CSV. Check the column format and try again." inline message  
**Effort:** Low  
**Risk:** None (FE-only guard, does not change API)

### B-N3-05: Import dialogs — no field-level validation messages
**Files:** Both import dialogs  
**Issue:** Required fields (email, firstName, groupName) have validators but no visible error text in templates  
**Fix:** Add `<small class="text-danger">` elements for each required field  
**Effort:** Low per field  
**Risk:** None

### B-N3-06: Signup — shared password visibility toggle (UX polish)
**File:** `src/app/auth/signup/signup.component.html`  
**Issue:** Single `inputType` variable controls both password and confirm-password visibility — toggling one reveals both  
**Fix:** Add `confirmInputType` separate variable  
**Effort:** Low  
**Risk:** None

### B-N3-07: Recorder setting — no recovery guidance for no-device toast
**File:** `src/app/recorder/recorder-setting/recorder-setting.component.ts`  
**Issue:** "No Available Devices to record" toast gives no next step  
**Fix:** Toast action button "Check permissions" that opens browser settings, OR inline message below recorder UI  
**Effort:** Low-medium  
**Risk:** None

---

## P3 — Low value, consider closing

### B-N3-08: OG image width/height/type tags need update if dynamic job OG images added
**File:** `src/app/core/services/seo.service.ts`  
**Issue:** Width/height/type tags hardcoded for default 1200x630 image. If job-specific OG images are ever added, values may not match.  
**Fix:** Accept optional `ogImageWidth`, `ogImageHeight` in `PageMetaConfig`  
**Effort:** Low  
**Risk:** None  
**Status:** Only relevant if dynamic OG images are planned. Close if not.

### B-N3-09: Bulk import partial-success copy polish
**Files:** import-add-contact, import-add-candidate  
**Issue:** "N added. M couldn't be added." — "couldn't be added" is passive  
**Fix:** "N added. M failed." or "N added, M failed — check the file for formatting issues."  
**Effort:** 1 line per file  
**Risk:** None

### B-N3-10: Signup validation — "Role is required" → "Please select a role"
**File:** `src/app/auth/signup/signup.component.html`  
**Issue:** "Role is required" is technically correct but less guiding  
**Fix:** "Please select whether you're an applicant or employer"  
**Effort:** 1 line  
**Risk:** None

---

## Previously Deferred Items (from NOTIFY-P2 / NOTIFY-V5)

| ID | Description | Status |
|---|---|---|
| NOTIFY-P2 D-01 | No per-item failure detail in partial-success bulk imports | Still deferred (requires dialog-level UI) |
| NOTIFY-V5 D-02 | auth.guard.ts copy | Promoted to B-N3-01 above |
| NOTIFY-V5 D-03 | raw err in snackBar | Promoted to B-N3-02 above |

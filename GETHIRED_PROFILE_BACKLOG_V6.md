# GETHIRED PROFILE BACKLOG V6
**Date:** 2026-07-01 | **Sorted by Priority**

---

## P1 — Blocking or High-Impact

### PRF-LI-001 — No `applicants_profile` stub on LinkedIn signup
**File:** `controllers/linkedinAuthController.js` → `createLinkedinUser()`
**Issue:** LinkedIn job seekers start with 0% completeness and see empty-profile dashboard. LinkedIn photo (available in `users.photo_url`) is not reflected in score.
**Fix:** After users INSERT, add a minimal `applicants_profile` INSERT for role=3 users. Use a helper in `applicant.service.js` to encapsulate the minimum valid row. Seed `photo_url` from LinkedIn picture.
**Carry-over from:** New in V6 (same pattern as V5 PRF-002 for Google)

### PRF-003 — `ProfileQualityService` (FE) drift risk
**File:** `src/app/public/services/profile-quality.service.ts`
**Issue:** The FE-only scoring service is no longer the canonical source (panel now calls BE) but still exists. If FE weights are changed independently, they'll drift from BE.
**Fix:** Add a comment marking it as "legacy, do not extend." Or delete if confirmed no active callers remain.

---

## P2 — Should Fix Before Wide Launch

### PRF-LI-002 — Name/photo lost in `linkedinChooseRole` (intent=auto path)
**File:** `controllers/linkedinAuthController.js` → `linkedinChooseRole()`
**Issue:** The pending token JWT only embeds `uid/status/intent/rt/rr` — not firstName/lastName/photoUrl. The choose-role handler falls back to `pendingPayload.firstName || ''` which will be empty.
**Fix:** Extend `makeTicketJwt()` to accept and embed firstName, lastName, photoUrl in the JWT payload. Update `linkedinChooseRole()` to read them.

### PRF-LI-003 — No `isNewUser` flag in `storeSession` for LinkedIn
**File:** `src/app/auth/services/linkedin-auth.service.ts`
**Issue:** `storeSession()` doesn't set `localStorage.isNewUser=true`, so post-signup onboarding prompt (PRF-002 from V5) won't fire for LinkedIn users.
**Fix:** Set `localStorage.setItem('isNewUser', 'true')` when creating a new user (need flag from BE response, or detect via `isNewUser` field added to `buildSessionResponse`).

### PRF-001 — Photo URL broken-image risk (LinkedIn + Google CDN photos)
**Files:** `src/app/applicant-panel/applicant-sidebar/applicant-sidebar.component.html` and recruiter profile views
**Issue:** The sidebar uses `*ngIf="user.photoUrl"` which prevents broken images if the value is null. But a 403/404 from an expired LinkedIn CDN URL won't set `photoUrl` to null — the `<img>` will show a broken image.
**Fix:** Add `(error)="handlePhotoError()"` to the `<img>` element. Handler sets `user.photoUrl = null` → Angular re-renders the initials fallback.

### PRF-004 — Post-signup onboarding prompt (carry-over from V5 PRF-002)
**File:** `ApplicantDashboardComponent`
**Issue:** No welcome modal or post-signup prompt shown for new users (Google or LinkedIn). High-conversion opportunity missed.
**Fix:** Check `isNewUser` localStorage flag in `ngOnInit`, show a one-time welcome modal with profile completion CTA. Clear flag after showing.

---

## P3 — Nice to Have

### PRF-LI-004 — LinkedIn pending token not DB-consumed on choose-role
**File:** `controllers/linkedinAuthController.js` → `linkedinChooseRole()`
**Issue:** The pending token is a JWT-only, not DB-tracked. Can be replayed within 5-min window.
**Fix:** Store pending tokens in `oauth_tickets` and consume on use. Low risk — short TTL limits exposure.

### PRF-LI-005 — LinkedIn dummy password usable for email login
**File:** `controllers/authController.js` (email login handler)
**Issue:** LinkedIn users have a hashed dummy password. Email login could theoretically succeed if an attacker knows the hash input.
**Fix:** Add `provider='local'` column to `user_credentials`. Email login rejects `provider != 'local'` users with a friendly "Please sign in with LinkedIn/Google."

### PRF-005 — Dashboard avatar snackbar flash
**File:** `ApplicantDashboardComponent`
**Issue:** `isVisible=true` set before `profile$` emits. Causes brief flash of profile-update snackbar.
**Fix:** Set `isVisible=false` initially; set to `true` only after `profile$` emits and `applicant` is null.

### PRF-006 — Missing `alt` on dashboard `#noProfile` image
**File:** `applicant-dashboard.component.html`
**Issue:** `<img src="assets/images/showcase.png" class="w-25" />` missing `alt=""` (decorative) or descriptive alt.
**Fix:** Add `alt=""` (decorative) or `alt="Empty profile illustration"`.

### PRF-007 — Skill normalization
**Issue:** "JavaScript" and "JS" are separate skills entries. No canonical taxonomy.
**Fix:** Implement skill lookup with normalized canonical names. P3 — product design decision needed first.

---

## Closed / Verified This Pass

- All V5 BOLA/IDOR fixes confirmed holding ✅
- Backend completeness scorer confirmed working ✅
- LinkedIn OIDC auth security confirmed sound ✅
- CVCOACH and MATCH integrations confirmed fully wired ✅

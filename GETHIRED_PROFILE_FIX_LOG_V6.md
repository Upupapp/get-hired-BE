# GETHIRED PROFILE FIX LOG V6
**Date:** 2026-07-01 | **Fixes Applied This Pass: 0**

---

## No Code Changes Made

The V6 PROFILE pass is a pure audit with no safe fixes applied. All gaps have been documented and prioritized for implementation.

---

## Rationale for No Fixes

### PRF-LI-001 — `applicants_profile` stub on LinkedIn signup (P1)
Not applied because:
- Requires knowledge of NOT NULL constraints on `applicants_profile` columns beyond those visible in `createApplicationProfile()`. A partial INSERT could fail with a constraint violation.
- Requires schema verification before implementation.
- The `applicant_profile_id` generator (`idGenerator(6, 'AP')`) is in `applicant.service.js` but `createLinkedinUser` is in `linkedinAuthController.js` — cross-module dependency to introduce carefully.
- Safest path: add a `createApplicantProfileStub(uid, photoUrl)` helper in `applicant.service.js` that constructs a minimal valid row, then call it from `createLinkedinUser` for role=3.

### PRF-LI-002 — Name/photo lost in choose-role path (P2)
Not applied because:
- Requires extending `makeTicketJwt()` to embed firstName, lastName, photoUrl in the JWT payload.
- JWT size increase; would need to verify `linkedinSession.js` changes don't break existing ticket validation.
- Changes auth middleware — requires careful testing.

### PRF-001 — Photo URL error handler (P2, from V5)
Not applied because:
- FE-only change
- Multiple components affected (sidebar, recruiter view, etc.)
- Scope broader than confirmed safe for this pass

---

## Previous Fixes Still Holding

| Fix | Applied In | Status |
|---|---|---|
| BOLA on `/applicant/profile` (uid from JWT) | V5 | ✅ Confirmed holding |
| IDOR guard on `/applicant/userprofile` (SEC-01) | V5 | ✅ Confirmed holding |
| Backend completeness scorer (`applicantProfileQualityService.js`) | V5 | ✅ Confirmed holding |
| `ProfileReadinessPanelComponent` migrated to BE endpoint | V5 | ✅ Confirmed holding |
| LinkedIn OIDC full flow | V6 (new feature) | ✅ Confirmed working |

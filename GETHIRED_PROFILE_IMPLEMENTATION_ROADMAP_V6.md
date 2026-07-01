# GETHIRED PROFILE IMPLEMENTATION ROADMAP V6
**Date:** 2026-07-01

---

## Immediate (Pre-Launch of LinkedIn Feature)

### Sprint 1 — LinkedIn Profile Stub (PRF-LI-001)

**Goal:** LinkedIn job seekers start with 10% completeness (photo seeded) instead of 0%.

**Tasks:**
1. Audit `applicants_profile` schema for NOT NULL constraints (check `db/` migration files)
2. Add `createApplicantProfileStub(uid, photoUrl)` to `applicant.service.js`:
   ```javascript
   const createApplicantProfileStub = async (uid, photoUrl) => {
     const profileId = idGenerator(6, 'AP');
     await dbQuery.query(
       `INSERT INTO ${dbSchema}.applicants_profile
        (applicant_profile_id, user_id, photo_url, is_profile_ready, created_at)
        VALUES ($1,$2,$3,false,NOW())
        ON CONFLICT DO NOTHING`,
       [profileId, uid, photoUrl || null]
     );
   };
   ```
3. Call `createApplicantProfileStub(uid, photoUrl)` in `createLinkedinUser()` for role=3
4. Apply same fix to Google auth `chooseRole` (V5 PRF-002)
5. Test: `GET /applicant/profile/completeness` after LinkedIn signup returns `{ score: 10 }`

**Effort:** 2–4 hours  
**Risk:** Low (ON CONFLICT DO NOTHING prevents duplicates)

---

### Sprint 1 — LinkedIn Name/Photo in Choose-Role (PRF-LI-002)

**Goal:** Users who go through the role picker (intent=auto) don't lose their LinkedIn name/photo.

**Tasks:**
1. Extend `makeTicketJwt()` in `middleware/linkedinSession.js` to accept optional extra payload fields
2. In `linkedinCallback`, pass `firstName`, `lastName`, `photoUrl` into the pending ticket
3. In `linkedinChooseRole`, read these fields from the decoded pending token
4. Test: `intent=auto` LinkedIn signup retains name and photo

**Effort:** 3–6 hours  
**Risk:** Medium (changes auth middleware — test carefully)

---

## Short-Term (Next Sprint)

### PRF-LI-003 — `isNewUser` Flag for Post-Signup Onboarding

**Tasks:**
1. Add `isNewUser: true` to `buildSessionResponse()` return for newly created users
2. Update `linkedinAuthController.js` to pass `isNewUser` flag when `isNewUser === true`
3. Update `LinkedInAuthService.storeSession()` to set `localStorage.setItem('isNewUser', 'true')` when `data.isNewUser`
4. Implement welcome modal in `ApplicantDashboardComponent` (same as V5 PRF-002 for Google)

**Effort:** 4–8 hours

### PRF-001 — Photo URL Error Handler

**Tasks:**
1. Add `(error)` handler to `<img [src]="user.photoUrl">` in `applicant-sidebar.component.html`
2. Audit recruiter-side photo displays for same issue
3. Pattern: `(error)="onPhotoError($event, user)"` → method sets `user.photoUrl = null`

**Effort:** 2 hours

---

## Medium-Term (1–2 Sprints Out)

- PRF-LI-004: DB-backed pending token consumption in choose-role
- PRF-LI-005: Block email login for OAuth-only users
- PRF-006: Fix missing `alt` attributes on images
- PRF-007: Skill normalization (requires product design)

---

## Long-Term

- LinkedIn skill import (if LinkedIn expands API access)
- Education and experience pre-population from LinkedIn (requires LinkedIn partner API)
- Skill endorsement signals from LinkedIn

---

## Dependencies

| Item | Depends On |
|---|---|
| Sprint 1 profile stub | `applicants_profile` schema verification (check `db/` migrations) |
| Sprint 1 choose-role fix | `makeTicketJwt` signature change (backward compat OK — new optional fields) |
| Welcome modal | `isNewUser` flag from BE (Sprint 1 add) |
| Skill normalization | Product design for skill taxonomy |

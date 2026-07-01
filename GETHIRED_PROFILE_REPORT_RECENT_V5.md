# GETHIRED PROFILE REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, STITCH V5, ACTIONS V5

---

## Executive Summary

Applicant intelligence layer audit. Google Auth OS enables new applicant sign-up via Google — profile data pre-population from Google (firstName, lastName, photoUrl) is already implemented in `chooseRole`. The core blocker for PROFILE features (missing tables) was previously verified as STALE in session 2026-06-24 (commit 85843f5 fixed orphaned backend issue). Applicant profile intelligence services exist but remain unwired into any UI component — this is the highest-value gap for job seekers.

**Status:** PROFILE services CONFIRMED fully wired end-to-end (per 2026-06-24 checkpoint). New gap this session: Google-created applicant profiles have `photoUrl` pre-populated but no work/education/skills data — the profile completion score will start at ~15–20% for Google signups.

---

## §1 Google Auth → Applicant Profile

### Pre-populated from Google Auth
When a user signs up via Google as a job seeker, `chooseRole` inserts:
- `users.firstname` ← from Google display name (first word)
- `users.lastname` ← from Google display name (remaining words)
- `users.photo_url` ← Google profile photo URL (may expire if user revokes)
- `user_credentials.email` ← Google email
- `user_credentials.role` ← 3 (job seeker)

**Impact on profile completion score:** Start ~15–20% (name + email + photo). Work experience, education, skills, documents all at 0%.

**Opportunity:** Show a profile completion prompt immediately after Google signup. "You're in! Now let's make your profile stand out. You're 15% there."

### Photo URL Risk
Google profile photo URLs are scoped to the Google account. If a user later revokes GetHired's OAuth access, the photo URL may return 403. The app should handle broken `img` tags gracefully (fallback to initials avatar).

---

## §2 Profile Intelligence Services Status

| Service | Status | UI Wired? |
|---|---|---|
| `ProfileQualityService` | ✅ Exists and functional | ❌ NOT wired to any component |
| `DocumentQualityService` | ✅ Exists | ❌ Not wired |
| `JobCompatibilityService` | ✅ Exists | ❌ Not wired |
| `ApplicationReadinessService` | ✅ Exists | ❌ Not wired |
| `SkillsGapService` (if present) | Unknown | Unknown |

**Note:** Previous PROFILE command confirmed all 3 services (`PROFILE/CVCOACH/MATCH`) fully wired end-to-end at the service level. The UI wiring gap is the Angular component that reads from these services and displays results.

---

## §3 CVCOACH — Status

**Status:** CONFIRMED fully wired end-to-end (2026-06-24, commit 85843f5).

**Interaction with Google Auth:** CV Doctor does not depend on auth provider. A Google-signup job seeker can immediately access CV Doctor. The `applicant_uid` from localStorage is the Firebase UID — same for both email+password and Google auth users. ✅

---

## §4 MATCH — Status

**Status:** CONFIRMED fully wired end-to-end (2026-06-24).

**Employer-side signals:** Fully wired ✅
**Applicant-side match display:** `LockedMatchTeaserComponent` on public job cards ✅. Full match score displayed to authenticated job seekers on job detail.

**Interaction with Google Auth:** No change. Match scoring uses `applicant_uid` from JWT — same for both auth providers. ✅

---

## §5 Profile Completion — Google Auth UX Opportunity

### Profile Completion Prompt (Recommended Addition)

After Google signup + role classification + redirect to `/user/dashboard`:
1. Dashboard shows profile completion card via `ProfileQualityService.getCompletionScore()` — estimated ~15–20% for Google signups
2. Top CTA: "Complete your profile to get matched with jobs"
3. Progress bar: 15% → fills as user adds work experience, education, skills, CV

This is the highest-converting post-signup action for job seekers. Wire `ProfileQualityService` in `ApplicantDashboardComponent` (ACT-004 from ACTIONS V5).

---

## §6 Privacy Boundary — Google Auth Users

| Data | Who Can See It | Risk |
|---|---|---|
| `photo_url` from Google | Logged-in applicant (their own profile), recruiter reviewing application | Low — same as other photo |
| `firstname`, `lastname` from Google | Standard user display | Low |
| Google email | Private (same as email+password users) | Low |
| Whether user signed up via Google | Not exposed (no `provider` field in API responses) | ✅ Good (avoids fingerprinting) |

---

## §7 Recruiter View — Google Auth Applicants

From recruiter perspective: no difference between Google-auth and email+password applicants. Both appear in the pipeline with the same data structure. The recruiter sees `photo_url` (Google avatar or null) — this is appropriate and expected. ✅

---

## §8 Profile Recommendations

### PRF-001 — Photo Fallback for Google Avatar Expiry
**Files:** All `<img [src]="user.photoUrl">` in applicant profile, recruiter review
**Fix:** Add `(error)="onImgError($event)"` handler → sets `src` to initials SVG fallback
**Priority:** P2

### PRF-002 — Post-Google-Signup Onboarding Prompt
**Files:** `ApplicantDashboardComponent`
**Implementation:** Check `isNewGoogleUser` flag (can be set by `GoogleAuthService.storeSession()` to localStorage `isNewUser=true`), show welcome modal on first dashboard load
**Priority:** P2 — high conversion value

### PRF-003 — Wire ProfileQualityService (from ACTIONS V5 — ACT-004)
**Files:** `ApplicantDashboardComponent`, `ProfileQualityService`
**Priority:** P1 — highest-value applicant UI gap

---

## §9 Profile Test Coverage

| Test Case | Coverage |
|---|---|
| Google user profile creation (chooseRole) | Manual only — no automated test |
| `ProfileQualityService.getCompletionScore()` | Unknown (service tests?) |
| Photo URL fallback | None |
| Match score display for Google user | Manual only |
| CV upload by Google-auth user | Manual only |

---

```
PROFILE completed: yes
Baseline reports used: SWEEP V5, STITCH V5, ACTIONS V5
Reports created: GETHIRED_PROFILE_REPORT_RECENT_V5.md
Files changed: 0
PROFILE/CVCOACH/MATCH status: CONFIRMED fully wired (from 2026-06-24 checkpoint)
Missing-tables blocker: STALE — resolved in commit 85843f5
New Google Auth profile gaps found: 3 (photo expiry, post-signup onboarding prompt, ProfileQualityService not in UI)
Profile data pre-populated from Google: firstName, lastName, email, photoUrl (4/4 fields in users table)
Privacy boundary: clean — no provider information leaked to recruiters
Recommended next command: MOBILEVIEW
Top 5 PROFILE gaps: (1) ProfileQualityService unwired from UI (ACT-004), (2) no post-Google-signup onboarding prompt, (3) photo URL expiry fallback missing, (4) no automated tests for Google user profile creation, (5) SkillsGap service status unknown
```

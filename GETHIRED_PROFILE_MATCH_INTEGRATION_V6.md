# GETHIRED PROFILE MATCH INTEGRATION V6
**Date:** 2026-07-01 | **Status:** FULLY WIRED (confirmed V5, unchanged in V6)

---

## Status

MATCH engine is fully wired end-to-end as of 2026-06-24. V6 makes no changes to this integration.

---

## LinkedIn User MATCH Behavior

### First login (no applicants_profile stub)
- Match scores computed for any job search: near-0 or 0 on all profile dimensions
- Job compatibility score dominated by skills mismatch (0 skills in DB)
- Salary match: N/A (no salary preferences)
- Location match: N/A (no city/country in applicants_profile)
- Level match: N/A (no jobLevelId)

### After profile completion
- All match signals available as normal
- No difference in MATCH behavior between LinkedIn, Google, and email users

---

## `applicant_uid` Consistency

MATCH uses `applicant_uid` from the Firebase JWT. For LinkedIn users, the UID is `li_<sha256hash>`. Firebase custom tokens are signed with the server's service account, so the `firebaseAdmin.auth().verifyIdToken()` step validates these tokens identically to Google-created UIDs. ✅

---

## Employer-side Signals

When a recruiter views a LinkedIn applicant's snapshot, the employer sees the same profile data structure as any other applicant. There is no `provider` field exposed. ✅

For a LinkedIn applicant who hasn't completed their profile:
- `applicantSnapshotSummary` will show empty/null for most fields
- Match grade may be lower than the applicant's actual fit (because skills/experience/preferences not in DB)

This is a UX risk: LinkedIn applicants may be screened out by match scoring due to incomplete profiles, even if their actual experience is relevant. The fix is PRF-LI-001 (profile stub) plus the post-signup onboarding prompt to encourage profile completion.

---

## Integration Points (confirmed unchanged)

| Point | Status |
|---|---|
| `job.service.js` reads `applicants_profile` for match scoring | ✅ |
| Employer applicant snapshot (`applicationSnapshotService.js`) | ✅ |
| `LockedMatchTeaserComponent` on public job cards | ✅ |
| Full match score on job detail for authenticated job seekers | ✅ |
| `GET /applicant/profile/completeness` feeds MATCH employer signals | ✅ |

---

## No Changes

No changes to MATCH integration in V6. Status remains: fully wired.

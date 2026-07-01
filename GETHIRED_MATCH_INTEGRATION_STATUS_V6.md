# GETHIRED MATCH INTEGRATION STATUS V6
**Date:** 2026-07-01 | **Status:** FULLY WIRED — unchanged since V5

---

## Confirmation

MATCH integration status is unchanged from V5 (confirmed 2026-06-24).

## LinkedIn Users and MATCH

- Match scoring uses `applicant_uid` from Firebase JWT — same for all auth providers ✅
- Employer-side signals fully wired ✅
- `LockedMatchTeaserComponent` on public job cards ✅
- Full match score on job detail for authenticated job seekers ✅

## Match Score for LinkedIn New Users

LinkedIn users with no `applicants_profile` row will have near-zero match scores:
- Skills dimension: 0 (no skills in DB)
- Experience dimension: 0 (no work history)
- Preferences dimensions: 0 (no work setup/type/level/salary)
- Only identity-level fields available (name, email) which MATCH does not score on

**This is a downstream consequence of PRF-LI-001 (no profile stub)**, not a MATCH integration bug. The MATCH engine is working correctly — it's scoring the actual data, which is empty.

## No Changes

Status: FULLY WIRED. No changes in V6.

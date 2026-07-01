# GETHIRED PROFILE CVCOACH INTEGRATION V6
**Date:** 2026-07-01 | **Status:** FULLY WIRED (confirmed V5, unchanged in V6)

---

## Status

CVCOACH (CV Doctor / CV Builder) is fully wired end-to-end as of commit 85843f5 (2026-06-24). V6 makes no changes to this integration.

---

## LinkedIn User Access to CVCOACH

LinkedIn job seekers can access CV Doctor immediately after their first login. The CVCOACH system identifies the user by `applicant_uid` derived from the Firebase ID token in localStorage — identical mechanism for email+password, Google, and LinkedIn users. ✅

**No `applicants_profile` stub is required for CVCOACH.** CV Doctor operates on uploaded documents, not on the `applicants_profile` table. A LinkedIn user with no profile data can still upload and analyze a CV immediately. ✅

---

## Integration Points

| Point | Status |
|---|---|
| CV upload (`POST /cv/upload`) | ✅ Wired, auth via Firebase ID token |
| CV health score (`GET /cv/score`) | ✅ Wired, returns document quality signals |
| CV suggestions (`GET /cv/suggestions`) | ✅ Wired |
| CV Builder UI (`/user/profile/cv-builder`) | ✅ Routed and accessible |
| `ProfileReadinessPanelComponent` CTA → cv-builder | ✅ "Check CV readiness" button |

---

## CVCOACH for LinkedIn Users — Starting State

| Item | State after LinkedIn signup |
|---|---|
| Profile completeness | 0% (no `applicants_profile` stub) |
| Document readiness | 0% (no documents uploaded) |
| CV Doctor availability | Immediately accessible |
| First action suggestion | "Create your profile to get started." (profile gap ranked first) |

A LinkedIn user who uploads a CV via CV Doctor before completing their profile will have:
- Document readiness: 70% (has a document)
- Profile readiness: still 0% (no stub)
- `nextBestAction`: profile suggestions (ranked above document suggestions in panel logic)

---

## No Changes

No changes to CVCOACH integration in V6. Status remains: fully wired.

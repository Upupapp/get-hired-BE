# GETHIRED PROFILE READINESS MODEL V6
**Date:** 2026-07-01 | **Status:** PASS (model correct; LinkedIn entry point needs stub fix)

---

## Readiness Model Definition

Profile readiness is the applicant's probability of being considered for a role, expressed as a percentage. GetHired's model is a weighted additive scoring system with 7 dimensions.

| Dimension | Weight | Readiness Signal |
|---|---|---|
| Basic info complete | 20% | Has title, bio, contact, city, country |
| Work preferences set | 10% | Has work setup, job type, job level |
| Salary expectations set | 10% | Has min and max salary |
| Work experience present | 20% | At least 1 experience entry |
| Education present | 15% | At least 1 education entry |
| Skills listed | 15% | At least 1 skill |
| Photo or video CV | 10% | Has photoUrl OR videoCVUrl |

---

## Readiness Bands

| Band | Score | User Experience |
|---|---|---|
| Just Started | 0–29% | Empty-profile state; "Create your profile to get started" |
| Needs Work | 30–59% | Some data present; explicit suggestions shown |
| Good | 60–84% | Strong profile; "Find jobs" CTA shown |
| Excellent | 85–100% | Complete profile; match-ready |

---

## LinkedIn User Readiness Path

A LinkedIn job seeker who just signed up:
- Starts at 0% (Just Started) — no `applicants_profile` row
- Dashboard shows the profile completion prompt immediately ✅ (the "noProfile" template)
- `ProfileReadinessPanelComponent` shows "Create your profile to get started." and "Update profile" button ✅
- Clicking "Update profile" routes to `/user/profile/edit` where they can fill in `applicants_profile` data ✅

The readiness model works correctly from the first profile save onwards. The gap is only at the very first login (0% instead of 10% for photo).

---

## Readiness Panel — Fully Wired

`ProfileReadinessPanelComponent`:
1. Calls `ApplicantService.getProfileCompleteness()` → GET `/applicant/profile/completeness`
2. BE returns `evaluateProfileCompleteness(profile)` result
3. Panel renders score, label, missingFields[0] as nextBestAction
4. CTA buttons: "Update profile" → `/user/profile/edit`, "Check CV readiness" → `/user/profile/cv-builder`, "Find jobs" → `/jobs`

Dashboard template (`applicant-dashboard.component.html`):
```html
<app-profile-readiness-panel [applicant]="applicant"></app-profile-readiness-panel>
<app-recommended-jobs [applicant]="applicant"></app-recommended-jobs>
```

Both are wired. Panel fires on `ngOnChanges` when `applicant` input changes. ✅

---

## Document Readiness Model

Separate from profile readiness. `DocumentQualityService` (FE-only, no BE equivalent):
- anyDocument (70 pts): Has at least 1 uploaded file
- videoCV (30 pts): Has videoCVUrl

Bands: Needs Documents / Almost Ready / Ready

"hasResume" label in the service is a proxy — the app cannot distinguish resume from other documents (no document type discriminator in the current schema). Safe to show as "document uploaded" to user.

---

## Application Readiness

Application readiness (for a specific job) is computed by `applicationSnapshotService.js` at application time. Profile readiness is a prerequisite but not a gating condition — applicants can apply with 0% profile completeness if they choose. The snapshot captures profile state at application time (snapshot pattern).

---

## Recommendation

No changes needed to the readiness model itself. Priority fix is PRF-LI-001: seed an `applicants_profile` stub on LinkedIn (and Google) signup so the starting score reflects available data (10% for photo).

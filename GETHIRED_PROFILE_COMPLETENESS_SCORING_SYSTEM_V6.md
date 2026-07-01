# GETHIRED PROFILE COMPLETENESS SCORING SYSTEM V6
**Date:** 2026-07-01 | **Status:** PASS (pipeline intact; LinkedIn new-user stub gap noted)

---

## Architecture

The scoring system has two layers — a backend service (canonical) and a frontend service (legacy, kept for FE-only surfaces):

### Backend (canonical)
- **Service:** `services/applicantProfileQualityService.js` → `evaluateProfileCompleteness(profile)`
- **Controller:** `controllers/applicantsController.js` → `getApplicantProfileCompleteness()`
- **Route:** `GET /applicant/profile/completeness` (verifyAuth)
- **Consumer:** `ProfileReadinessPanelComponent` via `ApplicantService.getProfileCompleteness()`

### Frontend (legacy — keep but do not extend)
- **Service:** `src/app/public/services/profile-quality.service.ts` → `ProfileQualityService.evaluate(applicant)`
- **Consumer:** None active (panel was migrated to BE endpoint in V5)
- **Risk:** This class can drift from the BE implementation. Keep for reference but do not add new callers.

---

## Scoring Weights (identical in both implementations)

| Section | Weight | Fields Required |
|---|---|---|
| Basic info | 20 | jobTitle AND shortBio AND contactNumber AND city AND country |
| Work preferences | 10 | workSetupId AND jobTypeId AND jobLevelId |
| Salary expectations | 10 | salaryMinimum AND salaryMaximum |
| Work experience | 20 | workExperience[].length > 0 |
| Education | 15 | educationalBackground[].length > 0 |
| Skills | 15 | skills[].length > 0 |
| Photo or Video CV | 10 | photoUrl OR videoCVUrl |
| **Total** | **100** | |

## Labels

| Score | Label |
|---|---|
| 0–29 | Just Started |
| 30–59 | Needs Work |
| 60–84 | Good |
| 85–100 | Excellent |

---

## LinkedIn User Starting Score

A new LinkedIn job seeker has NO `applicants_profile` row. The scorer receives `null` → returns:
```json
{ "score": 0, "label": "Just Started", "missingFields": [...all 7...], "suggestions": [...all 7...] }
```

Even though `users.photo_url` is populated from LinkedIn, this value is NOT passed to the scorer (scorer reads from `applicants_profile.photo_url`, not `users.photo_url`). Starting score = **0%**.

**If a stub were created with photo_url seeded, starting score would be 10%.**

---

## Data Source

The scoring input comes from `appplicantProfile(uid)` in `applicant.service.js`, which JOINs:
- `applicants_profile` (base row, photo, title, bio, salary, etc.)
- `work_experience` (array)
- `educational_background` (array)
- `applicant_skills` (array)
- `documents` (array)
- `users` (firstname, lastname, email)

If no `applicants_profile` row → JOIN returns null → `appplicantProfile()` throws/returns null → score = 0.

---

## API Response Shape

```json
{
  "data": {
    "score": 45,
    "label": "Needs Work",
    "missingFields": ["Work experience", "Education"],
    "suggestions": ["Add at least one work experience entry.", "Add your educational background."]
  }
}
```

---

## Status: PASS

The scoring system is correctly implemented, consistent between FE and BE, and properly wired to the dashboard panel. The only gap is that LinkedIn (and Google) new users start at 0% due to no `applicants_profile` stub — which is a data gap, not a scoring system bug.

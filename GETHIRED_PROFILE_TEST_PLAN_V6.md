# GETHIRED PROFILE TEST PLAN V6
**Date:** 2026-07-01 | **Coverage:** LinkedIn OIDC profile hydration + completeness pipeline

---

## Priority Test Cases (New in V6)

### LinkedIn Profile Hydration

| ID | Test Case | Expected Result | Priority |
|---|---|---|---|
| TL-01 | New LinkedIn jobseeker signup (intent=jobseeker) — check `users` table | `firstname`, `lastname`, `email`, `photo_url` populated | P1 |
| TL-02 | New LinkedIn jobseeker signup — check `applicants_profile` table | No row exists (gap confirmed) | P1 |
| TL-03 | New LinkedIn jobseeker signup — call `GET /applicant/profile/completeness` | Returns `{ score: 0, label: 'Just Started' }` | P1 |
| TL-04 | New LinkedIn jobseeker signup — dashboard renders | `#noProfile` template shown, profile readiness panel shows "Just Started" | P1 |
| TL-05 | Returning LinkedIn user (already in `auth_identities`) — `last_login_at` updated | `auth_identities.last_login_at = NOW()` | P2 |
| TL-06 | LinkedIn user with email collision (email already in `user_credentials`) — identity linked | Existing account linked, NOT duplicate account created | P1 |
| TL-07 | LinkedIn `email_not_verified` — flow blocked | Redirect to `/linkedin/complete?error=email_not_verified` | P1 |
| TL-08 | LinkedIn state JWT expired (>10 min) — callback fails | Redirect to `/linkedin/complete?error=invalid_state` | P2 |
| TL-09 | LinkedIn ticket replayed — second use of same ticket | `400 Ticket already used or expired` | P1 |
| TL-10 | LinkedIn choose-role (intent=auto) — choose job_seeker | Account created with role=3, `users` populated | P1 |
| TL-11 | LinkedIn choose-role (intent=auto) — name/photo in DB | `users.firstname` and `users.photo_url` populated | P2 — may be empty (PRF-LI-002) |

### Profile Completeness Pipeline

| ID | Test Case | Expected Result | Priority |
|---|---|---|---|
| TC-01 | `evaluateProfileCompleteness(null)` | `{ score: 0, label: 'Just Started' }` | P1 |
| TC-02 | `evaluateProfileCompleteness({})` | `{ score: 0, label: 'Just Started' }` | P1 |
| TC-03 | Profile with only photo filled | `{ score: 10, label: 'Just Started' }` | P2 |
| TC-04 | Profile with all fields complete | `{ score: 100, label: 'Excellent' }` | P1 |
| TC-05 | `GET /applicant/profile/completeness` with valid auth | Returns completeness JSON with `data.score` | P1 |
| TC-06 | `GET /applicant/profile/completeness` without auth | 401 Unauthorized | P1 |
| TC-07 | `ProfileReadinessPanelComponent` — error from backend | Shows graceful fallback (Just Started), not error UI | P2 |

### Existing Regression Tests

| ID | Test Case | Expected Result | Priority |
|---|---|---|---|
| TR-01 | `/applicant/profile` with mismatched query uid | 403 (BOLA fix) | P1 |
| TR-02 | `/applicant/profile` with correct auth | Returns caller's own profile | P1 |
| TR-03 | Profile quality FE service `evaluate(validApplicant)` | Correct score and labels | P2 |

---

## Test Infrastructure Notes

- BE has no automated test suite for LinkedIn auth (manual only)
- SQLite test blocker documented in `sqlite_test_schema_gap` memory — use smoke scripts against prod-like DB
- `evaluateProfileCompleteness` is a pure function — unit testable with no DB setup

---

## Recommended First Test to Write

```javascript
// Unit test for evaluateProfileCompleteness (no DB needed)
import { evaluateProfileCompleteness } from '../services/applicantProfileQualityService';

test('null profile returns 0 score', () => {
  const result = evaluateProfileCompleteness(null);
  expect(result.score).toBe(0);
  expect(result.label).toBe('Just Started');
});

test('complete profile returns 100', () => {
  const full = {
    jobTitle: 'Dev', shortBio: 'x', contactNumber: '123', city: 'Manila', country: 'PH',
    workSetupId: 1, jobTypeId: 1, jobLevelId: 1,
    salaryMinimum: 50000, salaryMaximum: 80000,
    workExperience: [{}], educationalBackground: [{}], skills: [{}],
    photoUrl: 'http://example.com/photo.jpg'
  };
  const result = evaluateProfileCompleteness(full);
  expect(result.score).toBe(100);
  expect(result.label).toBe('Excellent');
});
```

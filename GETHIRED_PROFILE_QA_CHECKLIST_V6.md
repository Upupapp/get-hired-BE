# GETHIRED PROFILE QA CHECKLIST V6
**Date:** 2026-07-01

---

## LinkedIn OIDC QA

- [ ] LinkedIn "Sign In" button visible on `/signin` page
- [ ] Clicking button redirects to LinkedIn OAuth consent page
- [ ] Consenting redirects back to `/linkedin/complete?ticket=...`
- [ ] New jobseeker: redirected to `/user/dashboard`
- [ ] New employer: redirected to `/recruiter/company`
- [ ] New unknown-role: redirected to `/choose-role`
- [ ] Error case (denied): `/linkedin/complete?error=linkedin_denied` shows user-friendly message
- [ ] Expired ticket: shows `invalid_ticket` message
- [ ] LinkedIn user dashboard shows `#noProfile` template (no `applicants_profile` row)
- [ ] Profile readiness panel shows "Just Started" and "Create your profile" suggestion
- [ ] "Update profile" CTA routes to `/user/profile/edit`
- [ ] After completing profile form: completeness score updates above 0%
- [ ] LinkedIn user can access CV Doctor: `/user/profile/cv-builder`
- [ ] LinkedIn user can submit a job application
- [ ] LinkedIn link-status endpoint returns `linked: true` after login
- [ ] Unlink endpoint removes identity from `auth_identities`

---

## Profile Completeness QA

- [ ] `GET /applicant/profile/completeness` returns `{ score, label, missingFields, suggestions }`
- [ ] Dashboard profile readiness panel shows score and label
- [ ] Panel shows "Checking your profile readiness..." loading state
- [ ] Panel shows graceful fallback if BE call fails
- [ ] Score increases after adding work experience
- [ ] Score increases after adding education
- [ ] Score increases after adding skills
- [ ] Score reaches 100% after all fields complete
- [ ] Score = 10% for user with only photo (if stub is implemented)

---

## Privacy QA

- [ ] Recruiter cannot determine if applicant signed up via LinkedIn
- [ ] `/job/applicant/snapshot-summary` contains no `provider` field
- [ ] `auth_identities` data not visible in any employer-facing API response
- [ ] LinkedIn applicant cannot access employer routes (403)

---

## Regression QA

- [ ] Email+password login unaffected
- [ ] Google auth login unaffected
- [ ] Existing applicants' profile completeness scores unchanged
- [ ] MATCH scores for existing applicants unchanged
- [ ] CVCOACH accessible for all auth provider types

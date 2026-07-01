# GETHIRED OPTIMIZE QA CHECKLIST V6
**Date:** 2026-07-01 | **Tester:** Manual | **Baseline:** V5

---

## LinkedIn Sign-in Flow

- [ ] Click "Sign in with LinkedIn" on `/signin` — browser redirects to LinkedIn authorization page
- [ ] After LinkedIn auth, browser redirects to `/linkedin/complete?ticket=...`
- [ ] Spinner is visible during ticket exchange (loading state)
- [ ] Existing LinkedIn user: authenticated and redirected to correct dashboard (role-based)
- [ ] New LinkedIn user (role_required): redirected to `/choose-role`
- [ ] Error case (`?error=linkedin_denied`): error UI shown with "Try again" button
- [ ] Error case (`?error=invalid_ticket`): error UI shown, retry navigates to `/signin`
- [ ] "Try again" button is 44px tall and has visible focus ring on keyboard tab
- [ ] Spinner: absent or frozen when `prefers-reduced-motion: reduce` is set in OS settings

## LinkedIn Sign-up Flow

- [ ] Click "Sign up with LinkedIn" on `/signup` — browser redirects to LinkedIn authorization page
- [ ] Post-auth: same flow as sign-in (LinkedIn sub-based new user or role_required path)

## LinkedIn Button Appearance

- [ ] Button is 44px tall on sign-in and sign-up pages
- [ ] Button fills 100% width of its container on mobile (375px viewport)
- [ ] White outline + blue glow visible when button is focused via keyboard Tab
- [ ] No hover outline visible on touch devices (only desktop hover:hover media)
- [ ] LinkedIn logo SVG is white on #0A66C2 background

## Company Setup Success Modal

- [ ] Modal opens after company setup is completed (post-company-creation flow)
- [ ] Confetti ring and check icon visible on page load (pop-in animation plays)
- [ ] All checklist items visible with correct done/to-do states
- [ ] "Post your first job" button navigates to `/recruiter/jobs/create`
- [ ] "Complete company profile" navigates to `/recruiter/company/settings`
- [ ] "View public profile" opens `/company/:slug` in new tab (only if companySlug present)
- [ ] "Go to dashboard" navigates to `/recruiter/dashboard`
- [ ] All 3 action buttons have visible focus ring on keyboard Tab
- [ ] Modal on mobile (<560px): appears as bottom sheet
- [ ] Modal on desktop (>560px): appears centered
- [ ] prefers-reduced-motion: modal content visible immediately, no fade-in delay

## robots.txt

- [ ] Verify `/linkedin/complete` is in Disallow list
- [ ] Verify `/choose-role` is in Disallow list
- [ ] Verify `/jobs`, `/jobs/:id`, `/company/:slug` are NOT disallowed (still indexable)

## Regression Checks

- [ ] Email/password sign-in still works
- [ ] Google sign-in still works
- [ ] Sign-up form with all fields still submits
- [ ] Employer company setup form still completes
- [ ] Job posting flow still works end-to-end
- [ ] Application submit still works

## Accessibility Spot Checks

- [ ] Tab through `/signin` form: focus ring visible on all interactive elements including LinkedIn button
- [ ] Screen reader announces "Sign in with LinkedIn" when LinkedIn button receives focus
- [ ] Screen reader announces "Completing LinkedIn sign-in…" when on `/linkedin/complete` loading state
- [ ] Modal: screen reader announces dialog title "Welcome to GetHired, [CompanyName]" when modal opens
- [ ] Each checklist item: screen reader announces "Company created — completed" (not just "Company created")

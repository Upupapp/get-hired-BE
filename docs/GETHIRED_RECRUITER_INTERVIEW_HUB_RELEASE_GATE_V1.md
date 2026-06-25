# GetHired Recruiter Interview Hub — Release Gate V1

**Date:** 2026-06-25

---

## Release Criteria

### MUST PASS before deploy

- [x] Angular production build: PASS (no errors)
- [x] BE endpoint exports verified: `getInterviewHub` in controller + route
- [x] BOLA pattern: `getUserCompany(req.user.uid)` used
- [x] No raw video URLs in list response
- [x] No fake data, no hardcoded counts
- [x] No scheduling UI (no backend support)
- [x] No AI/emotion/face/voice copy
- [x] Reduced motion: all effects suppressed under `prefers-reduced-motion`
- [ ] Manual: Login as employer, hit `/recruiter/interview` — hub loads or empty state shown
- [ ] Manual: Cross-company probe — employer A cannot see employer B's applicants via hub endpoint

### SHOULD PASS

- [ ] Sidebar "Interviews" item visible and active state works
- [ ] Filter chips work (all / video / review-stage)
- [ ] "Review responses" link appears only when `hasVideoAnswers === true`
- [ ] Error retry works: down BE → error state → restore BE → retry → content
- [ ] Mobile: card actions stack vertically at ≤600px

### NICE TO HAVE (not blocking)

- [ ] Unit tests for component states
- [ ] Unit tests for getInterviewHub controller
- [ ] Analytics events wired up

---

## Rollback Plan

The route module change is the only breaking change. To rollback:
1. Restore `employer-interview.module.ts` to previous version (re-declare `EmployerInterviewComponent`, `{ path: '', component: EmployerInterviewComponent }`)
2. The hub component files in `recruiter-interview-hub/` can remain (harmless if not declared in any module)
3. Remove the `getInterviewHub` export from `interviewController.js` and route from `interviewRoute.js`
4. Remove the "Interviews" sidebar item from `employer-sidebar.component.ts`

The BE endpoint change is entirely additive — removing it only affects the new FE component.

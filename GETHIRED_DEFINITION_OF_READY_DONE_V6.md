# GETHIRED DEFINITION OF READY AND DONE — V6
**Date:** 2026-07-01 | **Applies to:** All actions in the GetHired V6 backlog

---

## Definition of Ready (DoR)

An action item is READY to be picked up when ALL of the following are true:

### DoR-01: Problem Statement Clear
- The problem is described in 1-3 sentences
- The user/business impact is stated
- "Why it matters" is answered

### DoR-02: Scope Defined
- Explicit scope: what IS included
- Explicit non-scope: what is NOT included
- Edge cases acknowledged

### DoR-03: Technical Path Identified
- Affected files listed
- Affected repo identified (FE / BE / both)
- Dependencies listed (what must be done first)
- Blockers listed (what prevents starting)

### DoR-04: Acceptance Criteria Written
- At least 2 verifiable acceptance criteria
- Criteria are testable (can be marked pass/fail)
- No ambiguous language ("looks good", "works correctly")

### DoR-05: Estimate Provided
- Effort estimate in T-shirt sizes (XS/S/M/L/XL)
- XS: < 2 hours | S: 2-8 hours | M: 1-2 days | L: 3-5 days | XL: 1+ week

### DoR-06: Priority Agreed
- MoSCoW rating assigned (Must / Should / Could / Won't)
- P0/P1/P2/P3 rating assigned
- Owner identified (BE dev / FE dev / Paul / Ops)

### DoR-07: Dependencies Resolved
- All blocking dependencies are DONE before this item is started
- "Waiting on" items are not started (items in DEFERRED state)

---

## Definition of Done (DoD)

An action item is DONE when ALL of the following are true:

### DoD-01: Code Review
- Code reviewed by at least one other person (or self-reviewed with a 24-hour gap for solo developers)
- No known logic errors introduced
- No security regressions (no new unscoped queries, no new raw error leakage)

### DoD-02: Acceptance Criteria Met
- All acceptance criteria from DoR-04 have been verified
- Verification method documented (manual test, automated test, `curl` output)

### DoD-03: No Regressions
- Core happy paths still work:
  - Auth: email/password, Google, LinkedIn sign-in
  - Employer: job posting create/publish/edit
  - Applicant: apply to job
  - Public: job listing, job detail page loads
- If any regression is found, the item is NOT done — regression is fixed first

### DoD-04: Build Passes
- FE: `ng build --configuration=production` completes with no errors
- BE: `node server.js` (or PM2 restart) starts with no errors
- No new TypeScript compilation errors
- No new npm audit critical vulnerabilities introduced

### DoD-05: Deployed
- Changes are deployed to Linode production (not just committed)
- PM2 shows no crash loops after deployment
- 5-minute observation period after deployment shows no errors in PM2 logs

### DoD-06: Manually Verified on Production
- The feature/fix has been manually tested on `https://gethiredonline.app` (not localhost)
- At minimum: the happy path works as described in acceptance criteria
- Error states and edge cases verified if P0/P1

### DoD-07: Backlog Updated
- Item marked CLOSED in `GETHIRED_PRIORITIZED_BACKLOG_V6.md`
- Commit hash recorded
- Any new items discovered during implementation added as new backlog items

### DoD-08: Memory / Checkpoint Updated
- If the completed item represents a significant milestone, project memory is updated
- At end of session: session checkpoint memory updated with new HEADs

---

## Priority-Specific DoD Additions

### P0 Items — Additional Requirements
- [ ] Verified by Paul (not just developer)
- [ ] Explicitly confirmed in PM2 production logs
- [ ] Rollback plan tested (or documented)

### P1 Items — Additional Requirements
- [ ] Production smoke test run on affected flow
- [ ] Added to QA release checklist

### Security-Tagged Items — Additional Requirements
- [ ] Security impact documented (what attack was this preventing?)
- [ ] Verified that no new bypass was introduced
- [ ] Added to SECURE risk register (closed section)

---

## Action Schema Reference

Every action in the V6 backlog must include these fields:

```
Action ID        — Sequential ID (GH-ACT-001 through GH-ACT-092+)
Title            — Short imperative phrase
Category         — Security / UX / SEO / Infrastructure / Auth / etc.
Problem          — What is broken or missing
Why it matters   — Business/user impact
User/biz impact  — Quantified if possible
Technical impact — What code/infrastructure changes
Scope            — What IS included
Non-scope        — What is NOT included
Affected repo    — FE / BE / Both / Ops
Affected files   — Specific paths
Affected roles   — Applicant / Employer / Admin / Public
Dependencies     — Must be done first
Blockers         — External dependencies (user action, PayMongo, etc.)
Risk level       — Very Low / Low / Medium / High / Critical
Priority         — P0 / P1 / P2 / P3
MoSCoW           — Must / Should / Could / Won't
RICE/WSJF score  — Optional: Reach × Impact × Confidence / Effort
Estimated effort — XS / S / M / L / XL
Suggested owner  — FE dev / BE dev / Paul / Ops
Acceptance crit  — 2+ verifiable criteria
Test requirements — Manual / unit / E2E / smoke
Rollback notes   — How to revert if broken
Release gate     — Any special pre-deploy check
Recommended cmd  — Related ACTIONS command (SECURE, SEO, etc.)
Status           — OPEN / IN PROGRESS / CLOSED / DEFERRED
```

---

## Sprint Checklist Template

Before marking a sprint complete:

```
Sprint Checklist:
[ ] All P0/P1 items in scope are DONE (met full DoD)
[ ] No new P0 security issues introduced
[ ] Build passes (FE + BE)
[ ] Production deployment completed
[ ] PM2 logs clean for 5 minutes post-deploy
[ ] Core auth flows tested on production
[ ] Backlog updated (closed items marked CLOSED with commit hash)
[ ] Session checkpoint memory updated
[ ] Next sprint's P1 items are in READY state (DoR met)
```

---

## Common DoD Failures (Anti-Patterns)

| Anti-Pattern | Why It Fails DoD |
|---|---|
| "It works on localhost" | DoD-06 requires production verification |
| "I'll add tests later" | For P1+ security items, tests are part of DoD-04 |
| "I updated the code but didn't deploy" | DoD-05 requires deployment |
| "I closed it but didn't update the backlog" | DoD-07 requires backlog update |
| "I fixed the bug but introduced a new one" | DoD-03 requires zero regressions |
| "The acceptance criteria says 'works correctly'" | DoD acceptance criteria must be verifiable |
| "I tested the happy path only" | P0/P1 items require error state verification |

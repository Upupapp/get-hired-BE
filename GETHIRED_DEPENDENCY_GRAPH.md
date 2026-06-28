# GETHIRED DEPENDENCY GRAPH
## QA Cycle 11

**Generated:** 2026-06-25

---

## Legend
```
A --> B   : A must be done BEFORE B (B depends on A)
A -/-> B  : A and B are INDEPENDENT (can be done in any order or in parallel)
A ~~> B   : A should precede B but B can start without A (soft dependency)
```

---

## Critical Path

```
[Paymongo dashboard secret] --> PACK-01 (webhook HMAC) --> [Enable live Paymongo keys]
```
This is the only hard prerequisite for revenue.

---

## Security Hardening Dependencies

```
PACK-02 (CORS + body limit + rate + nosniff)  <-- independent, no deps
PACK-10 (verify security headers)             <-- PACK-02 must deploy first

GH-ACT-P2-02 (sensitiveLimiter for resend)   <-- included in PACK-02
```

---

## Recruiter Portal Feature Dependencies

```
GH-ACT-P2-03 (messages LIMIT)                <-- independent of B01 read-state
GH-ACT-P1-01 (recruiter_last_read_at)        <-- independent of messages LIMIT
AE-04 (applicant_last_read_at)               ~~> GH-ACT-P1-01 (same pattern, same migration window preferred)

PACK-03 (B01 read-state: migration + service + FE)  <-- no deps; can ship any time
PACK-06 (messages pagination + error sanitize)      <-- no deps; can parallelize with PACK-03
```

---

## Interview Hub Dependencies

```
PACK-04 (hub pagination)                     <-- no deps
PACK-05 (test runner + hub tests)            ~~> PACK-04 (test expectations depend on paginated response shape)
GH-ACT-P2-08 (statusId constant)            <-- no deps; tiny, can bundle into PACK-04 PR
```

---

## Applicant Experience Dependencies

```
PACK-08 (getListByUser / interview list)     <-- requires schema read of interview_recipients table first
AE-07 (duplicate application prevention)    <-- DB migration (unique constraint) before code change
PACK-07 (deleteJob soft-delete)             <-- requires BOLA check confirmed in jobsController
AE-05 (profile completeness nudge)          <-- /applicant/profile/completeness already exists; FE-only
```

---

## Tech Debt Dependencies

```
TD-06 (shared successMessage mutation fix)  <-- independent; LARGE blast radius; do incrementally
TD-08 (paid_at bug fix = PACK-09)          <-- independent; tiny; ship quickly
TD-07 (test runner = QA-01 = in PACK-05)  <-- blocks all other unit tests
TD-09 (remove babel-polyfill)              <-- after verifying server starts without it
```

---

## Full Execution Order (Recommended)

```
Phase A (Parallel — no inter-dependencies):
  PACK-01 (webhook HMAC)                     [P0 — do immediately]
  PACK-02 (security hardening bundle)        [P1]
  PACK-09 (paid_at bug fix)                  [P2 — tiny, bundle with PACK-01 PR]

Phase B (After Phase A):
  PACK-03 (B01 read-state migration + FE)    [P1]
  PACK-06 (messages pagination + errors)     [P2 — parallel with PACK-03]
  PACK-10 (verify security headers)          [P2 — after PACK-02]

Phase C (After PACK-05 test runner up):
  PACK-04 (hub pagination)                   [P2]
  PACK-05 (test runner + hub tests)          [P2 — after PACK-04 shape confirmed]
  GH-ACT-P2-08 (statusId constant)          [P3 — bundle into PACK-04]

Phase D (Applicant experience):
  PACK-07 (deleteJob)                        [P2]
  PACK-08 (interview list)                   [P2]
  AE-05 (profile completeness nudge)         [P2 — FE only]
  AE-07 (duplicate apply prevention)         [P2]

Phase E (Cleanup — as capacity allows):
  GH-ACT-P3-01 (deleteCV storage)
  GH-ACT-P3-02 (email enumeration)
  TD-06 (shared message mutation — incremental)
  TD-09 (babel-polyfill removal)
  GH-ACT-P3-03 (Redis — only on scale decision)
```

---

## Estimated Total Effort

| Phase | Pack Count | Est. Hours | Suggested Sprint |
|-------|-----------|------------|-----------------|
| A | 3 | 4-6h | Sprint 1 Day 1 |
| B | 3 | 8-12h | Sprint 1 Day 2-3 |
| C | 3 | 8-12h | Sprint 2 Day 1-2 |
| D | 4 | 10-14h | Sprint 2 Day 3-5 |
| E | 5 | 8-12h | Sprint 3 |
| **Total** | **18** | **38-56h** | **3 sprints** |

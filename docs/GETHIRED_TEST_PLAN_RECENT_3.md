# GETHIRED_TEST_PLAN_RECENT_3
**Date:** 2026-06-26
**BE HEAD:** a32aa3b (latest commit) | **FE HEAD:** 2ff2409 (latest commit)
**Scope:** ESM compat fixes + full BE catch-up deploy (99 files) + SSR 404 pattern + SEO DOCUMENT token

---

## Test Objectives

1. Verify ESM compat fix (`?.` -> `&&` guards) in `contactsController.js`, `candidateController.js`, `verifyRoles.js`
2. Verify `Promise.allSettled()` refactors are semantically correct (null guards, correct status string filtering)
3. Full ESM compat scan: confirm no active server code uses `?.` or `??`
4. Verify `@Optional() @Inject(RESPONSE)` SSR 404 pattern in `job-posts-details.component.ts`
5. Verify `seo.service.ts` DOCUMENT token injection and companion spec structure
6. Run FE production build
7. Run BE logic self-tests (no real DB/Firebase)

---

## Test Phases

| Phase | Area | Method |
|-------|------|--------|
| P1 | ESM compat scan (all source dirs) | Static analysis (node scan) |
| P2 | verifyRoles.js uid guard | Logic self-test (node inline) |
| P3 | contactsController allSettled filter | Logic self-test (node inline) |
| P4 | candidateController allSettled filter | Logic self-test (node inline) |
| P5 | Null value guard (`r.value &&`) | Logic self-test (node inline) |
| P6 | firebaseApp.js 4-strategy credential chain | Static review |
| P7 | seo.service.ts DOCUMENT token | Static review + spec audit |
| P8 | job-posts-details SSR 404 pattern | Static review |
| P9 | FE production build | npm run build-prod |
| P10 | BE parse check (start.js + server.js) | Static review |
| P11 | backfill_application_snapshots.js ESM scope | Static review |
| P12 | scripts/ ESM scope analysis | Static analysis |
| P13 | seo.service.spec.ts — test structure audit | Read + review |
| P14 | Contract regression: HTTP status codes unchanged | Static review |
| P15 | BOLA ownership chain unchanged | Static review |
| P16 | Promise.allSettled createGroup/updateGroup | Static review |
| P17 | BE package.json test runner status | Static check |
| P18 | Optional chaining in comments-only (not runtime) | Static verification |
| P19 | FE build output size check | Build output analysis |
| P20 | Release quality gate assessment | Aggregate findings |

---

## Safety Constraints

- No production DB connections
- No real Firebase, PayMongo, or SendGrid calls
- No secrets in any output file
- No destructive actions

# GETHIRED_OPTIMIZE_DO_NOT_TOUCH.md
## QA Cycle 11 — Do Not Touch List

### Absolute Off-Limits (OPTIMIZE scope)

| File / System | Reason |
|---|---|
| `middleware/verifyAuth.js` | Auth gate — any change risks breaking all authenticated routes |
| `db/dbQuery.js` (pool config) | Pool is `max: 1`; changing pool size without load-testing on the live Linode is high-risk |
| `.env` / `env.js` | Secret management — never touch in code changes |
| Firebase Auth integration | Any change breaks login across all roles |
| Payment / Stripe routes | PCI scope — never modify without dedicated security review |
| `routes/subscriptionRoute.js` | Billing — off-limits without business sign-off |
| `controllers/adminController.js` | Admin role escalation risk |
| Angular route guard files (`*.guard.ts`) | Breaks role-based access if touched |
| `app.routing.module.ts` empty-path routing | Confirmed fragile (comment explains the empirical failure modes) |
| `services/match/` directory | MATCH system — separate concern, out of scope |
| `services/applicantProfileQualityService.js` | PROFILE system — out of scope |
| `RecordService` (`recorder.service.ts`) recording logic | Changes risk breaking video answer submission for applicants |
| Any DB schema migration | No schema changes permitted in OPTIMIZE |
| Production `.env` or server config | No production secrets touched |

### Soft Off-Limits (high caution, touch only with justification)

| File / System | Reason |
|---|---|
| `server.js` — rate-limit tier values | In-memory limiter; tuning max values has immediate prod effect |
| `interviewController.js` LIMIT 200 | Increasing this number without cursor-based pagination first is risky |
| `employer-panel.component.ts` z-index stack | Changing z-index values risks breaking drawer/scrim layering |
| `shared/shared.module.ts` | Very wide blast radius — everything imports SharedModule |
| NgRx store (`*.facade.ts`, `*.effects.ts`) | State mutations can corrupt other views |

# GETHIRED DEFINITION OF READY / DONE
## QA Cycle 11

**Generated:** 2026-06-25

---

## Definition of Ready (DoR)
A backlog item is ready to be worked on when ALL of the following are true:

### DoR-01 — Scope Clarity
- [ ] The item has a clear title and at least 3 bullet-point acceptance criteria
- [ ] The specific files to change are identified
- [ ] Edge cases are listed (empty response, error case, concurrent case)

### DoR-02 — Authorization Model Confirmed
- [ ] For any BE change: it is confirmed whether the operation requires authentication
- [ ] For any write operation: it is confirmed that authorization derives from JWT (not caller-supplied IDs)
- [ ] BOLA check approach is specified (where-clause guard or explicit lookup)

### DoR-03 — Schema / DB Impact Clear
- [ ] If a migration is required: it is specified as additive-only (new column with default) or with explicit downtime plan
- [ ] If a migration adds a NOT NULL column: a default value or backfill strategy is documented
- [ ] Rollback plan: either "DROP COLUMN" or "set default to current value"

### DoR-04 — Test Cases Pre-Identified
- [ ] At least 3 test cases are written out before implementation begins
- [ ] Happy path, empty/null case, and forbidden/error case are all covered
- [ ] If touching an existing endpoint: regression cases for prior behavior are listed

### DoR-05 — Dependencies Satisfied
- [ ] All upstream dependencies from GETHIRED_DEPENDENCY_GRAPH.md are complete
- [ ] Required secrets or config (e.g. Paymongo webhook secret) are available in environment

---

## Definition of Done (DoD)
A backlog item is done when ALL of the following are true:

### DoD-01 — Code
- [ ] Implementation matches acceptance criteria
- [ ] No `console.log` left in production code paths (only `console.error` for error catches)
- [ ] No hardcoded secrets, IDs, or magic numbers (use constants or env vars)
- [ ] No raw error objects leaked in API responses (internal errors sanitized)

### DoD-02 — Authorization & Security
- [ ] JWT derived identity used for all personalized operations (not caller-supplied)
- [ ] New public endpoints are explicitly reviewed for whether they need auth
- [ ] Rate-limit tier considered: does this endpoint need a stricter limiter?

### DoD-03 — Tests
- [ ] Unit test(s) written covering: happy path, empty/null case, unauthorized case
- [ ] `npm test` exits 0
- [ ] For FE: Angular spec covers loading, error, and empty states

### DoD-04 — API Contract
- [ ] Response shape matches the FE interface type (TypeScript interface updated if shape changed)
- [ ] No breaking changes to existing endpoints without FE update in the same PR
- [ ] New optional query params have documented defaults

### DoD-05 — Deployment
- [ ] Code committed to main branch (not left in a feature branch)
- [ ] Production deploy verified: the changed endpoint returns the expected response
- [ ] No regression: prior test cases (QA cycle regression list) still pass after deploy

### DoD-06 — Documentation
- [ ] If a new env var is required: documented in `.env.example`
- [ ] If a new route is added: route listed in the relevant route file with verifyAuth status noted in comment
- [ ] If a schema migration ran: migration is idempotent or guarded with `IF NOT EXISTS`

---

## Special DoD Rules for this Project

### Security-Sensitive Endpoints
Any endpoint touching payment, subscription, or account deletion requires an additional reviewer confirmation before merging — do not self-merge P0 items.

### Schema Migrations
- Always test on staging DB before production
- Never use `ALTER TABLE ... DROP COLUMN` in production without a backup
- `recruiter_last_read_at` migration (GH-ACT-P1-01) can run during normal operation (non-blocking ALTER ADD COLUMN on Postgres)

### FE/BE Contract
FE TypeScript interfaces must be updated in the same commit or PR that changes the BE response shape. Never ship a BE shape change without the FE type update.

### Paymongo Webhook (PACK-01 special rule)
Must be verified with a Paymongo test event (not just a manual curl) before the P0 is marked done. A forged event must return 401. A valid test event must process correctly and grant subscription.

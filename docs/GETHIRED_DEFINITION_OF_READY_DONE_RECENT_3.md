# GetHired — Definition of Ready / Done RECENT 3
**Generated:** 2026-06-26
**Supersedes:** Any prior Definition of Ready/Done in GetHired docs
**Purpose:** Clear criteria for what "ready to start" and "done" mean for each backlog item

---

## Definition of Ready (DoR)

An item is READY to be worked on when ALL of the following are true:

### Technical Readiness
- [ ] The problem is clearly described (not just "fix the bug")
- [ ] The affected file(s) are identified
- [ ] The fix approach is defined (not just "improve this")
- [ ] Acceptance criteria are written (what does "done" look like?)
- [ ] Dependencies are identified (what must be done first?)
- [ ] Effort estimate exists (XS/S/M/L/XL)

### Decision Readiness
- [ ] No open product/design decisions are blocking the item
- [ ] The owner is identified (BE dev / FE dev / Paul / Ops)

### Dependency Readiness
- [ ] All upstream items are either CLOSED or explicitly NOT blocking this item
- [ ] Required packages/tools are identified (e.g., "requires `express-rate-limit`")

---

## Definition of Done (DoD)

An item is DONE when ALL of the following are true:

### Code
- [ ] Code change is committed to the correct branch (feature branch or main per team convention)
- [ ] No new `console.error` / `console.log` left in production code paths
- [ ] No hardcoded secrets, IDs, or environment-specific values in committed code
- [ ] For BE items: ESLint passes (`npm run lint` if configured) — especially no `?.` or `??` in BE source

### Deployment
- [ ] Change is deployed to Linode production (BE) or deployed via GitHub Actions (FE)
- [ ] For BE: `pm2 list` shows `online` after deployment
- [ ] For BE: PM2 logs show no startup errors after deployment
- [ ] For FE: GitHub Actions workflow completed successfully

### Verification
- [ ] Acceptance criteria from the backlog item have been manually verified
- [ ] Regression: the primary user flow for the affected area still works (login, job apply, employer invite, etc.)
- [ ] For security items: the specific attack vector is manually verified as closed
- [ ] For SEO items: `curl -A "Googlebot"` or Search Console verification done
- [ ] For payment items: PayMongo test webhook fired; BE returned 200

### Documentation
- [ ] Backlog item status updated to CLOSED in the relevant ACTIONS/backlog doc
- [ ] If a decision was made during implementation, it is recorded in GETHIRED_DECISION_LOG_RECENT_3.md
- [ ] If a new risk was found during implementation, it is added to the backlog

---

## DoR/DoD Per Item Type

### BE Code Fix (e.g., rate limiting, pool exhaustion)

**Ready when:**
- File and line numbers identified
- `npm install <package>` command known
- Middleware/route insertion point identified
- 429/error response format agreed

**Done when:**
- Package installed; committed to `package.json` and `package-lock.json`
- Middleware created in correct directory (`middleware/`)
- Routes updated; no route left unprotected
- Deployed to Linode; PM2 restarted
- Manual test: expected behavior verified (e.g., 429 on 11th auth attempt)
- PM2 logs clean (no startup error)

### FE Component Fix (e.g., toast logic, localStorage guard, mobile table)

**Ready when:**
- Component file identified
- Change type clear (new import, new guard, template change)
- Acceptance criteria written (what does the component do after fix?)

**Done when:**
- FE code committed
- `ng build --configuration=production` succeeds
- Deployed via GitHub Actions (push to master)
- Manual verification in browser at correct URL
- Mobile check if change affects responsive behavior

### Ops Task (e.g., PayMongo env var, PM2 ecosystem)

**Ready when:**
- Command to run is specified
- Expected output is described
- Rollback is known (if any)

**Done when:**
- Command run; output matches expected
- Screenshot or log line recorded confirming success
- Documented in relevant ACTIONS doc (backlog item marked CLOSED)

### Security Fix

**Ready when:**
- Vulnerability described with attack path (not just "it's insecure")
- Fix approach confirmed by code review (not just "add validation")
- Affected endpoints/files identified

**Done when:**
- Code fix deployed
- Attack path manually closed: attempt the attack; confirm it is rejected
- No regression on legitimate use of the same endpoint
- Recorded in GETHIRED_SECURITY_ACTIONS_RECENT_3.md

### Design/Asset Task (e.g., OG image — now DONE)

**Ready when:**
- Specs written (dimensions, format, content constraints)
- File path agreed (where it will live in the repo)
- Code that references the asset is identified

**Done when:**
- Asset file committed at the correct path
- `angular.json` assets config includes the directory (if FE)
- Deployed; verified in browser (network tab shows 200 for the asset)
- Social preview verified (LinkedIn Post Inspector or Facebook Debugger)

---

## Sprint Gate Checklist

Before closing a sprint, verify:

- [ ] All items marked DONE meet the full Definition of Done above
- [ ] No P0 items are open
- [ ] P1 items have a committed timeline if not done
- [ ] PM2 is running the correct entry point (`start.js` via ecosystem.config.js)
- [ ] BE and FE are in sync (no half-deployed features)
- [ ] GETHIRED_ACTIONS_RECENT_3.md backlog updated with new statuses
- [ ] Decision log updated with any decisions made during the sprint
- [ ] Linode health check: `ssh root@139.162.11.242 "pm2 list && pm2 logs --lines 20"` — all online, no errors

---

## ESM Syntax Safety (Permanent Checklist Item)

Before every BE code review or PR merge, verify:

- [ ] No `?.` (optional chaining) in any `.js` file in `get-hired-BE/src/`
- [ ] No `??` (nullish coalescing) in any `.js` file in `get-hired-BE/src/`
- [ ] No `??=`, `||=`, or `&&=` logical assignment operators

**Quick check:**
```bash
grep -rn "\?\." get-hired-BE/src/ --include="*.js"
grep -rn "\?\?" get-hired-BE/src/ --include="*.js"
```
Both commands must return zero results until ESM migration is complete.

**Why:** ESM v3.2.25 bundles Acorn 6/7 which cannot parse these operators. Adding them causes `SyntaxError` at PM2 startup → production down.

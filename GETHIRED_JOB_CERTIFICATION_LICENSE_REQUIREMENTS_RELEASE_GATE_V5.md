# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — RELEASE GATE V5
**Date:** 2026-07-01

---

## Release Gate Checklist

All items must be PASS before deploying the V5 certification changes to production.

---

### P0 — Blockers (Must Pass)

| # | Check | Status |
|---|---|---|
| 1 | `services/job.service.js` change committed and pushed to GitHub | ⏳ Pending (this session) |
| 2 | BE deployed to Linode (git pull + pm2 restart gethired) | ⏳ Pending (this session) |
| 3 | `GET /api/jobs/:id` response for a published job: NO `id` or `canonicalKey` in certificationRequirements array | ⏳ Verify post-deploy |
| 4 | Public job detail page still loads without JS errors after deploy | ⏳ Verify post-deploy |
| 5 | Employer create/edit job still saves certification requirements correctly | ⏳ Manual QA post-deploy |
| 6 | Resume draft: existing requirements load correctly after deploy | ⏳ Manual QA post-deploy |
| 7 | PayMongo webhook endpoint returns 200 OK (unaffected; spot-check) | ✅ (no change made) |
| 8 | Existing logins (email/password, Google) work normally | ✅ (no auth changes) |
| 9 | Node 14 compatibility: no `?.` or `??` in changed code | ✅ Confirmed (change was only removing fields from .map()) |

---

### P1 — Should Pass

| # | Check | Status |
|---|---|---|
| 10 | No new console errors on employer job create page | ⏳ Verify post-deploy |
| 11 | No new console errors on public job detail page | ⏳ Verify post-deploy |
| 12 | CORS: recruiter routes still accessible from gethiredonline.app | ✅ (no CORS changes) |
| 13 | PM2 shows `gethired` process `online` after restart | ⏳ Verify post-deploy |
| 14 | No 5xx errors in PM2 logs after deploy | ⏳ Verify post-deploy |
| 15 | FE: interface `id?: string` and `canonicalKey?: string | null` remain optional (no TS errors) | ✅ Confirmed in model |

---

### P2 — Nice to Verify

| # | Check | Status |
|---|---|---|
| 16 | Manual QA test script from TEST_LOG_V5 steps 1-11 completed | ⏳ Next sprint |
| 17 | DevTools Network confirms stripped fields absent | ⏳ Next sprint |
| 18 | Accessibility: screen reader test on cert section | ⏳ Next sprint |

---

## Go/No-Go Decision

| Condition | Decision |
|---|---|
| All P0 items PASS | GO |
| Any P0 item FAIL | NO-GO — fix before deploy or roll back |
| P1 items FAIL | INVESTIGATE — may delay deploy depending on severity |
| P2 items FAIL | LOG to backlog — does not block deploy |

---

## Deploy Commands (When Ready)

```bash
# On Linode (run from local PowerShell):
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 restart gethired && pm2 logs gethired --lines 20 --nostream"
```

Expected output after pull:
- Files changed: `services/job.service.js` + 26 V5 certification docs
- PM2 shows `gethired` restarting → `online`
- No error lines in last 20 PM2 log lines

---

## Rollback Plan

See `GETHIRED_JOB_CERTIFICATION_LICENSE_REQUIREMENTS_ROLLBACK_DEPLOYMENT_PLAN_V5.md` for step-by-step rollback instructions.

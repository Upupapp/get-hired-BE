# GetHired — QA Actions RECENT 3
**Generated:** 2026-06-26
**Supersedes:** QA sections in GETHIRED_ACTIONS_RECENT_DEPLOYMENT_V5.md
**Current QA cycle:** Post-deployment hardening session — Firebase, SSH key, OG, GSC, SSR fixes

---

## QA Status Summary

| Category | Status | Notes |
|---|---|---|
| Core hire flow | PASS | Job listing → detail → apply → pipeline |
| Auth flows | PASS | Login, logout, token refresh |
| Employer invite flows | PASS | NOTIFY-P2 fixes shipped and verified |
| Import bulk flows | PASS | Promise.allSettled; structured summary |
| SSR / public pages | PASS (verify prod) | JSON-LD, real 404, OG — verify via curl |
| Payment webhook | PASS (env var pending) | HMAC code correct; env var needs verification |
| Firebase auth | PASS | env-based chain; old key revoked |
| Mobile (public pages) | PASS | Mobile block removed; responsive verified |
| Mobile (authenticated tables) | PARTIAL | Tables hidden on mobile; no card fallback |
| Rate limiting | FAIL | No rate limiting on any endpoint |
| ESM syntax safety | FAIL | No guardrail preventing `?.`/`??` in BE files |

---

## Regression Tests Required After Each Deployment

### BE Deployment Regression Checklist

- [ ] PM2 process online: `ssh root@139.162.11.242 "pm2 list"` — status `online`
- [ ] Health check: `curl https://gethiredonline.app/api/health` (if endpoint exists) or `curl https://gethiredonline.app/api/jobs/published` → 200
- [ ] Firebase auth: login with test account → JWT returned → protected endpoint accessible
- [ ] PayMongo webhook: trigger test event from PayMongo dashboard → PM2 logs show `[paymentController]` → 200 response
- [ ] Import flow: bulk contact import (2 rows) → correct summary toast
- [ ] Interview invite: send interview invite to 1 recipient → email received or PM2 logs show send attempt

### FE Deployment Regression Checklist

- [ ] Public job listing loads: `https://gethiredonline.app/jobs`
- [ ] Job detail loads: `https://gethiredonline.app/jobs/details/<active-id>` — title shows correctly
- [ ] SSR check: `curl -A "Googlebot" https://gethiredonline.app/jobs/details/<active-id>` — `<title>` shows job title in raw HTML
- [ ] OG image: paste URL into https://www.linkedin.com/post-inspector/ — preview image appears
- [ ] 404 check: `curl -I https://gethiredonline.app/jobs/details/nonexistent-12345` — HTTP 404
- [ ] Auth: login, protected route accessible, logout clears session
- [ ] Mobile: public search page at mobile width (375px) — content visible, no empty white space
- [ ] Snackbar colors: success (green text on dark), warning (#b45309 on dark), danger (red on dark)

---

## Outstanding QA Gaps

### Gap 1 — No Unit Tests for Toast Outcome Logic (P3-TOAST-TESTS)

Three import-add components (`import-add-user`, `import-add-contact`, `import-add-candidate`) have no `.spec.ts` files. The toast decision branching logic (success/partial/duplicate/all-failed) is critical UX behavior verified only manually.

**Test cases needed:**
- TC-01: All succeed → success toast; dialog closes
- TC-02: All duplicate → info toast; no success toast
- TC-03: All failed → error toast; no success toast
- TC-04: Partial (some succeed, some fail) → warning toast with counts
- TC-05: Single add success → success toast
- TC-06: Single add duplicate → info/warning toast; no success toast

**Blocked by:** No established Angular component testing pattern in the FE repo. Once that is established, these tests should be first priority.

---

### Gap 2 — No API Contract Tests Between FE and BE

FE components assume specific response shapes from bulk import endpoints:
- `{ contacts/candidates, summary: { totalRequested, successCount, failureCount, duplicateCount, outcome } }`
- `{ status: 'ADDED' | 'DUPLICATE_CONTACT' | 'DUPLICATE_CANDIDATE' }`

No automated contract test verifies these shapes. A BE change that renames `successCount` → `success_count` would silently break all outcome-toast logic in FE.

**Recommendation:** Add a simple Postman/Newman collection or a Node test script that calls the bulk import endpoints and asserts the response shape. Add to CI.

---

### Gap 3 — No SSR Production Smoke Test

No automated test verifies that Angular Universal is serving SSR in production (vs static index.html). This must be verified manually after each FE deploy by running:
```bash
curl -A "Googlebot" https://gethiredonline.app/jobs/details/<active-job-id>
```

**Recommendation:** Add this as a post-deploy step in GitHub Actions:
```yaml
- name: Verify SSR
  run: |
    RESPONSE=$(curl -s -A "Googlebot" https://gethiredonline.app/jobs/details/TEST_JOB_ID)
    echo "$RESPONSE" | grep -q "JobPosting" || (echo "SSR check FAILED" && exit 1)
```

---

### Gap 4 — No Rate Limit Testing

No test verifies that rate limiting will work once it is implemented. Once `express-rate-limit` is installed (P1-RATE-LIMIT), add:
```bash
# Auth endpoint: 11th request in 15min window should return 429
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://gethiredonline.app/api/signin \
    -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'
done
# Requests 11-12 should return 429
```

---

## QA Environment Notes

**Production (Linode):** `https://gethiredonline.app` | root@139.162.11.242
**BE PM2 process:** Started with `start.js` (not `server.js`) — pending ecosystem.config.js formalization
**FE:** Angular Universal SSR + static assets; deployed via GitHub Actions on master push
**Database:** Supabase (production) — verify `.env` `DB_CONNECTION` is not pointing to cached/wrong config (see dotenv duplicate DB_CONNECTION gotcha in memory)

---

## Post-Launch Monitoring Plan

| Signal | Tool | Threshold |
|---|---|---|
| Server errors | PM2 logs / Linode | Error rate > 1% → investigate |
| PayMongo webhooks | PM2 logs `[paymentController]` | Any 400 response → check env var |
| SSR correctness | Google Search Console | Rich result errors → check SSR |
| Indexing velocity | Google Search Console | Jobs indexed within 7 days → healthy |
| Social previews | LinkedIn Post Inspector | OG image appears → healthy |
| TTFB | Manual / Lighthouse | < 1s → healthy |

# GETHIRED SECURE EXTERNAL ACTIONS — QA Cycle 11
Generated: 2026-06-25

These items require human action outside of code changes. Claude Code cannot perform them.

---

## URGENT (Before Any Public Access)

### EA-01: Rotate GCP Service Account Keys — GetHired Project
- **Why:** `gethired-serviceAccountKey.json` tracked in git history
- **How:** GCP Console → IAM & Admin → Service Accounts → Delete old keys → Create new key → Update production server env
- **Owner:** Paul / DevOps
- **Effort:** 15 min

### EA-02: Rotate GCP Service Account Keys — JobHunt Project
- **Why:** `jobhunt-serviceAccountKey.json` tracked in git history
- **How:** Same as EA-01 for the jobhunt GCP project
- **Owner:** Paul / DevOps
- **Effort:** 15 min

### EA-03: Purge Service Account Key Files from Git History
- **Why:** Even after removal, historical commits retain the keys
- **How:** `git filter-repo --path gethired-serviceAccountKey.json --invert-paths` then same for jobhunt key; force-push; notify all contributors to re-clone
- **Owner:** Paul
- **Effort:** 30 min + re-clone coordination

### EA-04: Audit Firebase/GCP Access Logs
- **Why:** Verify the keys were not used by unauthorized parties
- **How:** GCP Cloud Logging → filter by service account email → check for API calls from non-production IPs in last 90 days
- **Owner:** Paul
- **Effort:** 30 min

---

## HIGH (Fix Within 1 Sprint)

### EA-05: Add PayMongo Webhook Secret to Environment
- **Why:** Webhook signature verification requires a shared HMAC secret from PayMongo
- **How:** PayMongo Dashboard → Webhooks → Get webhook secret → add as `PAYMONGO_WEBHOOK_SECRET` env var on production server
- **Owner:** Paul
- **Effort:** 10 min (secret retrieval) + code change to implement verification

### EA-06: Restrict CORS Origin for Production
- **Why:** Currently `cors()` allows all origins
- **How:** Identify the production FE domain (e.g., app.gethired.ph) and add it to the whitelist; uncomment the `corsOption` block in server.js
- **Owner:** Paul + developer
- **Effort:** 30 min

### EA-07: Move Secret Files to GCP Secret Manager
- **Why:** Prevent future accidental commits of credential files
- **How:** Store service account keys in GCP Secret Manager or inject via instance metadata; update application to load from Secret Manager rather than file system
- **Owner:** Paul / DevOps
- **Effort:** 2 hours

---

## MEDIUM (Fix Within 2 Sprints)

### EA-08: Review Firebase Storage ACLs for applicantPhotoUrl
- **Why:** `applicantPhotoUrl` (Firebase Storage URL) returned to recruiters; need to confirm object ACLs
- **How:** Firebase Console → Storage → check bucket default rules; confirm public read is intentional for profile photos
- **Owner:** Paul
- **Effort:** 30 min

### EA-09: npm Dependency Upgrade Plan
- **Why:** 273 vulnerabilities (17 critical) in transitive dependencies
- **How:** (1) Remove `bcrypt`, keep `bcryptjs` (already in package.json); (2) upgrade `axios` to >=1.7.4; (3) remove deprecated `request` package and migrate its callers
- **Owner:** Developer
- **Effort:** 1 day

### EA-10: Set Up Log Aggregation
- **Why:** Logs go to be_out.log / be_err.log on the server; no centralized monitoring
- **How:** Configure a log aggregation service (e.g., Logtail, Datadog, or GCP Cloud Logging) and point stdout/stderr to it
- **Owner:** Paul / DevOps
- **Effort:** 2 hours

---

## LOW (Next SECURE Pass)

### EA-11: Confirm nosniff Header at Nginx/CDN Layer
- **Why:** If the app is behind Nginx, the header may already be set there
- **How:** `curl -I https://[production-domain]/api/` and check for `x-content-type-options: nosniff`
- **Owner:** Paul
- **Effort:** 5 min

### EA-12: Verify TLS Configuration
- **Why:** TLS assumed at infrastructure level but not verified
- **How:** SSL Labs test on production domain; verify TLS 1.2+ only, no weak ciphers
- **Owner:** Paul
- **Effort:** 15 min

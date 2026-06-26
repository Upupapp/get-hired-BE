# GetHired — Next 3 High-Value Actions (ROADMAP RECENT_4)
> Updated: 2026-06-26 | ACTIONS RECENT_4
> FE HEAD: `8a41f25` | BE HEAD: `35f7754`

---

## Selection Rationale

The sprint just closed the most visible a11y and security gaps (ARIA, contrast, SQL injection, OG card, SSR guards). The highest remaining risk to a public launch is:
1. A live exploitable credential in git history (P0 — existential)
2. No rate limiting on any endpoint (P1 — brute-force, scraping, flooding)
3. SSR not verified in production — if it is broken, all the JSON-LD and meta work is invisible to Googlebot

---

## ACTION 1 — Rotate + purge Firebase service account key (P0)
**Backlog item:** BL-P0-01
**Why first:** The key is live in public git history right now. Every minute it stays there is a window for someone to extract it and impersonate the Firebase service account — giving them read/write access to all Firestore data, auth tokens, and Firebase Storage. This blocks public launch.

**Execution steps (user must perform):**
```
# Step 1 — Rotate the key
Go to: Firebase Console → [Project] → Project Settings → Service Accounts
Click "Generate new private key" → Download → save locally as jobhunt-serviceAccountKey.json
Do NOT commit the new file.

# Step 2 — Revoke the old key
In the same Service Accounts panel, click the three-dot menu on the OLD key → Revoke

# Step 3 — Purge from git history (run in get-hired-BE directory)
git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths

# Step 4 — Force-push
git push origin main --force

# Step 5 — Deploy new key to Linode
scp jobhunt-serviceAccountKey.json root@139.162.11.242:/var/www/_work/get-hired-BE/
ssh root@139.162.11.242 "pm2 restart gethired"

# Step 6 — Notify all collaborators to re-clone (force-push rewrites history)
```

**Verification:**
- Firebase Console shows old key as Revoked
- `git log --all --full-history -- jobhunt-serviceAccountKey.json` returns nothing
- Production still responds to authenticated requests (confirms new key works)

---

## ACTION 2 — Verify + implement rate limiting (P1)
**Backlog item:** BL-P1-01
**Why second:** Without rate limiting every auth endpoint is open to credential stuffing, and every public-read endpoint is open to scraping/flooding. The prior memory note says a 4-tier limiter may already exist in server.js — verify first before writing code.

**Step 1 — Verify (run locally or on Linode):**
```
grep -n "rate-limit\|rateLimit\|express-rate-limit" get-hired-BE/server.js
grep -rn "express-rate-limit" get-hired-BE/
```

**If rate limiting IS present:** Close BL-P1-01. Confirm the tiers cover `/auth/*` routes.

**If rate limiting is NOT present — Execution steps:**
```
# Install
cd get-hired-BE && npm install express-rate-limit

# In server.js, before any route mounting:
const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many auth attempts, try again later.' });
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

app.use(globalLimiter);
app.use('/auth', authLimiter);
app.use('/contacts', writeLimiter);
app.use('/candidates', writeLimiter);
app.use('/users', writeLimiter);
```

**Verification:** `curl -s -o /dev/null -w "%{http_code}" -X POST https://gethiredonline.app/auth/signin` in a loop 11 times → 11th response should be 429.

---

## ACTION 3 — Verify Angular Universal SSR in production (P2, SEO-critical)
**Backlog item:** BL-P2-03
**Why third:** All the JSON-LD structured data, canonical tags, meta descriptions, and noindex fixes shipped this sprint are processed server-side. If SSR is not running in production (i.e., Linode nginx is serving static index.html only), Googlebot sees none of them. This makes the entire SEO effort invisible until confirmed.

**Verification command (run from local PowerShell):**
```
curl -A "Googlebot/2.1 (+http://www.google.com/bot.html)" https://gethiredonline.app/jobs/details/{replace-with-active-job-id} 2>$null | Select-String -Pattern "<title>|application/ld\+json|og:title"
```

**Expected output if SSR is working:** Dynamic job title in `<title>`, `<script type="application/ld+json">` block visible in raw HTML.

**If SSR is not working (index.html only):**
```
# Check Linode nginx config
ssh root@139.162.11.242 "cat /etc/nginx/sites-available/default"

# Expected: nginx should proxy to Node port (usually 4000), not serve /dist directly
# If serving /dist/get-hired-FE/browser/index.html statically, SSR is broken.

# Correct nginx config pattern (server block):
# location / {
#   proxy_pass http://localhost:4000;
#   proxy_http_version 1.1;
#   ...
# }
```

**Why this matters now:** Search Console submission (BL-P1-03) and Google Indexing API (BL-FEAT-03) are pointless if Googlebot gets a blank shell on every URL. Confirm SSR before submitting the sitemap.

---

## After These 3 Actions

Once ACTION 1-3 are done, the launch gate sequence is:
```
[Firebase key purged] → [Rate limiting confirmed] → [SSR confirmed] → [Search Console verified + sitemap submitted] → [PayMongo webhook URL registered] → PUBLIC LAUNCH
```

---

*Generated by GETHIRED ACTIONS RECENT_4 | FE 8a41f25 / BE 35f7754*

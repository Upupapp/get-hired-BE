# GETHIRED ACTIONS EXECUTION PACKS — V6
**Date:** 2026-07-01 | **Format:** Grouped by who does the work and when

---

## PACK-A: Immediate Ops Actions (Paul, No Developer, ~30 min total)

**Do these today — they unblock everything else.**

### A.1 — Verify PayMongo Webhook Secret (5 min)
```bash
ssh root@139.162.11.242 "pm2 env 0 | grep PAYMONGO"
```
Expected: non-empty value. If missing, go to PayMongo dashboard → Developers → Webhooks → copy signing secret → add to Linode `.env` → `pm2 restart all`.

**Acceptance:** Test webhook fires 200. Payment subscriptions process.

---

### A.2 — Restore GitHub PAT (5 min)
1. github.com/settings/tokens → new classic token → scope: `repo`
2. `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git remote set-url origin https://<TOKEN>@github.com/Upupapp/get-hired-BE.git"`
3. `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-FE && git remote set-url origin https://<TOKEN>@github.com/Upupapp/get-hired-FE.git"`

**Acceptance:** `git pull` works on Linode without credential prompt.

---

### A.3 — Google Search Console Setup (15 min)
1. search.google.com/search-console → Add property → `https://gethiredonline.app`
2. Verify via HTML meta tag method (add to `index.html` → deploy → verify)
3. Submit sitemap: `https://gethiredonline.app/sitemap.xml`
4. Request indexing on homepage

**Acceptance:** Property verified, sitemap accepted.

---

### A.4 — Verify Angular Universal SSR (10 min)
```bash
curl -A "Googlebot" https://gethiredonline.app/jobs/details/{any-active-job-id}
```
Look for: job-specific `<title>` and `<script type="application/ld+json">` in output. If generic title only, SSR is not serving — file P2-SSR-VERIFY fix ticket.

---

## PACK-B: Firebase Key Rotation (Paul, ~4 hours, P0 Pre-Launch)

**Execute this before any public announcement or public repo access.**

### B.1 — Rotate Firebase Service Account
1. Firebase Console → Project Settings → Service Accounts
2. Revoke existing service account key
3. Generate new key → download as `jobhunt-serviceAccountKey.json`
4. Keep old key offline until new key is verified

### B.2 — Deploy New Key to Linode
```bash
scp jobhunt-serviceAccountKey.json root@139.162.11.242:/var/www/_work/get-hired-BE/
ssh root@139.162.11.242 "pm2 restart all"
```
Test sign-in on production — confirm new key works.

### B.3 — Purge Old Key from Git History
```bash
cd get-hired-BE
git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths
git push origin main --force
```
Coordinate with any collaborators before force-push.

### B.4 — Verify
```bash
git log --all --full-history -- jobhunt-serviceAccountKey.json
# Expected: no output
```

---

## PACK-C: OG Image + Social Sharing (Paul/Design, ~2 hours)

### C.1 — Create OG Image
- Size: 1200×630px PNG
- Content: GetHired logo + tagline + brand coral (#FF7062) background
- No private data; looks good at 160px thumbnail
- Filename: `gethired-og-default.png`

### C.2 — Deploy
```bash
# Copy to FE assets
cp gethired-og-default.png get-hired-FE/src/assets/brand/
# Build + deploy
cd get-hired-FE && ng build --configuration=production
scp -r dist/ root@139.162.11.242:/var/www/get-hired-FE/
```

### C.3 — Verify
Paste `https://gethiredonline.app` into LinkedIn post composer. Confirm branded OG image card appears.

---

## PACK-D: Security Hardening Sprint (BE Developer, ~1 day)

### D.1 — Rate Limiting Verification + Easy Job Post Limit (~2-4 hours)

Verify existing 4-tier rate limiter covers auth endpoints at 10/15min:
```bash
# Smoke test
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://gethiredonline.app/api/auth/signin; done
# Request 11+ should return 429
```

Add Easy Job Post per-user rate limit in `routes/easyJobPostRoutes.js`:
- 5 requests/hour per authenticated user (key: `req.user.uid`)

### D.2 — DB Pool Concurrency Limiter (~3-5 hours)

Install `p-limit`:
```bash
npm install p-limit
```

In `controllers/contactsController.js` and `controllers/candidateController.js`, wrap bulk import:
```javascript
const pLimit = require('p-limit');
const limit = pLimit(10);  // match pool max

const settled = await Promise.allSettled(
  contacts.map(option => limit(async () => {
    return addMultipleContact({ ...option, companyId });
  }))
);
```

Test with 100-row CSV: zero timeout errors in PM2 logs.

### D.3 — CSV Import Row Cap (~1 hour)

In each import component, after parsing CSV rows:
```typescript
const MAX_IMPORT_ROWS = 50;
if (this.records.length > MAX_IMPORT_ROWS) {
  this.snackBar.open(
    `CSV has ${this.records.length} rows. Maximum allowed is ${MAX_IMPORT_ROWS}. Please split your file.`,
    '', { duration: 8000, panelClass: 'danger-snackbar' }
  );
  this.records = [];
  return;
}
```

---

## PACK-E: SEO Sprint (FE Developer, ~1 day)

### E.1 — JobPosting JSON-LD (~2 hours)

In `job-posts-details.component.ts`, inject `SeoService.addJobPostingSchema()` in `ngOnInit` when job data loads:

Schema fields: `@type: JobPosting`, `title`, `description`, `datePosted: createdAt`, `hiringOrganization.name: companyName`, `jobLocation.address: location`, `baseSalary (if present)`.

Verify: `curl https://gethiredonline.app/jobs/details/{id}` → HTML contains `"@type":"JobPosting"`.

### E.2 — HTTP 404 on Expired Jobs (~2-3 hours)

In `job-posts-details.component.ts`:
```typescript
import { Optional, Inject } from '@angular/core';
import { RESPONSE } from '@nguniversal/express-engine/tokens';

constructor(
  @Optional() @Inject(RESPONSE) private response: any
) {}

// In jobError$ subscription:
this.jobError$.subscribe(error => {
  if (error && this.response) {
    this.response.status(404);
  }
  this.meta.updateTag({ name: 'robots', content: 'noindex' });
});
```

Verify: `curl -I https://gethiredonline.app/jobs/details/nonexistent-xyz` → HTTP 404.

### E.3 — isPlatformBrowser in PublicSearchComponent (~30 min)

Wrap all `localStorage` calls:
```typescript
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Inject } from '@angular/core';

constructor(@Inject(PLATFORM_ID) private platformId: object) {}

// Usage:
if (isPlatformBrowser(this.platformId)) {
  localStorage.setItem('key', value);
}
```

### E.4 — Employer info page CTAs → crawlable links (~30 min)

Audit `src/app/home/employers/` HTML. Convert `(click)="router.navigate(['/jobs/post'])"` to:
```html
<a routerLink="/jobs/post" class="btn btn-primary">Post a Job</a>
```

### E.5 — Role Classification noindex (~10 min)

In `role-classification.component.ts` ngOnInit:
```typescript
this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });
```

---

## PACK-F: LinkedIn + Auth Polish Sprint (FE Developer, ~1 day)

### F.1 — LinkedIn Unlink UI (GH-ACT-088, ~1 day)

Account settings page — add "Connected Accounts" section:
- Query `GET /api/auth/linkedin/link-status` → `{ linked: boolean, email?: string }`
- If linked: show "LinkedIn: Connected (email)" + "Unlink" button
- If not linked: show "LinkedIn: Not connected" + "Connect with LinkedIn" link
- "Unlink" button calls `DELETE /api/auth/linkedin/unlink` → removes LinkedIn association from user record
- Show success toast on unlink; show error state on failure

BE work needed: `GET /api/auth/linkedin/link-status` endpoint, `DELETE /api/auth/linkedin/unlink` endpoint

### F.2 — LinkedIn Error Page Polish (GH-ACT-089, ~2-3 hours)

In LinkedIn callback error handler, map error codes to friendly messages:
- `access_denied` → "You cancelled the LinkedIn sign-in. You can try again or use a different sign-in method."
- `server_error` → "LinkedIn is temporarily unavailable. Please try again in a few minutes."
- `invalid_state` → "Your sign-in session expired. Please start again."
- `unknown` / catch-all → "Something went wrong with LinkedIn sign-in. Please try again."

Each error state must have: clear heading, friendly message, "Try Again" CTA (links back to sign-in page), "Use email instead" fallback link.

### F.3 — Provider Column in user_credentials (ACT-010, ~1 hour BE)

```sql
ALTER TABLE user_credentials ADD COLUMN provider VARCHAR(20) DEFAULT 'email';
```

Update `chooseRole` controller: on Google/LinkedIn auth INSERT, set `provider = 'google'` or `provider = 'linkedin'`.

---

## PACK-G: Applicant Features Sprint (FE Developer, ~3-4 days)

### G.1 — Wire ProfileQualityService into Dashboard (ACT-004, ~1 day)

Inject `ProfileQualityService` into `ApplicantDashboardComponent`. Add quality card showing:
- Overall completeness percentage (progress ring or bar)
- List of incomplete sections with icons
- CTA: "Complete your profile" linking to specific profile tab

### G.2 — CV Doctor FE Wiring (ACT-014, ~2 days)

Wire CV upload → analysis trigger → polling for result → result display. Show:
- Upload progress state
- Analysis in-progress state
- CV Health Score (0-100)
- Flagged issues with severity
- Improvement suggestions

### G.3 — Applicant Profile Grading UI (ACT-015, ~1 day, after G.1)

Build `ProfileGradeComponent`:
- Letter grade badge (A/B/C/D)
- Section-by-section scores
- Link from dashboard quality card

---

## PACK-H: Messages Widget (BE + FE, ~1 day)

### H.1 — BE: is_read Column + All-Threads Endpoint

```sql
ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT false;
```

New route: `GET /api/recruiter/messages/threads`
Returns: one latest message per `(job_id, applicant_uid)` pair with `is_read`, `unread_count`, sender name, preview text.

### H.2 — FE: Wire DashboardMessagesWidgetComponent

Replace mock/empty state with real data from new endpoint. Show unread count badge. Link to full messages view.

---

## PACK-I: Google One Tap (FE Developer, ~2 hours, after post-launch QA)

**Do not start until PACK-G QA gate passes (see QA-ACT-007).**

In `google-signin-button.component.ts`, after `google.accounts.id.initialize()`:
```javascript
google.accounts.id.initialize({
  client_id: environment.googleClientId,
  callback: this.handleCredentialResponse.bind(this),
  use_fedcm_for_prompt: true
});
google.accounts.id.prompt();  // Shows One Tap overlay
```

Test on Chrome (FedCM supported), Firefox (falls back to old prompt), Safari (may be blocked).

---

## Execution Order Recommendation

| Order | Pack | Who | When | Effort |
|---|---|---|---|---|
| 1 | PACK-A | Paul | Today | 30 min |
| 2 | PACK-B | Paul | This week | 4 hr |
| 3 | PACK-C | Paul/Design | This week | 2 hr |
| 4 | PACK-D | BE dev | Next code sprint | 1 day |
| 5 | PACK-E | FE dev | Next code sprint | 1 day |
| 6 | PACK-F | FE+BE dev | Next sprint | 1 day |
| 7 | PACK-G | FE dev | Sprint+1 | 3-4 days |
| 8 | PACK-H | BE+FE dev | Sprint+1 | 1 day |
| 9 | PACK-I | FE dev | Post-launch | 2 hr |

# GETHIRED ACTIONS — Recent Deployment Report
## NOTIFY-P2: Contact/Candidate Invite False-Positive Toast Fix
**Generated:** 2026-06-26
**Deployment:** BE 2ff6358 / FE 1863842
**Previous deployment report covered:** FE 5ab9a05 / BE 422d340 (Applicant Completeness UI)
**Scope:** Employer contact/candidate management — invite flows, toast outcome logic, bulk import race conditions

---

## Executive Summary

NOTIFY-P2 closes three independent false-positive toast bugs that caused "Successfully added" to appear when nothing was actually added. All three bugs are now fixed and shipped. The blast radius was contained entirely to the employer contact/candidate management UI — no job-seeker flows, no auth, no MATCH scoring were touched.

Two items previously listed as "P0 open" in session memory (PayMongo webhook HMAC and CORS wildcard) are confirmed CLOSED by code audit — they were fixed in prior commits (97cd657 and d4e34c7 respectively) and the session memory entries were stale. This report corrects that record.

One new finding is surfaced: `interview.service.js` contains the same broken `forEach(async...)` race condition pattern that NOTIFY-P2 fixed in the contact/candidate bulk flows. It is not a false-positive toast issue but carries the same "headers already sent" Express risk.

**Launch gate status:**
- Internal demo: **SAFE**
- Invite-only beta: **SAFE**
- Public launch: **BLOCKED** — Firebase service account key in git history requires purge + rotation (user action); OG image asset missing

---

## What Closed This Deployment

### NOTIFY-P2-BUG-01 — Company user invite: false-positive success toast on all-failed invite
**Status: CLOSED — FE 1863842**

`import-add-user.component.ts` previously checked `emails.length > 0` to determine success. The backend always returned all submitted emails (including failed ones), so `emails.length > 0` was always true. FE never read the per-email `status` field. Result: an all-failed invite showed a green success toast.

Fix: FE now reads `e.status !== 'failed'` per email item. `successCount === 0` → no success toast. Outcome-appropriate toast is shown: danger (all failed), warning (partial), success (all succeeded).

### NOTIFY-P2-BUG-02 — Single contact add: success toast on duplicate
**Status: CLOSED — BE 2ff6358 / FE 1863842**

`addContact` returned `{ message: "Contact aleady exist" }` (truthy) for duplicates. Controller treated any truthy return as success → HTTP 200. FE subscribed to truthy `contactRes` → success toast.

Fix: `contact.service.js` now returns `{ status: 'ADDED' }` on insert and `{ status: 'DUPLICATE_CONTACT' }` on duplicate. FE reads `res.status` to determine outcome.

### NOTIFY-P2-BUG-03 — Single candidate add: success toast on duplicate
**Status: CLOSED — BE 2ff6358 / FE 1863842**

Same pattern as BUG-02 for `addCandidates`. Additional fix: FE copy changed from "Contact added." to "Candidate added." in the candidate flow.

### NOTIFY-P2-STRUCTURAL-01 — Broken `forEach(async...)` in bulk contact/candidate controllers
**Status: CLOSED — BE 2ff6358**

`multipleContact` and `multipleCandidate` controllers used `emails.forEach(async option => { ... })` inside `new Promise()`. This pattern ignores all async rejections and can send multiple Express responses (causing "headers already sent" crashes). Replaced with `Promise.allSettled`. Bulk endpoints now return `{ contacts/candidates, summary }` with `successCount`, `failureCount`, `duplicateCount`, `outcome`.

---

## Corrected P0 Status (Session Memory Was Stale)

### PayMongo webhook HMAC — CLOSED (not open)
**Commit:** `97cd657` — "fix(security): PayMongo webhook HMAC signature verification"

`verifyPaymongoSignature()` is fully implemented in `controllers/paymentController.js`:
- HMAC-SHA256 over `paymongo-signature` header (timestamp + raw body)
- Constant-time comparison via `crypto.timingSafeEqual`
- Replay prevention: timestamps older than 5 minutes are rejected
- `server.js` has `verify` callback on `express.json()` to capture `req.rawBody`
- `env.js` maps `PAYMONGO_WEBHOOK_SECRET` from process.env

The session memory checkpoint written on 2026-06-26 incorrectly listed this as P0 open. Code is the ground truth: **this is closed.**

Action still required: confirm `PAYMONGO_WEBHOOK_SECRET` env var is set on Linode production (the code is wired; if the secret is missing, `verifyPaymongoSignature` returns false and all webhooks are rejected 400).

### CORS wildcard — CLOSED (not open)
**Commit:** `d4e34c7` — "fix(security): restrict CORS to app_url instead of wildcard"

`server.js` now uses `app.use(cors({ origin: env.app_url }))`. Not `app.use(cors())`. The session memory said "CORS wildcard awaiting domain list" — this was stale. **Closed.**

---

## Open Items After NOTIFY-P2

### P0 — Blocking for public launch (user action required)

**EA-02: Firebase service account key in git history**
`jobhunt-serviceAccountKey.json` was committed to the BE repo and exists in git history. The file itself may be gitignored now, but the credential is exposed in the git log. Two user actions required:
1. Rotate the Firebase service account key in Firebase Console (invalidate the leaked key)
2. Purge the key from git history (`git filter-repo` or BFG Repo Cleaner) and force-push — coordinate with any team members who have cloned the repo

This is unresolvable by code change alone. Until the key is rotated, a threat actor who has cloned the repo has valid Firebase admin credentials.

### P1 — High priority code/ops items

**GitHub PAT for Linode expired**
The GitHub Personal Access Token used by Linode for `git pull` has expired. Current workaround: deploy BE via SCP (`scp file root@139.162.11.242:/var/www/_work/get-hired-BE/`) then `ssh root@139.162.11.242 "pm2 restart all"`. Renew at github.com/settings/tokens.

**OG image missing**
`src/assets/brand/gethired-og-default.png` does not exist. `SeoService` references this path; every page using SeoService has a broken `og:image` and `twitter:image` meta tag. Link previews on LinkedIn, Facebook, Twitter/X, WhatsApp, and Viber show no image. A branded 1200×630px PNG is required — this is a design/asset task, not a code change. The `SeoService` constant and `angular.json` assets config are already written; the file just needs to be created and committed.

**PAYMONGO_WEBHOOK_SECRET env var on Linode**
The HMAC code is shipped (see above). Verify the env var is set in Linode production. If not set, all PayMongo webhooks are rejected 400 (fail-closed, no data risk, but payment events will not process).

### P2 — Race conditions / async correctness

**NOTIFY-P2-DEFERRED-01: `createGroup`/`updateGroup` broken `forEach(async...)`**
`contactsController.js` lines 222 and 272 still use `emails.forEach(async option => { ... })` inside `new Promise()`. This is the same broken pattern fixed in NOTIFY-P2 for `multipleContact`/`multipleCandidate`. It does not cause false-positive toasts here (different response paths) but does carry the same Express "headers already sent" race condition risk when multiple emails fail. Same `Promise.allSettled` fix applies.

**NEW-FINDING-01: `interview.service.js` broken `forEach(async...)`**
`services/interview.service.js` line 278 contains the same broken pattern: `removeDuplicates.forEach(async recipient => { ... })` inside `new Promise()`. This is the interview invite email-sending flow. If `sendEmailInterview` throws for any recipient, the async error is silently swallowed and the containing Promise never resolves or rejects. The `numberOfRecipient` count may be wrong on partial failure. Same `Promise.allSettled` refactor applies.

Affected: interview invite flow when sending to group/contact lists with any email failure.

**warning-snackbar color contrast**
`#f59e0b` amber on white background: contrast ratio approximately 2.5:1, below WCAG AA (4.5:1 required for normal text). The copy conveys outcome in words (color is supplementary), so this is not a critical bug, but it is a WCAG AA failure. Consider `#b45309` (dark amber, ~5.1:1).

### P3 — UX polish / accessibility

**danger-snackbar should use `aria-live="assertive"`**
Angular Material's `MatSnackBar` uses `aria-live="polite"` by default. Error-outcome toasts should use `aria-live="assertive"` so screen readers announce them immediately. Requires a custom snackbar component to override Angular Material's default. Deferred from NOTIFY-P2.

**Empty-state UI when all invites fail**
Currently the dialog closes after showing the error toast when all invites fail. Better UX: keep the dialog open with an inline error state so the employer can correct emails without reopening. Deferred from NOTIFY-P2.

**Unit tests for toast outcome logic**
No `.spec.ts` files exist in the contact/candidate dialog directories. Automated coverage for the three component toast decision branches. Low priority until a component testing pattern is established for the FE.

### P4 — Low priority

**Failed-email indicator in `invitedUsersList`**
On partial-success company user invites, the dialog renders `invitedUsersList` which includes `status: "failed"` items. A red icon on failed items would make partial-success self-explanatory. Deferred from NOTIFY-P2.

**`getApplicant()` still sends `?id=` query param**
BE ignores this param (uid is derived from JWT). FE cleanup deferred.

---

## Recommended Execution Order

1. **User action (immediate):** Rotate Firebase service account key + purge from git history → closes last public-launch P0
2. **Ops verification (immediate):** Confirm `PAYMONGO_WEBHOOK_SECRET` is set on Linode → payment webhooks functional
3. **User action (1 day):** Renew GitHub PAT on Linode → restore normal BE deploy flow
4. **Design/asset task:** Create 1200×630px OG image → closes SEO/brand P1
5. **Next code sprint:** Fix `createGroup`/`updateGroup` and `interview.service.js` async forEach → closes both P2 race conditions in one targeted BE pass
6. **Accessibility sprint:** danger-snackbar assertive, warning-snackbar contrast → closes a11y P3s

# GETHIRED — Launch Checklist
## NOTIFY-P2: Contact/Candidate Invite False-Positive Toast Fix
**Generated:** 2026-06-26
**Deployment:** BE 2ff6358 / FE 1863842
**Supersedes:** Previous launch checklist (Applicant Completeness UI — FE 5ab9a05 / BE 422d340)

---

## Gate Overview

| Gate | Status | Hard blockers remaining |
|------|--------|------------------------|
| Internal demo | **SAFE — no blockers** | None |
| Invite-only beta | **SAFE — no blockers** | None |
| Public launch | **BLOCKED** | EA-02 (Firebase key history purge + rotation) |

---

## GATE 1 — Internal Demo

> Current state: SAFE. No items block an internal demo. All P0 and P1 auth/security issues that affect demo stability are closed.

### 1.1 — Smoke test NOTIFY-P2 fixes (required before demoing employer flows)

- [ ] Log in as an employer. Navigate to Contacts → Import/Add.
- [ ] Invite a company user with an email that will fail (invalid domain). Verify: NO green success toast. Error toast appears instead.
- [ ] Add a contact that already exists. Verify: info toast ("already exists" or similar). No "Successfully added" green toast.
- [ ] Add a new contact. Verify: green success toast appears correctly.
- [ ] Bulk import contacts (CSV or list) with a mix of valid and duplicate emails. Verify: partial-success warning toast with counts. No green success toast if all are duplicates.

### 1.2 — Confirm both repos deployed in sync

- [ ] BE HEAD on Linode: `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git log --oneline -1"` — must show `2ff6358`.
- [ ] FE HEAD on Linode (via GitHub Actions): confirm FE deploy workflow ran for commit `1863842`.
- [ ] Verify BE PM2 is online: `ssh root@139.162.11.242 "pm2 list"` — status must be `online`.

**Gate 1 status:** [ ] PASS / [ ] BLOCKED

---

## GATE 2 — Invite-Only Beta

> Current state: SAFE. No items block beta. The remaining open items (Firebase key, OG image, expired PAT) do not affect beta functionality or data security in the beta context. PayMongo HMAC is confirmed closed (commit 97cd657).

### 2.1 — All Gate 1 items pass

- [ ] Gate 1 is fully PASS before proceeding.

### 2.2 — PayMongo webhook env var confirmed on production

- [ ] `ssh root@139.162.11.242 "grep PAYMONGO_WEBHOOK_SECRET /var/www/_work/get-hired-BE/.env | head -3"` — confirm `PAYMONGO_WEBHOOK_SECRET=<value>` is present and non-empty.
- [ ] If missing: add to `.env` on Linode and `pm2 restart all`. The code is already shipped; only the env var is needed.
- [ ] Smoke test: trigger a test PayMongo webhook event from the PayMongo dashboard. Confirm BE returns 200 (not 400). Check PM2 logs for `[paymentController]` output.

### 2.3 — GitHub PAT renewed (deploy convenience, not security blocker)

- [ ] Renew GitHub Personal Access Token at github.com/settings/tokens (classic, repo scope).
- [ ] Update token on Linode: `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git remote set-url origin https://<PAT>@github.com/<org>/get-hired-BE.git"`.
- [ ] Verify: `ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull"` succeeds.
- [ ] Note: this is a developer convenience fix, not a user-facing or security item. Beta can proceed without it (SCP workaround is functional).

### 2.4 — Regression check: employer invite flows intact

- [ ] Create a new contact group. Add members. Verify no Express crash in BE logs.
- [ ] Update an existing contact group (add/remove members). Verify no "headers already sent" error in PM2 logs.
- [ ] Send an interview invite to a list of recipients. Verify all emails send or fail gracefully (no hung Promise, no crash).

### 2.5 — Core hire flow regression (not touched by NOTIFY-P2, but verify before beta)

- [ ] Public job listing loads (`/jobs`).
- [ ] Job detail page loads (`/jobs/:id`).
- [ ] Applicant can submit an application.
- [ ] Recruiter can view applicant pipeline.
- [ ] Auth: login, logout, token refresh all work.

**Gate 2 status:** [ ] PASS / [ ] BLOCKED

---

## GATE 3 — Public Launch

> Current state: **BLOCKED**. Two items must be resolved before public launch.

### 3.1 — BLOCKER: Firebase service account key history purge (EA-02)

**This is the only hard P0 blocker for public launch.**

The file `jobhunt-serviceAccountKey.json` was committed to the BE repo and exists in git history. The current live credential gives Firebase admin access (read/write to Firestore, Firebase Auth, etc.).

Steps — coordinate with all team members who have cloned the repo:

- [ ] **Step 1 (Firebase Console):** Go to Firebase Console → Project Settings → Service Accounts → Generate new private key. Download the new key. Save it securely (not to the repo).
- [ ] **Step 2 (Revoke old key):** In Firebase Console, revoke/delete the old service account key that was committed. This invalidates the exposed credential immediately.
- [ ] **Step 3 (Update production):** Replace `jobhunt-serviceAccountKey.json` on Linode at `/var/www/_work/get-hired-BE/` with the new key file. Restart PM2.
- [ ] **Step 4 (Git history purge):** Using BFG Repo Cleaner or `git filter-repo`, remove `jobhunt-serviceAccountKey.json` from all commits in BE repo history.

  ```bash
  # BFG approach (run from a fresh clone):
  bfg --delete-files "jobhunt-serviceAccountKey.json" get-hired-BE.git
  cd get-hired-BE
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  git push --force --all
  git push --force --tags
  ```

- [ ] **Step 5 (Team re-clone):** All team members must delete their local clone and re-clone. Do not merge/pull — the rewrite changes commit hashes.
- [ ] **Step 6 (Verify):** `git log --all --full-history -- "*serviceAccountKey*"` — must return no results.
- [ ] **Step 7 (Gitignore):** Confirm `*serviceAccountKey*.json` is in `.gitignore`. Add if missing.

**Status:** [ ] PASS / [ ] BLOCKED

### 3.2 — BLOCKER: OG image asset created

Before public launch, every page shared on social media should show a branded preview.

- [ ] Design and export a 1200×630px PNG as `gethired-og-default.png`.
- [ ] Add it to `get-hired-FE/src/assets/brand/gethired-og-default.png`.
- [ ] Verify `angular.json` assets config includes `src/assets/brand/`.
- [ ] Verify `SeoService` constant points to this path.
- [ ] Deploy FE. Test by pasting `https://gethiredonline.app` into the LinkedIn Post Inspector (`https://www.linkedin.com/post-inspector/`) — verify preview image appears.
- [ ] Test on Facebook Sharing Debugger (`developers.facebook.com/tools/debug`).

**Status:** [ ] PASS / [ ] BLOCKED

### 3.3 — All Gate 1 and Gate 2 items pass

- [ ] Gate 1: PASS
- [ ] Gate 2: PASS

### 3.4 — Fix async race conditions before high-traffic launch

Not a hard blocker, but should be fixed before significant traffic on employer invite/interview flows:

- [ ] `createGroup`/`updateGroup` in `contactsController.js` (lines 222, 272): replace `forEach(async)` with `Promise.allSettled`. (NOTIFY-P2-DEFERRED-01)
- [ ] `interview.service.js` line 278: same fix for interview invite email-sending. (NEW-FINDING-01)
- [ ] Deploy BE after both fixes. Verify no PM2 errors on group create/update and interview invite flows.

### 3.5 — WCAG AA compliance check

- [ ] Verify `warning-snackbar` contrast meets WCAG AA. If `#f59e0b` is still in use, update to `#b45309` in `styles.scss`. Deploy FE.
- [ ] Confirm `danger-snackbar` aria-live behavior is acceptable (or ship custom component with `assertive`).

**Gate 3 status:** [ ] PASS / [ ] BLOCKED

---

## Checklist Sign-Off

| Gate | Status | Verified by | Date |
|------|--------|-------------|------|
| Gate 1 — Internal demo | | | |
| Gate 2 — Invite-only beta | | | |
| Gate 3A — Firebase key purge | | | |
| Gate 3B — OG image | | | |
| Gate 3C — Async race fixes | | | |
| Gate 3 — Public launch | | | |

---

## Quick Reference: Deploy Commands

**BE deploy (current workaround while PAT expired):**
```powershell
# From local PowerShell — deploy a specific file
scp "C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE\<path\to\file>" root@139.162.11.242:/var/www/_work/get-hired-BE/<path/to/file>
ssh root@139.162.11.242 "pm2 restart all"
```

**FE deploy:**
Push to GitHub master — GitHub Actions auto-deploys.

**Check BE logs:**
```powershell
ssh root@139.162.11.242 "pm2 logs --lines 50"
```

**Check BE PM2 status:**
```powershell
ssh root@139.162.11.242 "pm2 list"
```

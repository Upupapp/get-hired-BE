# GETHIRED ACTIONS — Recent Deployment Backlog
## NOTIFY-P2: Contact/Candidate Invite False-Positive Toast Fix
**Generated:** 2026-06-26
**Deployment:** BE 2ff6358 / FE 1863842
**Supersedes:** Previous backlog (Applicant Completeness UI — FE 5ab9a05 / BE 422d340)

---

## Full Backlog Table

| ID | Title | Status | Priority | Owner | Effort | Notes |
|----|-------|--------|----------|-------|--------|-------|
| **NOTIFY-P2-BUG-01** | Company user invite: false-positive success toast on all-failed | CLOSED | — | FE | — | Closed FE 1863842: reads per-email `status`; `successCount===0` → no success toast |
| **NOTIFY-P2-BUG-02** | Single contact add: success toast on duplicate | CLOSED | — | BE+FE | — | Closed 2ff6358/1863842: `status: 'DUPLICATE_CONTACT'` returned from service |
| **NOTIFY-P2-BUG-03** | Single candidate add: success toast on duplicate + wrong copy | CLOSED | — | BE+FE | — | Closed 2ff6358/1863842: `status: 'DUPLICATE_CANDIDATE'`; copy "Contact" → "Candidate" |
| **NOTIFY-P2-STRUCT-01** | Broken `forEach(async...)` in multipleContact/multipleCandidate | CLOSED | — | BE | — | Closed 2ff6358: replaced with `Promise.allSettled`; bulk returns `{summary}` |
| **SEC-PAYMONGO-P0** | PayMongo webhook: no HMAC signature verification | CLOSED | — | BE | — | Closed 97cd657: `verifyPaymongoSignature()` with HMAC-SHA256 + replay protection |
| **SEC-CORS-P1** | CORS wildcard (`app.use(cors())`) | CLOSED | — | BE | — | Closed d4e34c7: restricted to `env.app_url` |
| **SEC-BOLA-SEC01** | BOLA on GET /applicant/userprofile | CLOSED | — | BE | — | Closed prior sprint |
| **SEC-BOLA-SEC02** | BOLA on GET /job/details uid param | CLOSED | — | BE+FE | — | Closed prior sprint |
| **SEC-UID-SEC07** | uid spoofing in verifyRoles + logout | CLOSED | — | BE | — | Closed prior sprint |
| **EA-02** | Firebase service account key in git history | OPEN | P0 | User-action | XL | `jobhunt-serviceAccountKey.json` in git log; requires key rotation in Firebase Console + `git filter-repo` history purge + force-push; blocks public launch |
| **PAYMONGO-ENV** | Confirm `PAYMONGO_WEBHOOK_SECRET` env var set on Linode | OPEN | P1 | User-action | XS | Code wired (97cd657); if env var missing on prod, all webhooks rejected 400 (fail-closed; no data risk but payment events won't process) |
| **PAT-LINODE** | GitHub PAT for Linode `git pull` expired | OPEN | P1 | User-action | XS | Renew at github.com/settings/tokens; current workaround: SCP per-file deploy |
| **OG-IMAGE** | OG image `gethired-og-default.png` does not exist | OPEN | P1 | User-action | S | Design a 1200×630px branded PNG; add to `src/assets/brand/`; `SeoService` + `angular.json` already reference the path; broken og:image on all pages |
| **NOTIFY-P2-DEFERRED-01** | `createGroup`/`updateGroup` broken `forEach(async...)` | OPEN | P2 | BE | S | contactsController.js lines 222 + 272; same race condition as STRUCT-01; "headers already sent" risk when email fails; no false-positive toast risk in this flow |
| **NEW-FINDING-01** | `interview.service.js` broken `forEach(async...)` | OPEN | P2 | BE | S | interview.service.js line 278: `removeDuplicates.forEach(async recipient => ...)`; silently swallows email send failures; `numberOfRecipient` count wrong on partial failure; same `Promise.allSettled` fix |
| **A11Y-WARN-CONTRAST** | `warning-snackbar` color contrast ~2.5:1 (WCAG AA fail) | OPEN | P2 | FE | XS | `#f59e0b` on white; recommend `#b45309` (~5.1:1); copy conveys outcome in words so not critical, but is a WCAG AA failure |
| **A11Y-DANGER-ARIA** | `danger-snackbar` needs `aria-live="assertive"` | OPEN | P3 | FE | M | MatSnackBar uses `polite` by default; errors should use `assertive`; requires custom snackbar component |
| **NOTIFY-P2-DEFERRED-02** | Empty-state UI when all invites fail (keep dialog open) | OPEN | P3 | FE | S | Currently dialog closes on all-failed; better UX: keep open with inline error state so employer can correct emails |
| **TEST-TOAST-BRANCHES** | Unit tests for toast outcome logic in 3 dialog components | OPEN | P3 | FE | M | No `.spec.ts` in contact/candidate dialog directories; cover success/partial/duplicate/all-failed branches; deferred until FE test pattern established |
| **NOTIFY-P2-DEFERRED-03** | Show failed-email indicator in `invitedUsersList` | OPEN | P4 | FE | S | Partial-success: red icon on `status: "failed"` items in the list so employer can see which addresses failed |
| **FE-CLEANUP-GETAPPLICANT** | `getApplicant()` still sends `?id=` query param | OPEN | P4 | FE | XS | BE ignores param (uid from JWT); dead code; low-risk cleanup |

---

## Summary Counts

| Status | Count |
|--------|-------|
| CLOSED this deployment (NOTIFY-P2 bugs + structural) | 4 |
| CLOSED prior sprints (now confirmed and recorded here) | 5 |
| OPEN — P0 | 1 |
| OPEN — P1 | 3 |
| OPEN — P2 | 3 |
| OPEN — P3 | 3 |
| OPEN — P4 | 2 |
| **Total OPEN** | **12** |

---

## Closed Items Detail

### Items closed this deployment (NOTIFY-P2 — BE 2ff6358 / FE 1863842)

**NOTIFY-P2-BUG-01:** `import-add-user.component.ts` — checks `e.status !== 'failed'` per email; never shows success toast when `successCount === 0`.

**NOTIFY-P2-BUG-02:** `contact.service.js` returns `status: 'ADDED'|'DUPLICATE_CONTACT'`; `import-add-contact.component.ts` reads `res.status` for single, `res.summary` for bulk.

**NOTIFY-P2-BUG-03:** `candidate.service.js` returns `status: 'ADDED'|'DUPLICATE_CANDIDATE'`; `import-add-candidate.component.ts` same; copy "Contact added." → "Candidate added.".

**NOTIFY-P2-STRUCT-01:** `contactsController.js` `multipleContact` + `candidateController.js` `multipleCandidate` — `forEach(async)` replaced with `Promise.allSettled`; bulk response now `{ contacts/candidates, summary: { totalRequested, successCount, failureCount, duplicateCount, outcome } }`.

### Items confirmed closed (prior sprints — recorded here for completeness)

**SEC-PAYMONGO-P0** (commit 97cd657): `verifyPaymongoSignature()` added; HMAC-SHA256 over `paymongo-signature` header; constant-time comparison; replay protection. Session memory erroneously listed this as open P0.

**SEC-CORS-P1** (commit d4e34c7): `cors({ origin: env.app_url })`. Session memory erroneously listed this as P1 open.

**SEC-BOLA-SEC01** (prior sprint): BOLA on `GET /applicant/userprofile`.

**SEC-BOLA-SEC02** (prior sprint): BOLA on `GET /job/details` uid param.

**SEC-UID-SEC07** (prior sprint): uid spoofing in verifyRoles + logout.

---

## New Findings From This Cycle

### NEW-FINDING-01 — `interview.service.js` broken `forEach(async...)`
**Severity: P2**
**File:** `services/interview.service.js` line 278

```javascript
let multiple = new Promise((resolve, reject) => {
  removeDuplicates.forEach(async recipient => {    // ← broken pattern
    const sendEmail = await sendEmailInterview(recipient, companyName)
    thisIsRecipient.push(recipient)
    if (thisIsRecipient.length == removeDuplicates.length) resolve()
  })
})
```

The same broken pattern that NOTIFY-P2 fixed in the contact/candidate bulk flows exists here. `forEach` ignores the returned Promises from the async callbacks. If `sendEmailInterview` rejects for any recipient:
- The error is silently swallowed
- `thisIsRecipient.push` may never fire for that recipient
- `resolve()` may never be called if the failing recipient is the last one (the Promise hangs)
- `numberOfRecipient` will be wrong

This affects the interview invite email-sending flow when interviewing contacts/groups with any invalid email address.

**Fix:** Replace with `Promise.allSettled(removeDuplicates.map(async recipient => { ... }))`. Pattern identical to NOTIFY-P2 fix.

**Owner:** BE
**Effort:** S
**Files:** `services/interview.service.js` (~lines 275-288)

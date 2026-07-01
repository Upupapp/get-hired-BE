# GETHIRED RELEASE QUALITY GATE V6
**Date:** 2026-07-01 | LinkedIn OIDC + Company Setup Modal + Sign-out Fix

---

## Purpose

This gate controls whether each V6 feature is safe to enable in production. Review all gates before setting `LINKEDIN_AUTH_ENABLED=true` or deploying the company setup modal.

---

## Gate Summary

| Gate | Feature Area | Status | Details |
|---|---|---|---|
| A | Safe to Redesign (no regressions) | **PASS** | V6 changes are all additive |
| B | Safe to Launch LinkedIn Auth | **FAIL** | Finding #3: role_required flow broken |
| C | Safe to Launch Company Setup Modal | **PASS** | All CTAs correctly implemented |
| D | Security Gate (LinkedIn) | **PASS with caveat** | Sound architecture; id_token sig soft check |
| E | Sign-out Fix | **PASS** | logout() confirmed correct in employer-panel |
| F | Cert API Fix | **PASS** | id/canonicalKey stripped; confirmed in source |
| G | Accessibility/Mobile Gate | **PASS with caution** | Modal ARIA correct; LinkedIn form needs audit |

---

## Gate A — Safe to Redesign

**Result: PASS**

Evidence:
- LinkedIn auth routes registered AFTER Google auth routes (server.js line 155), preserving route registration order
- EmployerCompanySetupSuccessModalComponent replaces `UpdatedDialogComponent` only in `dialogSuccess()` — all other UpdatedDialogComponent usages (job-create, job-list, employer-account-settings) are unchanged
- employer-panel.component.ts `logout()` fix: was previously missing `router.navigate` call; now correctly navigates to /signin — this is a bug fix, not a regression
- auth.module.ts: LinkedIn route `/linkedin/complete` added without removing or conflicting with existing routes (signin, signup, choose-role, etc.)
- No existing API routes modified
- getJobCertificationRequirements() change is backward-compatible (FE interface marks id/canonicalKey as optional)

Checked: No eager/lazy routing conflicts introduced (auth.module uses RouterModule.forChild — correct)

---

## Gate B — Safe to Launch LinkedIn Auth (FAIL)

**Result: FAIL — DO NOT SET LINKEDIN_AUTH_ENABLED=true until Finding #3 is fixed**

### Blocker 1 — Finding #3: role_required flow broken for new users (CRITICAL)

**File:** `controllers/linkedinAuthController.js` lines 502-511

**Root Cause:**
When `/callback` issues a `role_required` ticket and the FE calls `/complete`, the response includes a `linkedinPendingToken` created by:
```javascript
makeTicketJwt('pending:linkedin:' + ticketData.liSub, 'pending', intent, returnTo, true)
```

The `makeTicketJwt()` function signature is:
```javascript
export function makeTicketJwt(uid, status, intent, returnTo, roleRequired) {
  var jti = crypto.randomBytes(24).toString('hex');
  var payload = { jti, uid, status, intent, rt: returnTo || '', rr: !!roleRequired };
  return jwt.sign(payload, env.secret, { algorithm: 'HS256', expiresIn: TICKET_TTL_SECONDS });
}
```

The payload does NOT include email, firstName, lastName, or photoUrl.

When `/choose-role` is called with this `linkedinPendingToken`, it tries to recover profile at lines 506-510:
```javascript
email     = pendingPayload.email     || '';   // undefined → ''
firstName = pendingPayload.firstName || '';   // undefined → ''
...
if (!email) return res.status(400).json({ message: 'LinkedIn session data is incomplete...' });
```

Result: ALL new LinkedIn users hitting the `role_required` → choose-role path will receive a 400 error.

**Fix (2 lines):** Add profile data to the pending token payload in `makeTicketJwt` (or use a separate helper for pending tokens that includes email/firstName/lastName/photoUrl):

```javascript
// In linkedinAuthController.js, around line 408 (role_required branch):
linkedinPendingToken: makeTicketJwt('pending:linkedin:' + ticketData.liSub, 'pending', intent, returnTo, true)
// Change to a helper that also embeds email/firstName/lastName/photoUrl in the payload
```

**Workaround until fixed:** Ensure all LinkedIn sign-in flows use an explicit `intent` (jobseeker or employer) so the role_required branch is never reached. This can be done by always setting intent on the sign-in buttons.

### Blocker 2 — DB Tables Not Verified in Production

**Issue:** The `auth_identities` and `oauth_tickets` tables are created by `scripts/createAuthIdentitiesTable.js`, a one-shot manual script. There is no automated check at server startup that these tables exist. If the script was not run, all LinkedIn callback calls will throw unhandled PostgreSQL errors (caught by the outer try/catch → redirectError('server_error')).

**Fix:** Run the script in production, then verify:
```sql
SELECT COUNT(*) FROM gethired.auth_identities;
SELECT COUNT(*) FROM gethired.oauth_tickets;
```

Both should return 0 rows with no error.

### Non-blocking Issues
- LinkedIn ID token signature not cryptographically verified (Finding #1) — mitigated by userinfo fetch being server-side only; acceptable for V1
- oauth_tickets has no index on expires_at (Finding #5) — performance only, not a launch blocker

---

## Gate C — Safe to Launch Company Setup Modal

**Result: PASS**

Evidence:
- `EmployerCompanySetupSuccessModalComponent` declared and entryComponent'd in `employer-settings.module.ts` ✅
- `dialogSuccess()` passes all 3 required data fields: `companyName`, `companySlug`, `profileCompleteness` ✅
- 4 CTAs all implemented: postFirstJob, completeProfile, viewPublicProfile, goToDashboard ✅
- `dialogRef.close()` called before navigation on all CTAs ✅
- `viewPublicProfile()` correctly uses `*ngIf="companySlug"` — button hidden when no slug ✅
- `window.open(..., 'noopener')` is safe (no opener reference) ✅
- `sessionStorage.setItem` wrapped in try/catch — won't crash in private browsing ✅
- Modal accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` set ✅
- `disableClose: false` — user can dismiss modal without being forced to navigate ✅

---

## Gate D — Security Gate (LinkedIn OIDC)

**Result: PASS with caveat**

### Confirmed Secure
| Check | Status |
|---|---|
| State parameter is signed JWT — cannot be forged without env.secret | PASS |
| State TTL = 10 min — old states rejected | PASS |
| Ticket is single-use — consumeTicketDb atomically marks used | PASS |
| Ticket TTL = 5 min | PASS |
| Client secret never leaves server | PASS |
| returnTo open-redirect protection — sanitizeReturn() blocks external URLs | PASS |
| Email verified required — unverified LinkedIn emails blocked | PASS |
| Admin role cannot be selected in choose-role | PASS |
| SQL injection — all queries use parameterized $1/$2 | PASS |
| Firebase custom token used (not LinkedIn tokens on client) | PASS |
| /unlink and /link-status protected by verifyFirebaseIdToken | PASS |
| LinkedIn tokens never returned to FE | PASS |
| Dummy password for LinkedIn users is non-guessable | PASS |

### Caveats (Not Blockers)
| Issue | Risk | Notes |
|---|---|---|
| ID token sig not verified (Finding #1) | Low | Mitigated: identity from userinfo endpoint (server-side, auth'd with access_token). Add JWKS verification in V2 |
| No rate limiting on /callback | Medium | Global rate limiter covers it, but no specific limit on LinkedIn callback. Consider adding after launch |
| oauth_tickets stale cleanup not automated | Low | Stale rows don't enable attacks; cleanup script runs once. Consider a cron job |

---

## Gate E — Sign-out Fix

**Result: PASS**

**File:** `employer-panel.component.ts` lines 226-229

```typescript
logout(): void {
  this.coreService.logout();
  this.router.navigate(['/signin']);
}
```

Both calls confirmed present in the current source file. The sign-out flow:
1. Clears localStorage/session via `coreService.logout()`
2. Navigates to /signin
3. Auth guards on /recruiter/* routes will redirect any direct URL attempt back to /signin

---

## Gate F — Cert API Fix

**Result: PASS**

**File:** `services/job.service.js` lines 230-241

The mapper confirms `id` and `canonicalKey` are NOT present in the return object:
```javascript
return rows.map((row) => ({
  name: row.name,
  type: row.type,
  importance: row.importance,
  issuingAuthority: row.issuing_authority,
  expiryRequired: row.expiry_required,
  verificationRequired: row.verification_required,
}));
```

FE interface marks `id?: string` and `canonicalKey?: string | null` as optional — backward-compatible ✅

---

## Gate G — Accessibility / Mobile Gate

**Result: PASS with caution**

### Company Setup Modal
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby="gh-setup-modal-title"` ✅
- Checklist items have `aria-label` with "completed" / "to do" suffix ✅
- All buttons have `type="button"` ✅
- External link button has `aria-label="View public company profile — opens in new tab"` ✅
- SVG decorations have `aria-hidden="true"` ✅
- Trial badge has `aria-label="Free trial active for 7 days"` ✅

### LinkedIn Components
- `linkedin-button.component.html` — not audited for ARIA (component reads `label` input for button text)
- `linkedin-complete.component.html` — not audited; error states need `role="alert"` for screen readers
- `role-classification.component.html` — not audited; role selection needs keyboard navigation check

**Recommendation:** Run a11y audit (axe-core) on linkedin-button and linkedin-complete templates before launch.

---

## Release Decision Matrix

| Feature | Gate Status | Can Deploy? | Condition |
|---|---|---|---|
| Cert API fix (strip id/canonicalKey) | PASS | **YES — already safe** | Already deployed per V5 |
| Company setup success modal | PASS | **YES** | No blockers |
| Employer panel sign-out fix | PASS | **YES** | No blockers |
| LinkedIn OIDC (LINKEDIN_AUTH_ENABLED=true) | FAIL | **NO** | Fix Finding #3 + verify DB tables first |

---

## Pre-Launch Checklist for LinkedIn Auth

- [ ] Fix Finding #3: embed email/firstName/lastName/photoUrl in pending token payload
- [ ] Run `node -r esm scripts/createAuthIdentitiesTable.js` in production
- [ ] Verify both tables exist with SELECT
- [ ] Set `LINKEDIN_AUTH_ENABLED=true` in production .env
- [ ] Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` in production .env
- [ ] Verify LINKEDIN_REDIRECT_URI matches the callback URL registered in LinkedIn Developer Console
- [ ] Test B1-01 through B1-06 in production (smoke test)
- [ ] Test B4-01 (ticket replay) in production
- [ ] All sections of GETHIRED_REGRESSION_CHECKLIST_V6.md pass (except B3-05 if intent buttons are used)

---

## V6 Release Quality Gate Final Score

| Criterion | Weight | Score |
|---|---|---|
| No critical regressions to existing flows | 25% | 25/25 — PASS |
| LinkedIn OIDC security sound | 25% | 22/25 — PASS (id_token caveat) |
| LinkedIn OIDC functional | 25% | 10/25 — FAIL (Finding #3) |
| Modal + sign-out fixes correct | 15% | 15/15 — PASS |
| Cert API fix correct | 10% | 10/10 — PASS |
| **Total** | **100%** | **82/100** |

**Verdict: CONDITIONAL GO — safe to deploy modal + sign-out + cert fix; hold LinkedIn OIDC until Finding #3 fixed.**

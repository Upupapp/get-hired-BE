# GETHIRED STITCH FIX LOG V6
**Date:** 2026-07-01 | LinkedIn OIDC + Company Setup Modal

---

## Summary

No code changes applied in V6. The LinkedIn OIDC integration is functionally correct for the happy path. One medium-severity data-quality gap (LI-3: role_required pending token missing profile fields) was identified and documented as an optional safe enhancement (see BACKEND_OPTIONAL_CONTRACT_FIXES_V6.md).

---

## Fixes Applied: 0

| ID | Fix | File | Status |
|---|---|---|---|
| — | No changes required | — | — |

---

## Carried Forward from Prior Stitch Runs

| ID | Fix | File | Run |
|---|---|---|---|
| STI-001 | requestUri: 'http://localhost' → 'https://gethiredonline.app' | `googleAuthController.js` | V5 |

---

## Deferred / Optional Enhancements

| ID | Description | File | Priority |
|---|---|---|---|
| STI-LI-01 | Embed email/firstName/lastName/photoUrl in `linkedinPendingToken` so `linkedinChooseRole` can recover profile data without depending on auth_identities pre-insert | `middleware/linkedinSession.js` → `makeTicketJwt()` | Medium |
| STI-LI-02 | Add periodic cleanup of expired `oauth_tickets` rows (PII hygiene) | New cron task or DB trigger | Low |
| STI-LI-03 | Add `success: true` wrapper and `provider: 'linkedin'` field to `/auth/linkedin/link-status` response for shape consistency | `linkedinAuthController.js` `linkedinLinkStatus` | Low |

---

## Why No Code Changes Were Made

1. **LI-3 gap (profile data):** The fallback in `linkedinChooseRole` (empty string names) does not crash — the user account is created and can fill in profile data afterward. Fixing this requires modifying `makeTicketJwt` to accept additional fields, which is a safe enhancement but not a blocker.

2. **link-status flat shape:** FE uses `Observable<any>` — no type failure. The flat shape is now documented as the real contract.

3. **oauth_tickets cleanup:** Operational concern, not a code bug. A cron or BE task to purge expired rows is recommended but not required for launch.

---

## V6 Findings That DO NOT Require Code Changes

| Finding | Reason |
|---|---|
| `role_required` profile fields empty on best-effort path | Not a crash; user can complete profile later |
| `link-status` returns flat shape (no `success` wrapper) | FE handles `Observable<any>`; behavior is correct |
| linkedin PKCE omitted | By design — confidential client |
| ID token soft-decoded only | By design — userinfo is authoritative identity source |
| `linkedinAuthRoutes` mounted before billingRoutes | Correct and intentional (documented in server.js comment) |

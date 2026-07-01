# GETHIRED BACKEND OPTIONAL CONTRACT FIXES V6
**Date:** 2026-07-01 | Safe enhancements only — no endpoint removal, no route renames

---

## Purpose

Optional safe fixes to improve contract completeness and data quality. None of these are blockers for launch. All are backward-compatible.

---

## FIX-OPT-LI-01: Embed Profile Data in linkedinPendingToken

**Priority:** Medium
**Files:** `middleware/linkedinSession.js` (makeTicketJwt), `controllers/linkedinAuthController.js` (linkedinComplete)
**Problem:** When BE issues `linkedinPendingToken` for `role_required` users, it calls `makeTicketJwt('pending:linkedin:' + liSub, 'pending', intent, returnTo, true)`. The JWT payload contains only `{ jti, uid, status, intent, rt, rr }`. When `linkedinChooseRole` reads `pendingPayload.email`, `pendingPayload.firstName`, etc., these fields are `undefined`, falling back to empty string. New users are created with blank name/photo fields.

**Safe fix (no breaking changes):**

In `middleware/linkedinSession.js`, add optional profile fields to `makeTicketJwt`:

```js
// Before:
export function makeTicketJwt(uid, status, intent, returnTo, roleRequired) {
  var jti = crypto.randomBytes(24).toString('hex');
  var payload = { jti, uid, status, intent: intent || 'auto', rt: returnTo || '', rr: !!roleRequired };
  return jwt.sign(payload, env.secret, { algorithm: 'HS256', expiresIn: TICKET_TTL_SECONDS });
}

// After:
export function makeTicketJwt(uid, status, intent, returnTo, roleRequired, profile) {
  var jti = crypto.randomBytes(24).toString('hex');
  var payload = { jti, uid, status, intent: intent || 'auto', rt: returnTo || '', rr: !!roleRequired };
  // Embed abbreviated profile fields if provided (short keys to keep JWT compact)
  if (profile) {
    if (profile.email)     payload.e  = String(profile.email).substring(0, 254);
    if (profile.firstName) payload.fn = String(profile.firstName).substring(0, 64);
    if (profile.lastName)  payload.ln = String(profile.lastName).substring(0, 64);
    if (profile.photoUrl)  payload.pu = String(profile.photoUrl).substring(0, 512);
    if (profile.name)      payload.dn = String(profile.name).substring(0, 128);
  }
  return jwt.sign(payload, env.secret, { algorithm: 'HS256', expiresIn: TICKET_TTL_SECONDS });
}
```

In `controllers/linkedinAuthController.js`, update the `linkedinComplete` role_required branch to pass profile to `makeTicketJwt`:

```js
// Before:
linkedinPendingToken: makeTicketJwt('pending:linkedin:' + ticketData.liSub, 'pending', intent, returnTo, true),

// After:
linkedinPendingToken: makeTicketJwt(
  'pending:linkedin:' + ticketData.liSub,
  'pending', intent, returnTo, true,
  { email: ticketData.email, firstName: ticketData.firstName,
    lastName: ticketData.lastName, photoUrl: ticketData.photoUrl, name: ticketData.name }
),
```

In `linkedinChooseRole`, read the short-key fields with fallback to existing behavior:

```js
// Before:
email     = pendingPayload.email     || '';
firstName = pendingPayload.firstName || '';
lastName  = pendingPayload.lastName  || '';
photoUrl  = pendingPayload.photoUrl  || '';
name      = pendingPayload.name      || '';

// After:
email     = pendingPayload.e  || pendingPayload.email     || '';
firstName = pendingPayload.fn || pendingPayload.firstName || '';
lastName  = pendingPayload.ln || pendingPayload.lastName  || '';
photoUrl  = pendingPayload.pu || pendingPayload.photoUrl  || '';
name      = pendingPayload.dn || pendingPayload.name      || '';
```

**Why safe:** New optional `profile` param to `makeTicketJwt`, short-key fallback in `linkedinChooseRole`. Old tokens (without short keys) still work. No endpoint changed. No DB schema change.

---

## FIX-OPT-LI-02: Add link-status success Wrapper

**Priority:** Low
**File:** `controllers/linkedinAuthController.js` — `linkedinLinkStatus`
**Problem:** `/auth/linkedin/link-status` returns a flat object `{ linked: false }` or `{ linked: true, ... }` without a `success` field. All other auth endpoints return `{ success: true, ... }`.
**Safe fix:**

```js
// Before (not linked):
return res.status(200).json({ linked: false });

// After:
return res.status(200).json({ success: true, data: { linked: false } });

// Before (linked):
return res.status(200).json({ linked: true, linkedEmail: ..., ... });

// After:
return res.status(200).json({ success: true, data: { linked: true, linkedEmail: ..., ... } });
```

**FE change required:** `LinkedInAuthService.getLinkStatus()` returns `Observable<any>`. If callers check `response.linked`, they must be updated to `response.data.linked`. Only apply this fix if all callers of `getLinkStatus()` are also updated.

**Recommendation:** Only apply if a typed interface for `link-status` is introduced. Otherwise, leave the flat shape as the documented contract.

---

## FIX-OPT-LI-03: oauth_tickets Expired Row Cleanup

**Priority:** Low
**Not a code fix — operational task**
**Problem:** `oauth_tickets` rows with `expires_at < NOW()` accumulate indefinitely. These rows contain LinkedIn profile fields (email, name) in the `data` JSON column — PII.
**Options:**
1. Add a DB trigger: `DELETE FROM gethired.oauth_tickets WHERE expires_at < NOW() - INTERVAL '7 days'` on INSERT
2. Add a cron job (PM2 or OS-level): weekly cleanup of expired rows
3. Add a BE route (admin-only): `DELETE FROM gethired.oauth_tickets WHERE expires_at < NOW()` triggered on demand

**Recommendation:** Option 2 (weekly cron) is simplest. Can be added to PM2 ecosystem config.

---

## FIX-OPT-LI-04: Rate-Limit LinkedIn Callback Separately

**Priority:** Low
**File:** `server.js`
**Problem:** `/api/auth/linkedin/callback` is a browser redirect endpoint that currently falls under `authLimiter` (20 req / 15 min per IP). In production, if multiple users on the same office NAT share an IP, a burst of LinkedIn signins could hit this limit.
**Safe fix:** Apply `authLimiter` specifically to `/api/auth/linkedin/complete` and `/api/auth/linkedin/choose-role` (the endpoints that take attacker-controlled JWTs). Raise or exempt `/api/auth/linkedin/callback` since it only accepts code+state from LinkedIn's redirect (harder to abuse from a single IP).

**Recommendation:** Monitor in production before changing. Low risk currently.

---

## NOT Recommended (Out of Scope)

The following are NOT included — they would violate STITCH safety rules:

- Removing any endpoint
- Renaming any route
- Changing `auth_identities` or `oauth_tickets` schema
- Adding new routes not already present
- Changing error response HTTP status codes

# GETHIRED ANTI-CORRUPTION LAYER GUIDE V6
**Date:** 2026-07-01 | Extends V5 with LinkedIn OIDC ACL patterns

---

## Purpose

Anti-corruption layers (ACLs) prevent external models (LinkedIn OIDC, Firebase, PayMongo) from bleeding into the GetHired domain model. This guide documents where ACLs exist, where they should be strengthened, and what the domain model looks like at the boundary.

---

## ACL-1: LinkedIn OIDC → GetHired User (BE Controller)

**Location:** `linkedinAuthController.js` — `buildSessionResponse()` + `createLinkedinUser()`

**What LinkedIn returns (raw model):**
```js
{
  sub: string,           // LinkedIn provider subject ID
  email: string,
  email_verified: bool,
  given_name: string,
  family_name: string,
  name: string,          // display name
  picture: string        // URL
}
```

**What GetHired stores (domain model):**
```
user_credentials: uid, email, role (2|3), password (dummy hash)
users:            uid, email, firstname, lastname, photo_url
auth_identities:  user_uid, provider='linkedin', provider_subject (liSub), provider_email,
                  provider_email_verified, provider_name, provider_picture, linked_at, last_login_at
```

**ACL responsibility:**
- Maps `given_name` → `firstname`, `family_name` → `lastname` (domain naming)
- Normalizes email to lowercase+trim
- Generates deterministic UID from liSub (`'li_' + sha256('linkedin:'+liSub)[0:28]`) — LinkedIn UID never escapes to FE
- Creates dummy password so `user_credentials.password NOT NULL` constraint is satisfied
- Blocks `email_verified=false` users (returns `email_not_verified` error)
- LinkedIn `access_token` and `id_token` never returned to FE — only Firebase tokens are returned

**ACL strength: GOOD.** LinkedIn credentials are fully absorbed at the controller boundary.

---

## ACL-2: Firebase → GetHired Session (BE Controller)

**Location:** `linkedinAuthController.js` — `customTokenToIdToken()` + `buildSessionResponse()`
Also: `googleAuthController.js`

**What Firebase returns:**
```js
{ idToken: string, refreshToken: string, expiresIn: string }
```

**What GetHired returns to FE:**
```js
{ token: string, refreshToken: string, ...rest of SessionShape }
```

**ACL responsibility:**
- Renames `idToken` → `token` for domain consistency
- Does NOT return `expiresIn` — FE does not need to manage token expiry manually
- Firebase custom token (server secret) never returned to FE; only the ID token (verifiable public claim)

**ACL strength: GOOD.**

---

## ACL-3: LinkedIn State JWT → GetHired Transaction (BE Middleware)

**Location:** `middleware/linkedinSession.js`

**External model (LinkedIn OAuth):** `state` as opaque string parameter
**GetHired model:** Typed transaction object `{ codeVerifier, nonce, intent, source, returnTo }`

**ACL responsibility:**
- `createLinkedinState()` encodes typed fields into JWT
- `verifyLinkedinState()` decodes and validates signature before any field is used
- Rejects tampered or expired state (returns null)
- `returnTo` is sanitized by `sanitizeReturn()` — must start with `/`, not `//`, no `<>"'\`` characters, max 256 chars

**ACL strength: GOOD.**

---

## ACL-4: oauth_tickets DB → GetHired Ticket Seam

**Location:** `linkedinAuthController.js` — `storeTicket()` + `consumeTicketDb()`

**Purpose:** Prevent ticket replay across PM2 cluster workers (in-memory check insufficient).

**Contract:**
- `storeTicket(jti, uid, data, expiresAt)` — INSERT with ON CONFLICT DO NOTHING (idempotent)
- `consumeTicketDb(jti)` — atomic UPDATE WHERE used_at IS NULL AND expires_at > NOW() RETURNING uid, data
  - Returns null if ticket already used or expired
  - Single atomic operation prevents TOCTOU race

**ACL responsibility:**
- JTI is cryptographically random 24-byte hex string (not guessable)
- Single-use guarantee enforced at DB level, not application level
- ticket data (LinkedIn profile fields) stored as JSON in `oauth_tickets.data`

**ACL strength: GOOD. One note:** `oauth_tickets.data` stores raw LinkedIn profile fields including email and name. This table should be treated as sensitive personal data. Ensure it is purged periodically (expired rows).

---

## ACL-5: LinkedIn userinfo → Auth Identities Table

**Location:** `linkedinAuthController.js` `linkedinCallback` + `createLinkedinUser()`

**External:** LinkedIn userinfo fields (sub, email, given_name, family_name, name, picture)
**Domain:** `auth_identities` row (provider_subject, provider_email, provider_name, provider_picture)

**ACL responsibility:**
- Stores `name` (display name) as `provider_name`, not firstname/lastname separately
- Stores `sub` as `provider_subject` (namespaced — never confused with GetHired UID)
- Updates `last_login_at` on every login for returning users
- Identity is LOOKED UP before user is created — link-then-create pattern prevents duplicate accounts

**ACL strength: GOOD.**

---

## ACL-6: Modal Data → EmployerCompanySetupSuccessModalComponent

**Location:** `employer-settings.component.ts` → `employer-company-setup-success-modal.component.ts`

**External model (dialog data):**
```typescript
{ companyName: string, companySlug: string, profileCompleteness: number }
```

**Domain model (modal view state):**
```typescript
{ companyName: string, companySlug: string, profileCompleteness: number, checklist: [...] }
```

**ACL responsibility:**
- `ngOnInit()` copies `this.data.*` to local properties with safe fallbacks (`|| 'Your company'`, `|| ''`, `|| 0`)
- `viewPublicProfile()` guards on `this.companySlug` being truthy before opening new tab
- `sessionStorage.setItem('gh_company_setup_success_seen', '1')` — side effect contained within modal

**ACL strength: GOOD.**

---

## ACL-7: PayMongo Webhook (Carried Forward)

**Location:** `paymentRoute.js` / `paymentController.js`

**Risk:** Webhook signature verification must be validated before any DB write. Confirmed present in prior STITCH reports. Monitoring: verify `x-paymongo-signature` header validation is present on production.

---

## ACL Gaps and Recommendations

| ID | Gap | Severity | Recommendation |
|---|---|---|---|
| ACL-G1 | `linkedinPendingToken` does not embed email/names | Medium | Embed `e` (email), `fn` (firstName), `ln` (lastName), `pu` (photoUrl) in `makeTicketJwt` payload (short keys to keep JWT compact) |
| ACL-G2 | `oauth_tickets` rows not purged | Low | Add a cron job or ON CONFLICT expiry cleanup to purge rows WHERE expires_at < NOW() |
| ACL-G3 | `link-status` response missing `success` wrapper | Low | Document as flat contract; update FE typing if strong types added |
| ACL-G4 | LinkedIn `id_token` soft-decoded (no sig check) | Low | Acceptable — userinfo call provides authoritative identity; comment justification is present in code |

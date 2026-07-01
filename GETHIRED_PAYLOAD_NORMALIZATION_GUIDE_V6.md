# GETHIRED PAYLOAD NORMALIZATION GUIDE V6
**Date:** 2026-07-01 | Extends V5 with LinkedIn auth session normalized model

---

## Purpose

Canonical data shapes for FE↔BE payloads. When a BE response differs from what FE expects, a normalizer adapter maps it at the FE service layer. This guide documents the normalized shape and all known deviations.

---

## 1. Normalized Auth Session Shape

All auth providers (email+password, Google, LinkedIn) produce this canonical shape after normalization. FE services store this to localStorage via their respective `storeSession()` methods.

```typescript
interface NormalizedAuthSession {
  id: string;           // Firebase UID
  email: string;
  firstName: string;
  lastName: string;
  role: 1 | 2 | 3;     // 1=admin, 2=employer, 3=job_seeker
  photoUrl: string;
  token: string;        // Firebase ID token (raw, no "Bearer " prefix)
  refreshToken: string;
  withCompany: boolean;
  companyName: string;
  companyId: string | null;
  withActiveSubscription: boolean;
}
```

**localStorage keys written by all storeSession() calls:**
| Key | Value |
|---|---|
| `state` | `'true'` |
| `role` | `String(data.role)` |
| `token` | `'Bearer ' + data.token` |
| `token_authorization` | `data.token` (no Bearer prefix) |
| `refreshToken` | `data.refreshToken` |
| `user` | `JSON.stringify({ _id, email, firstName, lastName, [companyId, companyName] })` |
| `loginMessage` | `'Sign in was successful.'` |

**Verification:** All three auth services (`SigninComponent.loggedIn`, `GoogleAuthService.storeSession`, `LinkedInAuthService.storeSession`) write identical keys. Angular guards read `localStorage.getItem('role')` — confirmed stable across all paths.

---

## 2. Provider Comparison: Session Data Sources

| Field | Email+PW | Google | LinkedIn |
|---|---|---|---|
| `id` (uid) | DB `user_credentials.uid` | Firebase UID from GIS | `'li_' + sha256('linkedin:'+liSub)[0:28]` |
| `token` | Firebase custom token → ID token | Firebase ID token from GIS | Firebase custom token → ID token |
| `firstName` | DB `users.firstname` | Google profile (inferred) | LinkedIn `given_name` |
| `lastName` | DB `users.lastname` | Google profile (inferred) | LinkedIn `family_name` |
| `photoUrl` | DB `users.photo_url` | Google `picture` | LinkedIn `picture` |

**Note for LinkedIn role_required users:** When a new LinkedIn user picks a role, `firstName`/`lastName`/`photoUrl` come from the `linkedinPendingToken` payload. The current `makeTicketJwt` does not embed these fields, so they default to empty string. This is a known gap (see STITCH report LI-3). The user can fill in profile data afterward.

---

## 3. LinkedIn Auth Session — Normalized Flow

```
Browser                    FE Service                BE Controller          LinkedIn/Firebase
  |                            |                           |                     |
  |--[start: intent, returnTo]->|                           |                     |
  |                            |--GET /auth/linkedin/start->|                     |
  |                            |                           |--[302 to LinkedIn]->|
  |<-[302 LinkedIn login page]--|                           |                     |
  |--[user approves, code+state]------------------------------------------->BE  |
  |                            |                  /callback exchange             |
  |                            |                     validate state JWT          |
  |                            |                     POST token endpoint  ------>|
  |                            |                     GET userinfo --------->     |
  |                            |                     resolve/create user         |
  |                            |                     storeTicket(jti) in DB      |
  |                            |                     302 /linkedin/complete?ticket=JWT
  |<-[302 /linkedin/complete?ticket=JWT]        |                     |
  |                            |                           |                     |
  |  LinkedInCompleteComponent.ngOnInit()       |                     |
  |                            |--POST /auth/linkedin/complete { ticket }->|     |
  |                            |                    consumeTicketDb(jti)          |
  |                            |                    createCustomToken(uid) --->Firebase
  |                            |                    signInWithCustomToken ------->|
  |                            |<---{ success, status, data: SessionShape }------|
  |                            |                           |                     |
  |  [if authenticated]        |                           |                     |
  |                            | storeSession(data)        |                     |
  |                            | router.navigate(...)      |                     |
  |                            |                           |                     |
  |  [if role_required]        |                           |                     |
  |                            | setPendingState(response) |                     |
  |                            | router.navigate(['/choose-role'])               |
  |                            |                           |                     |
  |  RoleClassificationComponent.submit()       |                     |
  |                            |--POST /auth/linkedin/choose-role { pendingToken, selectedRole }
  |                            |<----{ success, data: SessionShape }-------------|
  |                            | storeSession(data) + navigate                   |
```

---

## 4. Role-Required Pending State — In-Memory Contract

When BE returns `status: 'role_required'`, `LinkedInAuthService` stores in-memory:

| Property | Source field (from /complete response) |
|---|---|
| `_pendingToken` | `response.linkedinPendingToken` |
| `_pendingEmail` | `response.googleEmail` (named for shape consistency with Google) |
| `_pendingDisplayName` | `response.googleDisplayName` |
| `_pendingPhotoUrl` | `response.googlePhotoUrl` |
| `_pendingFirstName` | `response.inferredFirstName` |
| `_pendingLastName` | `response.inferredLastName` |

**Lifespan:** In-memory only. Page refresh → state lost → `hasPendingRoleClassification` returns false → `RoleClassificationComponent.ngOnInit` redirects to `/signin`. This is acceptable and documented.

---

## 5. link-status Response Normalization Note

BE returns FLAT shape:
```json
{ "linked": true, "linkedEmail": "...", "linkedName": "...", "linkedAt": "...", "lastLoginAt": "..." }
```

STITCH command spec described nested: `{ success, data: { linked, provider, createdAt } }`. The actual flat shape is the correct documented contract. FE `getLinkStatus()` returns `Observable<any>`, so no type failure. If strong typing is added, use the flat shape.

---

## 6. link-status Missing Fields

The actual response does NOT include:
- `success` (bool) — missing
- `provider` (string) — always 'linkedin' but not returned
- `createdAt` — returned as `linkedAt`

When consuming `link-status`, check for `linked` boolean directly, not `response.success`.

---

## 7. Pre-existing Normalizations (Carried Forward)

- CV upload: `multipart/form-data`, field name `cv_file` — FE uses `FormData`, no JSON encoding
- Session token storage: always `localStorage.setItem('token', 'Bearer ' + idToken)` — interceptor reads `token_authorization` without the Bearer prefix
- Role numeric mapping: `role: 2` = employer, `role: 3` = job_seeker, never trust numeric value from client

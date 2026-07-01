# GETHIRED PRIVACY & DATA PROTECTION AUDIT — V6
**Date:** 2026-07-01 | **Focus:** LinkedIn OIDC data handling

---

## New PII Introduced by LinkedIn OIDC

### Data Collected from LinkedIn
| Field | Source | Stored Where | Retention | Minimization |
|---|---|---|---|---|
| `sub` (LinkedIn user ID) | LinkedIn userinfo | auth_identities.provider_subject | Indefinite | Necessary for identity binding |
| `email` | LinkedIn userinfo | auth_identities.provider_email + users.email | Indefinite | Necessary |
| `email_verified` | LinkedIn userinfo | auth_identities.provider_email_verified | Indefinite | Necessary |
| `given_name` | LinkedIn userinfo | users.firstname | Indefinite | Minimized (not stored in auth_identities separately) |
| `family_name` | LinkedIn userinfo | users.lastname | Indefinite | Minimized |
| `picture` (URL) | LinkedIn userinfo | auth_identities.provider_picture + users.photo_url | Indefinite | Stored as URL (no binary) |
| `name` (full name) | LinkedIn userinfo | auth_identities.provider_name | Indefinite | CONCERN: full name stored separately from first/last |
| Access token | LinkedIn | NOT stored | Session only | PASS — not persisted |
| ID token | LinkedIn | NOT stored | Session only | PASS — not persisted |

### oauth_tickets Table
| Field | PII? | Retention | Notes |
|---|---|---|---|
| jti | No | 5 min + 1 hr cleanup | Server-generated |
| uid | Pseudonymous | Same | Derived hash or Firebase uid |
| data (JSONB) | YES — email, name, photo URL in ticket data | 5 min + 1 hr cleanup | CONCERN: full PII blob in DB for 1+ hour |

### Findings

**PD-001 (P3):** `oauth_tickets.data` stores the full profile blob (email, firstName, lastName, photoUrl, liSub) in plaintext JSONB. While the cleanup script removes rows after 1 hour of expiry, a DB dump during that window would expose this data. Recommendation: encrypt the `data` field at-rest, or store only the minimal fields needed.

**PD-002 (P2):** LinkedIn `name` (full name string) is stored in `auth_identities.provider_name` in addition to first/last names in `users`. This creates a redundant PII store. Low risk but worth noting for data minimization.

**PD-003 (P3):** No `unlinked_at` timestamp is set when `linkedinUnlink` deletes the identity row — the row is hard-deleted (DELETE not soft-delete). This means there's no audit trail of when a user unlinked. Recommendation: soft-delete with `unlinked_at` set (the column exists in the schema per `createAuthIdentitiesTable.js`).

---

## Previously Identified Privacy Issues (V5)
| Finding | Status |
|---|---|
| CV data access control | VERIFIED FIXED |
| User PII in error responses | VERIFIED FIXED |
| LinkedIn access token not stored | NEW — PASS |

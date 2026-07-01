# GETHIRED BACKEND ERROR ENVELOPE AUDIT V6
**Date:** 2026-07-01

Audit of backend error response envelopes for all auth routes, with V6 additions for LinkedIn OIDC.

---

## Error Envelope Standard

Consistent error responses enable the FE to map errors to user-facing messages without parsing raw status codes.

**Expected envelope format:**
```json
{
  "success": false,
  "message": "Human-readable error for FE display",
  "error": "machine_readable_error_code"
}
```

---

## V6: LinkedIn Auth Error Envelopes

**Source:** `controllers/linkedinAuthController.js`

### GET /api/auth/linkedin/start

| Scenario | HTTP Status | Error Sent | FE Handling |
|---|---|---|---|
| LinkedIn not enabled | 302 redirect | `?error=not_enabled` | FE maps to "LinkedIn sign-in is not currently available." |
| Missing LINKEDIN_CLIENT_ID | 302 redirect | `?error=not_enabled` | Same |

### GET /api/auth/linkedin/callback

| Scenario | HTTP Status | Error Sent | FE Handling |
|---|---|---|---|
| Missing state/code params | 302 redirect | `?error=missing_params` | FE maps to correct message |
| State JWT invalid/expired | 302 redirect | `?error=invalid_state` | FE maps correctly |
| PKCE mismatch | 302 redirect | `?error=invalid_state` | FE maps correctly |
| LinkedIn token exchange failed | 302 redirect | `?error=server_error` | FE maps correctly |
| OIDC validation: invalid issuer | 302 redirect | `?error=invalid_issuer` | FE maps — generic message |
| OIDC validation: invalid audience | 302 redirect | `?error=invalid_audience` | FE maps — generic message |
| OIDC validation: token expired | 302 redirect | `?error=token_expired` | FE maps correctly |
| OIDC validation: invalid nonce | 302 redirect | `?error=invalid_nonce` | FE maps — jargon message |
| Missing sub (user ID) | 302 redirect | `?error=missing_sub` | FE maps — no what-to-do |
| Missing email | 302 redirect | `?error=missing_email` | FE maps correctly |
| Email not verified by LinkedIn | 302 redirect | `?error=email_not_verified` | FE maps correctly |
| LinkedIn access denied by user | 302 redirect | `?error=linkedin_denied` | FE maps correctly |
| DB/server error | 302 redirect | `?error=server_error` | FE maps correctly |

### POST /api/auth/linkedin/complete

| Scenario | HTTP Status | Body | FE Handling |
|---|---|---|---|
| Missing ticket | 400 | `{ success: false, message: "Ticket is required." }` | FE falls through to error state with message |
| Ticket expired/invalid | 400 | `{ success: false, message: "..." }` | FE shows message from body |
| Ticket already used (replay) | 400 | `{ success: false, message: "..." }` | FE shows message from body |
| Firebase error | 500 | `{ success: false, message: "Server error." }` | FE maps to server_error message |
| New user needs role | 200 | `{ success: true, status: 'role_required', linkedinPendingToken: "..." }` | FE navigates to /choose-role |
| Existing user | 200 | `{ success: true, status: 'authenticated', data: {...} }` | FE storeSession + navigate |

**Assessment:** The LinkedIn auth error envelope pattern is well-structured. The callback uses redirect-with-error-code (not JSON response) which is standard for OAuth callback routes. The /complete endpoint returns JSON with envelope format.

One minor gap: The /complete error messages (for expired/invalid tickets) come directly from the service and are shown in the FE error card. These should follow the same copy quality rules — check they don't expose technical details.

---

## V6: Company Setup — Backend Envelope

The company setup success modal opens after the FE receives a successful response from the company creation endpoint. The endpoint response is not part of V6 modal audit scope, but the modal data interface is:

```typescript
export interface SetupSuccessModalData {
  companyName: string;
  companySlug: string;
  profileCompleteness: number;
}
```

`profileCompleteness` is received but not displayed in the current modal. It could be used to show a profile completeness progress bar in a future iteration.

---

## Full System Error Envelope Assessment

| Route | Envelope format | machine_code | human_message | HTTP status | Quality |
|---|---|---|---|---|---|
| POST /api/auth/signin | `{ message, error }` | No | Yes | 401/400/500 | Acceptable |
| POST /api/auth/google | `{ success, status, message }` | Partial (status field) | Yes | 200/400/409/429/500 | Good |
| GET /api/auth/linkedin/callback | Redirect with `?error=code` | Yes | No (FE maps) | 302 | Good (standard OAuth pattern) |
| POST /api/auth/linkedin/complete | `{ success, status, message }` | Partial | Yes | 200/400/500 | Good |
| POST /api/auth/linkedin/choose-role | `{ success, message }` | No | Yes | 200/400/500 | Acceptable |
| POST /api/auth/google/choose-role | `{ success, message }` | No | Yes | 200/400/409/500 | Acceptable |

---

## Recommendations

1. Standardise all error envelopes to include `error` (machine code) field alongside `message` — allows FE to map specific display copy without substring-matching on message strings
2. Audit /complete ticket-error messages for technical jargon (low priority — these are rare paths)
3. Consider adding `retryable: true/false` boolean to error envelopes to help FE decide whether to show "Try again" button

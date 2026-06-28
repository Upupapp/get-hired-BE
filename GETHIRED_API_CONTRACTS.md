# GetHired API Contracts — QA Cycle 11 (STITCH)

Generated: 2026-06-25 | Baseline: none (lightweight scan)

---

## Contract 1 — GET /api/messages/recruiter/threads (B01)

**Auth:** Firebase JWT (verifyAuth)  
**Company scoping:** Derived server-side from `req.user.uid` via `resolveCallerCompany()`; FORBIDDEN if caller has no company  
**Response shape:**
```json
{
  "success": true,
  "data": [
    {
      "threadId": "string",
      "applicantUid": "string",
      "applicantName": "string | null",
      "applicantPhotoUrl": "string | null (Firebase Storage URL)",
      "jobId": "string",
      "jobTitle": "string | null",
      "lastMessageSnippet": "string | null (max 120 chars)",
      "lastSenderRole": "'employer' | 'applicant' | null",
      "lastMessageAt": "ISO timestamp string",
      "needsReply": "boolean"
    }
  ]
}
```
**Error responses:**
- 403 `{ success: false, message: "You don't have access to this conversation.", code: "FORBIDDEN" }` — caller has no company
- 500 generic error shape

**KNOWN COLUMN BUG:** The SQL query uses `u.first_name` / `u.last_name` / `u.email` but the production `gethired.users` table columns are `firstname` / `lastname` and email was dropped. `applicantName` will always be null. `applicantEmail` is used as the name fallback but also queries a dropped column. See FIX-LOG entry F-01.

**Photo URL risk:** `applicantPhotoUrl` is a Firebase Storage signed URL stored in `users.photo_url`. Firebase `getDownloadURL()` tokens can expire (typically 7-day token TTL but permanent for public objects depending on bucket config). No TTL refresh mechanism exists. FE renders with `<img *ngIf="t.applicantPhotoUrl" [src]="t.applicantPhotoUrl">` — a broken URL shows nothing (the `*ngIf` hides the fallback initial `<span>`). See risk R-01.

---

## Contract 2 — GET /api/interview/hub (B03)

**Auth:** Firebase JWT (verifyAuth)  
**Company scoping:** Derived server-side from JWT via `getUserCompany()`; FORBIDDEN if caller has no company  
**Response shape:**
```json
{
  "items": [
    {
      "applicationId": "string",
      "applicantId": "string (candidate_id / uid)",
      "applicantName": "string | null",
      "applicantEmail": "string | null",
      "applicantPhotoUrl": "string | null (Firebase Storage URL)",
      "applicationStatusId": "number",
      "applicationStatus": "string (defaults to 'Unknown')",
      "dateApplied": "ISO timestamp",
      "lastActivity": "ISO timestamp",
      "jobId": "string",
      "jobTitle": "string",
      "videoAnswerCount": "number (integer >= 0)",
      "hasVideoAnswers": "boolean"
    }
  ],
  "total": "number"
}
```
**Note:** Response is NOT wrapped in `{ success, data }` — it returns raw JSON. This is a contract inconsistency with all other BE endpoints that use the `successMessage` helper wrapper.

**Error responses:**
- 403 `{ message: "You don't have permission to do that." }` — caller has no company
- 500 `{ message: "Something went wrong. Please try again." }`

**KNOWN COLUMN BUG:** Same `u.first_name`/`u.last_name`/`u.email` issue as Contract 1. See FIX-LOG entry F-01.

---

## Contract 3 — POST /api/messages/thread

**Auth:** verifyAuth  
**Body:** `{ jobId: string, applicantUid?: string }`  
**Response:** `{ success: true, data: MessageThread }`  
**Notes:** Employer can supply applicantUid; applicant callers have it overridden to their own uid server-side.

---

## Contract 4 — GET /api/messages/thread/messages

**Auth:** verifyAuth  
**Query:** `?threadId=<id>`  
**Response:** `{ success: true, data: ChatMessage[] }`  
**Auth check:** Thread-level ownership verified via `loadAuthorizedThread()`.

---

## Contract 5 — POST /api/messages/thread/send

**Auth:** verifyAuth  
**Body:** `{ threadId: string, body: string }`  
**Limits:** body max 4000 chars enforced server-side  
**Response:** `{ success: true, data: ChatMessage }`

---

## Contract 6 — GET /api/interview/getall

**Auth:** verifyAuth  
**Query:** `?companyId=<id>`  
**Authorization:** `callerBelongsToCompany(req.user.uid, companyId)` — company derived from JWT, then matched against query param  
**Response:** `{ success: true, data: [...] }`

---

## Contract 7 — Rate Limiting Headers

All endpoints return RFC 6585 `RateLimit-*` headers (not legacy `X-RateLimit-*`):
- `RateLimit-Limit`: window max
- `RateLimit-Remaining`: remaining requests
- `RateLimit-Reset`: window reset time

FE does NOT handle `429` responses in any interceptor or service. Hitting a rate limit produces an unhandled error, caught generically by the unauthorized interceptor (which only handles 401/403) or falls through to component-level error handlers showing "Operation not successful".

---

## Contract 8 — Auth/403 Response Shape Inconsistency

Multiple response shapes exist for 403s:
1. `"Unauthorized"` (plain text string) — from `verifyAuth` middleware
2. `{ message: "..." }` — from new interview/messages controllers (QA10 fix)
3. `{ success: false, message: "...", code: "FORBIDDEN" }` — from message service error handler
4. `{ error: "..." }` — from legacy `errorMessage` helper

FE `UnAuthorizedInterceptor` triggers on HTTP status 403 regardless of body shape, redirecting to `/signin`. This covers case 1 but the snackbar message is always generic ("Your session has expired") even when the real cause is a FORBIDDEN (caller has no company).

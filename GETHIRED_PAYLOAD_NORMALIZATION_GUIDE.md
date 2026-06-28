# GetHired Payload Normalization Guide — QA Cycle 11 (STITCH)

Generated: 2026-06-25

---

## Overview

Two normalization problems affect the QA11 deployment scope: a column-name mismatch that silences applicant names, and a response-envelope inconsistency on the interview hub endpoint.

---

## P-01 — Column name mismatch: `firstname`/`lastname` vs `first_name`/`last_name`

**Affected endpoints:** GET /api/messages/recruiter/threads, GET /api/interview/hub  
**Severity:** HIGH — All applicant names will be null in production

### Root cause
The production `gethired.users` table uses `firstname` and `lastname` (no underscores) as confirmed by:
- `db/complete_ddl.sql` lines 36–38
- `db/user_ddl.sql` lines 36–38
- All existing service files: `helpers/userDetails.js`, `services/applicant.service.js`, `services/candidate.service.js`, `services/company.service.js`, `services/contact.service.js` — all use `u.firstname` / `u.lastname`

The new B01 (`services/message.service.js` lines 196–197) and B03 (`controllers/interviewController.js` lines 274–275) queries use `u.first_name` / `u.last_name` which are non-existent columns. PostgreSQL returns NULL for missing column references in LEFT JOINs without raising an error, so the queries succeed silently with null names.

### Fix required (BACKEND — services/message.service.js)
```diff
- u.first_name     AS "applicantFirstName",
- u.last_name      AS "applicantLastName",
+ u.firstname      AS "applicantFirstName",
+ u.lastname       AS "applicantLastName",
```

### Fix required (BACKEND — controllers/interviewController.js)
```diff
- u.first_name,
- u.last_name,
+ u.firstname,
+ u.lastname,
```

---

## P-02 — `users.email` dropped from schema, still referenced in queries

**Affected endpoints:** GET /api/messages/recruiter/threads, GET /api/interview/hub  
**Severity:** HIGH — `applicantEmail` will always be null; the name fallback chain that falls back to email also silently fails

### Root cause
`db/complete_ddl.sql` includes `ALTER TABLE gethired.users DROP COLUMN email;`. The `gethired.users` table has no `email` column. Email is on `gethired.user_credentials`.

The B01 query joins `users u ON u.uid = mt.applicant_uid` and references `u.email`. The B03 query joins `users u ON u.uid = ja.candidate_id` and references `u.email`. Both silently get NULL.

### Fix required (BACKEND — services/message.service.js)
Join `user_credentials` to obtain email:
```diff
 LEFT JOIN ${dbSchema}.users u
   ON u.uid = mt.applicant_uid
+ LEFT JOIN ${dbSchema}.user_credentials uc
+   ON uc.uid = mt.applicant_uid
...
- u.email          AS "applicantEmail",
+ uc.email         AS "applicantEmail",
```

### Fix required (BACKEND — controllers/interviewController.js)
```diff
 LEFT JOIN ${dbSchema}.users u
   ON u.uid = ja.candidate_id
+ LEFT JOIN ${dbSchema}.user_credentials uc
+   ON uc.uid = ja.candidate_id
...
- u.email,
+ uc.email,
```
And update the mapping from `r.email` to pull from `uc.email`.

---

## P-03 — Response envelope inconsistency on GET /api/interview/hub

**Severity:** MEDIUM — FE adapter already handles it, but it's a documentation and maintenance hazard

### Problem
Every other GET endpoint returns:
```json
{ "success": true, "data": <payload> }
```

`GET /api/interview/hub` returns:
```json
{ "items": [...], "total": N }
```
(raw JSON, no envelope)

The FE `RecruiterInterviewHubService` correctly types the response as `InterviewHubResponse` and calls `res.items || []` — so the current FE handles this correctly. However, any future code expecting the standard `res.data` pattern will get undefined.

### Recommendation
Leave as-is for now (FE already adapted). Add a note to the backend optional contract fixes. If unifying response shapes, use the `successMessage.data = { items, total }` pattern.

---

## P-04 — `applicantLabel()` empty-string edge case

**Severity:** LOW — edge case, does not crash

### Problem
`applicantLabel()` in `recruiter-messages.component.ts`:
```typescript
if (t.applicantName) return t.applicantName;
```
`t.applicantName` is `string | null`. The guard `if (t.applicantName)` is falsy for both `null` AND `''` (empty string). An empty string from the BE would correctly fall through to the uid-suffix fallback. This is fine — P-04 is a non-issue given the BE null-coalesces to null (never '').

### Status: No fix required

---

## P-05 — Interview hub `items` array — undefined vs `[]`

**Severity:** LOW — FE already handles both

### Problem
BE always returns `{ items: [...], total }` — `items` is always an array (never undefined). FE uses `res.items || []` which guards against undefined anyway. The template checks `items.length === 0` with `!loading && !error` guard.

### Status: No fix required — defense-in-depth already present

---

## P-06 — `verifyAuth` 403 sends plain text `"Unauthorized"`, not JSON

**Severity:** MEDIUM — FE interceptor handles 403 generically (redirects to signin), but any caller expecting JSON gets a string body

The `UnAuthorizedInterceptor` triggers on HTTP 403 regardless of body shape. The resulting snackbar message is always "Your session has expired" even when the cause was "caller has no company". This is misleading UX but not a breaking bug.

### Status: Documented; low-priority UX improvement

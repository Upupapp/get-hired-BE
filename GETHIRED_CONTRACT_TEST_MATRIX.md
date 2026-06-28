# GetHired CONTRACT TEST MATRIX — QA Cycle 11

**Date:** 2026-06-25
**Focus:** BE response shapes vs FE interface types; auth contract; rate-limit headers

---

## 1. GET /api/interview/hub

### 1.1 Auth Contract

| Requirement | Backend | Frontend | Match? |
|-------------|---------|---------|--------|
| Auth required | verifyAuth middleware on route | AuthInterceptor sends Bearer token from localStorage | PASS |
| Token format | Reads `Authorization: Bearer <token>` | Stored as `'Bearer ' + data.token` | PASS |
| Company scoping | getUserCompany(req.user.uid) — never trusts query param | No companyId sent in request | PASS |
| 403 on no company | Returns `{ message: "You don't have permission..." }` | Error handler shows retry UI | PASS |
| 500 format | `{ message: 'Something went wrong. Please try again.' }` | Error handler shows retry UI | PASS |

### 1.2 Response Shape Contract

**BE produces:**
```json
{
  "items": [
    {
      "applicationId": "string (job_application_id)",
      "applicantId": "string (candidate_id / uid)",
      "applicantName": "string | null",
      "applicantEmail": "string | null",
      "applicantPhotoUrl": "string | null",
      "applicationStatusId": "number",
      "applicationStatus": "string (fallback: 'Unknown')",
      "dateApplied": "timestamp",
      "lastActivity": "timestamp",
      "jobId": "string",
      "jobTitle": "string",
      "videoAnswerCount": "number (integer >= 0)",
      "hasVideoAnswers": "boolean"
    }
  ],
  "total": "number"
}
```

**FE expects (InterviewHubItem):**
```typescript
{
  applicationId: string;
  applicantId: string;
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhotoUrl: string | null;
  applicationStatusId: number;
  applicationStatus: string;
  dateApplied: string;
  lastActivity: string;
  jobId: string;
  jobTitle: string;
  videoAnswerCount: number;
  hasVideoAnswers: boolean;
}
```

| Field | BE Type | FE Type | Contract |
|-------|---------|---------|---------|
| applicationId | string (UUID) | string | PASS |
| applicantId | string (Firebase UID) | string | PASS |
| applicantName | string \| null | string \| null | PASS |
| applicantEmail | string \| null | string \| null | PASS |
| applicantPhotoUrl | string \| null | string \| null | PASS |
| applicationStatusId | number (parseInt) | number | PASS |
| applicationStatus | string | string | PASS |
| dateApplied | timestamp string | string | PASS |
| lastActivity | timestamp string | string | PASS |
| jobId | string | string | PASS |
| jobTitle | string | string | PASS |
| videoAnswerCount | number (parseInt, 0 default) | number | PASS |
| hasVideoAnswers | boolean | boolean | PASS |
| total | number | InterviewHubResponse.total | PASS |

**Contract result: FULL MATCH — all 14 fields match**

---

## 2. GET /api/messages/recruiter/threads

### 2.1 Auth Contract

| Requirement | Backend | Frontend | Match? |
|-------------|---------|---------|--------|
| Auth required | verifyAuth on route | AuthInterceptor sends Bearer | PASS |
| Company scoping | resolveCallerCompany(callerUid) | No companyId sent | PASS |
| Non-employer 403 | throws FORBIDDEN, mapped to 403 | Error state shown | PASS |

### 2.2 Response Shape Contract

**BE produces (listRecruiterThreads map output):**
```json
[
  {
    "threadId": "string",
    "applicantUid": "string",
    "applicantName": "string | null",
    "applicantPhotoUrl": "string | null",
    "jobId": "string",
    "jobTitle": "string | null",
    "lastMessageSnippet": "string | null (max 120 chars)",
    "lastSenderRole": "'employer' | 'applicant' | null",
    "lastMessageAt": "timestamp",
    "needsReply": "boolean"
  }
]
```

**FE expects (RecruiterThreadSummary):**
```typescript
{
  threadId: string;
  applicantUid: string;
  applicantName: string | null;
  applicantPhotoUrl: string | null;
  jobId: string;
  jobTitle: string | null;
  lastMessageSnippet: string | null;
  lastSenderRole: 'employer' | 'applicant' | null;
  lastMessageAt: string;
  needsReply: boolean;
}
```

| Field | BE Type | FE Type | Contract |
|-------|---------|---------|---------|
| threadId | string | string | PASS |
| applicantUid | string | string | PASS |
| applicantName | string \| null (NEW in QC11) | string \| null | PASS |
| applicantPhotoUrl | string \| null (NEW in QC11) | string \| null | PASS |
| jobId | string | string | PASS |
| jobTitle | string \| null | string \| null | PASS |
| lastMessageSnippet | string \| null (max 120) | string \| null | PASS |
| lastSenderRole | union \| null | union \| null | PASS |
| lastMessageAt | timestamp | string | PASS |
| needsReply | boolean | boolean | PASS |

**Contract result: FULL MATCH — all 10 fields match**

**New in QC11:** applicantName and applicantPhotoUrl fields added to both BE output and FE interface simultaneously — no version mismatch.

---

## 3. Rate-Limit Response Headers Contract

Express-rate-limit v6 with `standardHeaders: true, legacyHeaders: false` produces:

| Header | Tier 1 (global) | Tier 2 (auth) | Tier 3 (write) | Tier 4 (sensitive) |
|--------|---------|-------|-------|---------|
| RateLimit-Limit | 500 | 20 | 100 | 10 |
| RateLimit-Remaining | decrements | decrements | decrements | decrements |
| RateLimit-Reset | 15min epoch | 15min epoch | 15min epoch | 1hr epoch |
| X-RateLimit-* (legacy) | absent | absent | absent | absent |
| Retry-After (on 429) | present | present | present | present |

**All headers follow RFC 6585. No deprecated headers exposed.**

---

## 4. Auth Interceptor Contract

| Step | Behavior | Status |
|------|---------|--------|
| 1. Login | `localStorage.setItem('token', 'Bearer ' + data.token)` | PASS |
| 2. Every HTTP request | AuthInterceptor.intercept adds `Authorization: <token>` (which already includes 'Bearer ' prefix) | PASS |
| 3. Backend verifyAuth | Checks `req.headers.authorization.startsWith('Bearer ')` | PASS |
| 4. Token expiry | UnAuthorizedInterceptor catches 403 responses | PASS |
| 5. RecruiterInterviewHubService | Uses raw HttpClient — still gets auth via interceptor | PASS |

---

## 5. Contract Gaps / Issues

| Gap | Severity | Description |
|-----|---------|-------------|
| ih-status--{{statusId}} CSS class | LOW | `ih-status--3` etc. — hardcoded status IDs in CSS; fragile if IDs change |
| Broken photo URL | LOW | Non-null string that is a 404 URL: `*ngIf` passes it to `<img src>`, browser shows broken icon |
| Hub total field | INFO | `total: items.length` is post-filter count (archived excluded) — FE does not display total yet |
| No pagination contract | INFO | Hub returns max 200 items; no cursor/page field; FE shows all |

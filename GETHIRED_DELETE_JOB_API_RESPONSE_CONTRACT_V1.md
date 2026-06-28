# GETHIRED DELETE JOB — API Response Contract V1

**Date:** 2026-06-25

---

## Endpoint

`DELETE /job/delete`

**Request Headers:**
```
Authorization: Bearer <Firebase ID Token>
Content-Type: application/json
```

**Request Body:**
```json
{ "jobId": "JB123456" }
```

**Fields NOT accepted (ignored):**
- `companyId` — stripped at controller entry, never used
- `employerId` — not used
- `userId` — not used

---

## Success Response — 200 OK

```json
{
  "status": "success",
  "data": [
    {
      "jobId": "JB123456",
      "jobTitle": "Senior Engineer",
      "companyId": "CP001",
      "jobTypeId": 1,
      "jobTypeName": "Full-time",
      "workSetupId": 1,
      "workSetupName": "On-site",
      "salaryMinimum": 50000,
      "salaryMaximum": 80000,
      "salaryCurrency": "PHP",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "jobStatusId": 2,
      "jobCity": "Manila",
      "jobCountry": "Philippines",
      "rate": "Monthly"
    }
  ]
}
```

`data` is the caller's refreshed job list (scoped to their company). Empty array `[]` is valid (all jobs deleted).

---

## Error Response — 404 Not Found

Job does not exist or belongs to a different company:
```json
{ "error": "Job not found or you do not have access." }
```

---

## Error Response — 403 Forbidden

Caller's company could not be resolved (e.g. no employer profile):
```json
{ "message": "Job not found or you do not have access." }
```

---

## Error Response — 500 Internal Server Error

Unexpected DB or server error:
```json
{ "data": "Operation not successful. Please try again." }
```

---

## Frontend Error Normalisation

The NgRx effect normalises all error shapes:
```typescript
const body = (err && err.error) || {};
const payload: string = body.error || body.message || 'We couldn\'t delete this job...';
```

So the UI always receives a string, never crashes on `undefined.error`.

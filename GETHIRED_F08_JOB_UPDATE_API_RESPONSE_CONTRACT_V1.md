# GETHIRED F-08 — API RESPONSE AND ERROR COPY CONTRACT
**Command:** GETHIRED_F08_JOB_UPDATE_BOLA_SECURITY_SPRINT_WORLD_CLASS_TECHY_V1
**Date:** 2026-06-25

---

## Route: PUT /job/updatejobs

### Success (200)
```json
{
  "status": "success",
  "data": { /* mappedJob object */ }
}
```

### 403 — Unauthorized (missing/invalid token or verifyAuth failure)
```
HTTP 403
"Unauthorized"  (from verifyAuth middleware — plain text)
```

### 403 — No company (getUserCompany returns [])
```json
HTTP 403
{ "message": "You don't have permission to update this job." }
```

### 403 — Cross-company attempt / Job not found (zero-row UPDATE)
```json
HTTP 403
{ "message": "You don't have permission to update this job." }
```
Note: Same message for both "job not found" and "wrong company" — intentional, no leak.

### 500 — Internal error
```json
HTTP 500
{ "status": "error", "data": "Operation not successful. Please try again." }
```

---

## Route: PUT /job/changestatus

### 403 — No company
```json
{ "message": "You don't have permission to do that." }
```

### 403 — Wrong company / Job not found (FORBIDDEN thrown from updateJobStatus)
```json
{ "message": "You don't have permission to update this job." }
```

---

## Frontend Error Mapping

| Backend Response | User-Facing Copy |
|------------------|-----------------|
| 401 / "Token Expired" / "Unauthorized" | "Your session has expired. Please sign in again." |
| 403 with "permission" or "access" in message | "We couldn't update this job. It may no longer exist or you may not have access." |
| 403 with no specific message | "We couldn't update this job. It may no longer exist or you may not have access." |
| 400 / "required" / "missing" / "field" | "Please review the highlighted fields." |
| 500 / generic error | "We couldn't update this job. Try again." |

---

## UI Behavior Per Response

| Scenario | Loading Spinner | Form Cleared | Error Shown | Success Shown |
|----------|----------------|-------------|-------------|---------------|
| Backend pending | Yes | No | No | No |
| Backend 200 | Cleared | No (dialog appears) | No | Yes (pulse + dialog) |
| Backend 403/404 | Cleared | No | Yes (saveErrorMsg) | No |
| Backend 400 | Cleared | No | Yes | No |
| Backend 500 | Cleared | No | Yes | No |
| Network failure | Cleared | No | Yes ("Try again") | No |

---

## Error Copy Rules

1. NEVER show internal field names (company_id, job_id, JWT, Firebase, etc.)
2. NEVER show "permission denied for company X" or similar company-exposing messages
3. NEVER show SQL/DB error messages
4. ALWAYS show a retry path (button remains visible, form retains data)
5. Error message clears when user starts a new save attempt

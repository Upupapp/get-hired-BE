# GETHIRED STITCH API CONTRACTS — RECENT DEPLOYMENT

## Contract: GET /api/job/action-summary

### Request
Method: GET
Path: /api/job/action-summary
Headers: Authorization: Bearer <Firebase ID token>
Query: jobId=<string> (required)

### Response 200
```json
{
  "data": {
    "job": {
      "id": "string",
      "title": "string",
      "statusId": 1|2|3|4,
      "status": { "key": "draft|published|expired|archived", "label": "string" },
      "workSetupName": "string|null",
      "jobTypeName": "string|null",
      "jobCity": "string|null",
      "jobCountry": "string|null",
      "salary": { "label": "string|null", "isVisible": boolean },
      "publicUrl": "string|null",
      "previewUrl": "string",
      "editUrl": "string",
      "applicantsUrl": "string",
      "updatedAt": "ISO string|null"
    },
    "summary": {
      "totalApplicants": number,
      "interviewQuestionsCount": number
    },
    "actions": {
      "canView": boolean,
      "canPreview": boolean,
      "canEdit": boolean,
      "canReviewApplicants": boolean,
      "canCreateInterview": boolean,
      "canShare": boolean,
      "canDelete": boolean
    },
    "permissionNotice": "string"
  }
}
```

### Response 400 (missing jobId)
```json
{ "error": "jobId is required." }
```

### Response 403 (no company access)
```json
{ "message": "You do not have access to this job." }
```

### Response 404 (job not found or not in caller company)
```json
{ "message": "Job not found or you do not have access." }
```

### Response 500 (server error)
```json
{ "error": "Could not load job summary. Please try again." }
```

## Status ID Map
| statusId | key | label |
|---|---|---|
| 1 | draft | Draft |
| 2 | published | Published |
| 3 | expired | Expired |
| 4 | archived | Archived |

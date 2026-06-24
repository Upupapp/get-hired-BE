# GetHired — Application Completeness Response Contract V2

**Date:** 2026-06-24

---

## 1. Batch Endpoint (Used by FE)

**Route:** `GET /applicant/application/snapshots?applicationIds=id1,id2,...`  
**Auth:** Applicant JWT required  
**Max IDs per call:** 50  
**FE chunking:** forkJoin of N/50 parallel requests, merged into snapshotsMap

### Response Shape
```json
{
  "data": {
    "snapshots": {
      "<applicationId>": {
        "hasSnapshot": true,
        "completenessScore": 82,
        "completenessLevel": "strong",
        "missingRequired": [
          { "reason": "Work experience is missing" }
        ],
        "missingRecommended": [
          { "reason": "Profile photo not uploaded" }
        ],
        "disclaimerNote": "This score reflects your profile at the time you applied.",
        "privacyNote": "Only you can see this — it is never shared with employers."
      }
    }
  }
}
```

### Field Contract

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| hasSnapshot | boolean | NO | false = pre-deployment application |
| completenessScore | number | YES (null if !hasSnapshot) | 0–100 integer |
| completenessLevel | string | YES (null if !hasSnapshot) | 'excellent' \| 'strong' \| 'basic' \| 'incomplete' |
| missingRequired | Array<{reason:string}> | YES | null or empty array = nothing missing |
| missingRecommended | Array<{reason:string}> | YES | null or empty array = nothing recommended |
| disclaimerNote | string | NO | Always present |
| privacyNote | string | YES | May be empty string |

### Fields NOT in Batch Response
- `source` — only in single endpoint
- `snapshotCreatedAt` — only in single endpoint
- `completedSections` — only in single endpoint

---

## 2. Single Endpoint (Available, Not Currently Used in List View)

**Route:** `GET /applicant/application/snapshot?applicationId=<id>`

Additional fields returned:
- `source: 'submitted_snapshot' | 'current_profile'`
- `snapshotCreatedAt: string | null` (ISO 8601)
- `completedSections: string[]`

---

## 3. Display Rules Derived from Contract

| Condition | Display |
|-----------|---------|
| Entry missing from snapshotsMap | `#snapSilent` — "Snapshot unavailable" |
| `hasSnapshot: false` | Pre-deployment italic note |
| `hasSnapshot: true` + `completenessScore: null` | Score row hidden; only disclaimer shown |
| `hasSnapshot: true` + score present | Full score row + badge |
| `missingRequired?.length > 0` | Amber tips block + "Update profile" CTA |
| `missingRecommended?.length > 0` | Blue tips block (no CTA required) |
| Both arrays empty/null | Positive "all complete" state |

---

## 4. ID Key Consistency
- snapshotsMap is keyed by `app.jobApplicationId`
- Template calls `snapshotFor(app.jobApplicationId)` — consistent
- Batch request uses `app.jobApplicationId` array — consistent
- No cross-applicant data risk: BE filters by authenticated user's applications

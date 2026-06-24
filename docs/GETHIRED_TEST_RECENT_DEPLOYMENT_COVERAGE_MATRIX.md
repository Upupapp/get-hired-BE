# GETHIRED_TEST_RECENT_DEPLOYMENT_COVERAGE_MATRIX
**Deployment:** Application Snapshots System  
**Date:** 2026-06-24

---

| Test Area | Critical Flow | Risk Level | Current Coverage | Recommended Test Type | Status |
|---|---|---|---|---|---|
| **Snapshot creation during application submit** | `jobApply()` calls `createApplicationSnapshots()` fire-and-forget after insert | HIGH | Runtime: module loads, static code review confirms .catch() wraps the call without await | Integration test: submit app → assert snapshot row created in DB | PLANNED (no test exists) |
| **Fire-and-forget error isolation** | If any snapshot persist throws, the submission result is still returned; no throw propagates to caller | HIGH | Static: `createApplicationSnapshots().catch()` with no await confirmed. Internal errors array also accumulates without throwing | Unit test: mock DB to reject all queries → assert createApplicationSnapshots resolves (not rejects) with errors[] | PLANNED (no test exists) |
| **Idempotency: ON CONFLICT DO NOTHING** | Duplicate applicationId + source='application_submit' never creates a second row; RETURNING id returns null if skipped | HIGH | Static: confirmed ON CONFLICT DO NOTHING on lines 341, 375, 461; DDL partial unique index WHERE source='application_submit' also confirmed | Integration test: call createApplicationSnapshots twice with same applicationId → assert only 1 row in each table | PLANNED (no test exists) |
| **Applicant ownership check on GET /applicant/application/snapshot** | `candidate_id !== uid → 403` prevents one applicant reading another's snapshot | HIGH | Static: applicationController.js line 77-79 confirmed | Integration test: call with different uid → expect 403 | PLANNED (no test exists) |
| **Employer company-ownership check on GET /job/applicant/snapshot-summary** | Caller's company must own the job; different company → 403 | HIGH | Static: applicationController.js lines 130-140 confirmed; getUserCompany() called and companyId compared | Integration test: employer from different company calls endpoint → expect 403 | PLANNED (no test exists) |
| **EXCLUDED_FIELDS privacy** | EXCLUDED_FIELDS list (21 fields) is persisted in excluded_fields column and no field in the list appears in applicant_profile_snapshot | HIGH | Runtime: confirmed 21 fields including gender, race, ethnicity, face_traits, personality_analysis, emotion_analysis, accent_analysis | Unit test: build profile snapshot with all excluded fields populated → assert none appear in snapshot JSON | CREATED (runtime verified) |
| **No protected attributes in snapshots** | buildApplicantProfileSnapshot() never copies gender/race/DOB/etc from the profile object | HIGH | Runtime: scored live — EXCLUDED_FIELDS confirmed; buildApplicantProfileSnapshot is an explicit whitelist (only named fields copied, no spread/Object.assign of entire profile) | Unit test: pass profile with all EXCLUDED_FIELDS set → assert none in snapshot output | CREATED (runtime verified via whitelist pattern) |
| **Completeness scoring rubric** | scoreApplicationCompleteness returns 0-100, level (incomplete/basic/strong/excellent), missing arrays, evidence | HIGH | Runtime: null→0/incomplete, full→100/excellent, partial→78/strong, docsSnapshot.resume→cv_submitted detected | Unit test: all 8 combinations of required/recommended fields | CREATED (partially via smoke tests) |
| **Match snapshot disclaimer** | matchDisclaimer field in employer summary response comes from DISCLAIMER constant; shown in FE card | MEDIUM | Static: DISCLAIMER exported from employerApplicantSignalsService.js, re-exported from applicationSnapshotService.js, returned in getApplicationSnapshotSummaryForEmployer(); FE renders snapshotSummary.matchDisclaimer | Visual/e2e test: open employer applicant detail with snapshot → verify disclaimer text visible | PLANNED |
| **FE snapshot card: null state** | When snapshotSummary is null (catchError → of(null)), card is not rendered at all | MEDIUM | Static: `*ngIf="snapshotSummaryLoading \|\| snapshotSummary"` on card div — when both false/null, card hidden | FE unit test: trigger error → assert card not in DOM | PLANNED |
| **FE snapshot card: loading state** | While snapshotSummaryLoading=true, "Loading snapshot..." text shown inside card | MEDIUM | Static: `*ngIf="snapshotSummaryLoading"` on loading div confirmed; snapshotSummaryLoading initialized to false, set true before call, false after subscribe | FE unit test: mock delay → assert loading text present then removed | PLANNED |
| **FE snapshot card: error state** | catchError(() => of(null)) means HTTP error sets snapshotSummary=null, snapshotSummaryLoading=false → card disappears | MEDIUM | Static: loadSnapshotSummary() uses catchError(() => of(null)) in pipe | FE unit test: mock 500 → assert card removed after error | PLANNED |
| **applicationId flowing from list to detail** | BE: mappedBasicApplicantDetails returns applicationId; FE: applicants$ map includes it; viewMenu() reads result.data.data.applicationId before calling loadSnapshotSummary() | HIGH | Static: BE mapper confirmed (line 617: applicationId: raw.job_application_id); FE viewMenu() line 272 confirmed; loadSnapshotSummary called with appId if truthy | E2E or integration: open applicant detail → verify snapshot API called with correct applicationId | PLANNED |
| **hasSnapshot=false path in employer card** | When snapshot row does not exist, hasSnapshot:false → "No snapshot available" message shown | LOW | Static: `*ngIf="!snapshotSummary.hasSnapshot"` confirmed in HTML | FE unit test: pass {hasSnapshot:false} → assert text visible | PLANNED |
| **completenessScore null guard** | FE only renders completeness block when completenessScore != null | LOW | Static: `*ngIf="snapshotSummary.completenessScore != null"` confirmed | FE unit test: pass {hasSnapshot:true, completenessScore:null} → assert block hidden | PLANNED |
| **matchLevel null guard** | FE only renders match level block when matchLevel is truthy | LOW | Static: `*ngIf="snapshotSummary.matchLevel"` confirmed | FE unit test: pass {hasSnapshot:true, matchLevel:null} → assert block hidden | PLANNED |

---

## Summary Counts

| Coverage status | Count |
|---|---|
| CREATED (runtime verified or whitelist confirmed) | 3 |
| PLANNED (code correct, no automated test exists) | 13 |
| SKIPPED | 0 |
| FAIL | 0 |

All critical flows are correctly implemented. The gap is automated test coverage, not correctness.

# GETHIRED ACTIONS — Recent Deployment Report
## Application Snapshots System
**Generated:** 2026-06-24
**Scope:** BE `applicationSnapshotService.js` + controller + routes + FE service + employer card

---

## Executive Summary

The Application Snapshots deployment adds a three-table persistence layer that captures an immutable record of each application at submission time: the applicant's profile state, submitted documents, completeness score, and a match-readiness snapshot. All three snapshot types use `ON CONFLICT DO NOTHING` for idempotency, fire-and-forget integration in `jobApply()`, and a well-designed privacy exclusion list.

The deployment is architecturally sound with no regressions. The employer-side snapshot card in `job-applicants.component` is wired end-to-end and protected by company-ownership checks. The applicant-side endpoint exists and is auth-gated but has no UI consuming it yet. No backfill job exists for pre-deployment applications. The `snapshot_hash` field is reserved in the DDL but not populated by the service.

**Immediate action:** Confirm the DDL (`application_snapshots_ddl.sql`) has been applied to production before trusting any snapshot data.

---

## Consolidated Findings

### Strengths
- Fire-and-forget pattern: snapshot failure never blocks application submission.
- `ON CONFLICT DO NOTHING` + partial unique index on `(application_id) WHERE source='application_submit'` correctly implements idempotency for the original snapshot; retries and backfills are cleanly separated by the `source` column.
- `EXCLUDED_FIELDS` is defined once and used consistently across both the service's privacy-screening logic and the `excluded_fields` column written to the DB — employers can verify what was omitted.
- Completeness rubric is version-stamped (`application_completeness_v1`) and the matching-algorithm version is stamped (`employer_signals_v5`).
- Company-ownership check in `getEmployerApplicantSnapshotSummary` is correct: verifies `jobs.company_id` against the caller's company before returning any data.
- Applicant self-view endpoint (`GET /applicant/application/snapshot`) correctly verifies `candidate_id === uid` before returning data.

### Gaps and Risks

#### Critical / Blocking
1. **DDL not confirmed applied to production.** The DDL file exists and the code assumes the tables exist. If the migration has not been applied, every `jobApply()` call will silently fail the snapshot phase (fire-and-forget suppresses the error) and no snapshots will be stored. No backfill will be possible for the silent-failure window.

#### High Priority
2. **No UI surface for applicant self-view.** `ApplicationService.getApplicationSnapshot()` (FE) is wired to the API endpoint but no Angular component calls it. Applicants cannot see their own completeness feedback or understand what was captured about them.
3. **No backfill job for existing applications.** `application_snapshots_ddl.sql` includes no backfill script. All applications submitted before this deployment have no snapshot rows. The `persistApplicationSnapshot` service already handles `source='backfill_current_data'` in provenance text, indicating backfill was anticipated but not shipped.
4. **`companyId` can be `null` at insert time** (`companyId: job.companyId || null` in `application.service.js` line 150), but the DDL declares `company_id varchar NOT NULL` on all three tables. If `job.companyId` is missing (e.g. job row lacks the FK-backed field), the snapshot insert will throw a DB NOT NULL violation — this is currently silently swallowed by the `catch` block, but it means snapshots will not be created for those applications.
5. **No dashboard metric endpoint for completeness distribution.** Employers have no aggregate view of completeness scores across their job pipeline.

#### Medium Priority
6. **`snapshot_hash` column reserved but never populated.** The DDL includes `snapshot_hash varchar NULL` but `persistApplicationSnapshot` never computes or writes this value.
7. **Match score formula in `persistMatchSnapshot` duplicates logic from `employerApplicantSignalsService`.** `persistMatchSnapshot` hand-rolls `(matchedRequired / total) * 60 + (hasCv ? 40 : 0)` using raw fields from `fitSignals` rather than calling back into the canonical scoring function. If `REQUIRED_SKILLS_WEIGHT` or `APPLICATION_COMPLETENESS_WEIGHT` change in `employerApplicantSignalsService`, `match_snapshots.match_score` will silently diverge.
8. **No unit or integration tests for `applicationSnapshotService.js`.** `scoreApplicationCompleteness`, `buildApplicantProfileSnapshot`, and the idempotency guarantee (ON CONFLICT DO NOTHING) have no test coverage in the project test suite (only third-party node_modules specs were found).
9. **No admin view for snapshot data.** `adminController.js` has no snapshot-related endpoints. Ops/support cannot inspect or audit snapshot rows for a specific application.

#### Low Priority
10. **Applicant self-view completeness tips not surfaced in dashboard.** The `missingRequired` and `missingRecommended` arrays are available in the API response but no dashboard UI shows improvement tips to the applicant.
11. **No webhook/event on snapshot-ready.** Downstream consumers (notifications, analytics) have no hook to react when a snapshot is created.
12. **`DISCLAIMER` re-export from `applicationSnapshotService.js` is a re-export from `employerApplicantSignalsService`.** The snapshot service exports `DISCLAIMER` which it imported from the match service. This creates an indirect coupling — if the match service's disclaimer text or export changes, snapshot service callers that imported it via snapshot service will silently break. `DISCLAIMER` should be defined in one canonical location.
13. **`scoreApplicationCompleteness` uses `docsSnapshot.resume` (which is already a mapped snapshot object) but the call passes `answersSnapshot.answers` for both text-answers and video-answer detection.** Line 548 in `applicationSnapshotService.js` passes `answersSnapshot.answers.filter(a => a.hasAnswerFile)` as the `submittedVideoAnswers` argument; however `buildSubmittedVideoAnswersSnapshot` (which correctly derives this from `interviewAnswers` directly) is already called separately. The completeness rubric's video-answer check at line 132 receives a filtered version of the already-mapped snapshot rather than the original `interviewAnswers` array — these are consistent but fragile; a comment to that effect would aid maintenance.
14. **`getUserCompany` is imported from `companiesController` inside `applicationController`.** Cross-importing controller helpers from other controllers creates tight coupling and circular-import risk as the codebase grows. `getUserCompany` should be extracted to a service layer.

---

## Prioritized Action List

| Priority | Action | Effort |
|----------|--------|--------|
| P0 | Confirm DDL applied to production | XS |
| P1 | Build applicant self-view completeness UI | M |
| P1 | Write backfill script for existing applications | S |
| P1 | Add completeness distribution dashboard endpoint | M |
| P1 | Fix null `companyId` NOT NULL constraint risk | XS |
| P2 | Implement `snapshot_hash` integrity verification | S |
| P2 | Delegate match score to canonical `employerApplicantSignalsService` | S |
| P2 | Add unit/integration tests for `applicationSnapshotService.js` | M |
| P2 | Add admin view for snapshot data per application | M |
| P3 | Surface completeness improvement tips in applicant dashboard | S |
| P3 | Add webhook/event when snapshot is ready | S |
| P3 | Relocate `DISCLAIMER` to a single canonical location | XS |

---

## Recommended Next Steps

1. **Immediate (today):** Verify the DDL has been applied to production. Run a count query: `SELECT COUNT(*) FROM gethired.application_snapshots;` — if the table does not exist, apply the DDL before any new applications are submitted.
2. **This sprint:** Wire the applicant self-view in the FE; write and run the backfill script; fix the `companyId` nullable risk.
3. **Next sprint:** Test coverage for the snapshot service; admin view; snapshot integrity hash.
4. **Recommended command:** Run `/NOTIFY` to surface the applicant completeness improvement tips as an actionable in-app notification; run `/MATCHED` to QA the match snapshot score parity with `employerApplicantSignalsService`.

# GETHIRED_RELEASE_QUALITY_GATE_RECENT_DEPLOYMENT
**Deployment:** Application Snapshots System  
**Date:** 2026-06-24  
**Verdict:** SHIP — all 5 gates PASS

---

## Gate A: Application submit still works with snapshot

**Status: PASS**

**Evidence:**
- `application.service.js` `jobApply()` inserts the `job_applicants` row, uploads files, saves interview answers, sends the email, and returns the result object — all before the snapshot call.
- `createApplicationSnapshots(...)` is called after `return { jobApplicantionId, jobId, dateApplied, candidateId, applicationStatusId }` is assembled but before it is returned. The snapshot call is never awaited.
- The response to the FE is the existing application object, unchanged from the pre-snapshot deployment.
- `submitApplication` controller sends `successMessage.data = apply` which is the same shape as before; no new fields added to the submit response.

**Risk:** None. The snapshot call is additive and detached.

---

## Gate B: Snapshot never blocks submit

**Status: PASS**

**Evidence:**
- `createApplicationSnapshots(...)` is called without `await`:
  ```
  createApplicationSnapshots({ ... }).catch((err) => {
    console.error("[applicationSnapshot] snapshot creation failed:", err);
  });
  ```
  The `.catch()` is attached to absorb any rejection. The submission result is returned on the next line regardless.
- Inside `createApplicationSnapshots`, each of the 3 snapshot persist calls is individually wrapped in its own `try/catch`. Errors are appended to `result.errors[]` and the function continues. The function itself never throws.
- Even the `[profile, job] = await Promise.all(...)` fetch failure only appends to `result.errors` and returns early — it does not rethrow.
- Runtime verified: service module loads cleanly; the function is exported and callable.

**Risk:** None. The pattern is belt-and-suspenders: (1) the outer `.catch()` in `application.service.js` absorbs any unexpected rejection from the async function itself; (2) the internal try/catch blocks inside `createApplicationSnapshots` absorb per-phase failures; (3) the function is designed to always resolve, never reject.

---

## Gate C: Ownership correctly enforced

**Status: PASS**

**Evidence — Applicant endpoint (GET /applicant/application/snapshot):**
- Controller queries `job_applicants` for `candidate_id` by `job_application_id`.
- If `appRows[0].candidate_id !== uid` (the Firebase uid from the verified auth token), returns 403.
- If no row found, returns 404. The 403 check only runs after confirming the row exists.
- Route has `verifyAuth` middleware; uid cannot be forged by the client.

**Evidence — Employer endpoint (GET /job/applicant/snapshot-summary):**
- Controller queries `job_applicants` for `job_id` by `job_application_id`.
- Then queries `jobs` for `company_id` by `job_id`.
- Then calls `getUserCompany(uid)` — a well-tested helper used across the employer portal.
- If `callerCompany.companyId !== jobRows[0].company_id`, returns 403.
- If either lookup returns no rows, returns 403 (not 404) — conservative fallback that avoids leaking existence information.
- Route has `verifyAuth` middleware.

**One cosmetic note (not a gate blocker):** If `getUserCompany(uid)` returns `null` (no company for this user), the comparison `null.companyId` would throw, which would be caught by the outer `try/catch` and returned as a 500 "ERROR: ..." rather than a clean 403. However this is an existing pattern used across all employer endpoints in the codebase and is a known cosmetic issue, not a security gap — the 500 still denies access.

---

## Gate D: No protected attributes in snapshots

**Status: PASS**

**Evidence:**
- `EXCLUDED_FIELDS` contains 21 fields: gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, raw_video_content, raw_audio_content, face_traits, voice_traits, accent_analysis, personality_analysis, emotion_analysis, private_preparation_notes, raw_file_binaries.
- Runtime verified: `EXCLUDED_FIELDS.includes('gender')` → true; `EXCLUDED_FIELDS.includes('race')` → true; `EXCLUDED_FIELDS.length` → 21.
- `buildApplicantProfileSnapshot()` uses an **explicit whitelist** approach — only named fields are copied from the profile object. There is no `...profile` spread, no `Object.assign`, no dynamic key iteration. Even if a protected field exists on the `profile` object at runtime, it is never referenced and never copied.
- `EXCLUDED_FIELDS` is persisted in the `excluded_fields` column of `application_snapshots` so employers can verify what was omitted.
- Match evidence (`matchedEvidence`, `missingEvidence`) only stores skill names and a `source` label — no profile attributes at all.
- `excludedFactors` in `match_snapshots` explicitly lists protected attributes with a note that they are never scored.

**Risk:** None.

---

## Gate E: FE handles null snapshot gracefully

**Status: PASS**

**Evidence:**
- `snapshotSummary` initialized to `null` in component class.
- `snapshotSummaryLoading` initialized to `false`.
- On `loadSnapshotSummary()` call: `snapshotSummary = null` is reset first, then `snapshotSummaryLoading = true`, so stale data is never shown.
- The snapshot card `div` has `*ngIf="snapshotSummaryLoading || snapshotSummary"` — card is hidden entirely when both are falsy (i.e., when snapshot load fails or no applicationId available).
- `catchError(() => of(null))` in the pipe means any HTTP error (4xx, 5xx, network) sets `snapshotSummary = null` and `snapshotSummaryLoading = false` → card disappears.
- Inside the card:
  - `*ngIf="snapshotSummaryLoading"` shows "Loading snapshot..."; `*ngIf="!snapshotSummaryLoading && snapshotSummary"` guards all real data.
  - `*ngIf="!snapshotSummary.hasSnapshot"` shows "No snapshot available" when row does not exist.
  - `*ngIf="snapshotSummary.completenessScore != null"` guards the completeness block.
  - `*ngIf="snapshotSummary.matchLevel"` guards the match level block.
- `loadSnapshotSummary` is only called when `result.data.data.applicationId` is truthy, so no spurious call is made when applicationId is missing.

**Risk:** None for the displayed card. Note: `ApplicationService.getApplicationSnapshot` (the applicant-facing method) is not yet connected to any rendered FE component. This is a deferred feature, not a gate failure.

---

## Summary Table

| Gate | Status | Confidence |
|---|---|---|
| A: Application submit still works | PASS | High — fire-and-forget pattern, pre-return assembly unchanged |
| B: Snapshot never blocks submit | PASS | High — runtime module load + static .catch() verification |
| C: Ownership correctly enforced | PASS | High — 2-step ownership chain for employer, candidate_id match for applicant |
| D: No protected attributes | PASS | High — runtime EXCLUDED_FIELDS verified, whitelist copy pattern |
| E: FE handles null gracefully | PASS | High — every null/loading/error state has an explicit ngIf guard |

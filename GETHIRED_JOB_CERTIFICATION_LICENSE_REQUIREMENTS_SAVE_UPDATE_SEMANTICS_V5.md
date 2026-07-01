# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — SAVE/UPDATE SEMANTICS V5
**Date:** 2026-07-01

---

## Save Semantics: Full Replacement Per Save

The certification requirements system uses **full replacement semantics** on every save:
1. All existing rows for the job are deleted (`DELETE WHERE job_id = $1`)
2. New rows are inserted (`INSERT` for each valid item)

---

## Decision Table

| `certificationRequirements` in request | Result |
|---|---|
| Field omitted entirely (`undefined`) | Block skipped — existing rows unchanged |
| `null` | Block skipped — existing rows unchanged |
| `[]` (empty array) | Delete all existing rows, insert none — clears all requirements |
| `[{ name: '', ... }]` (blank name) | Item silently dropped; if only blanks → same as `[]` |
| `[{ name: 'PRC', ... }]` | Delete all, insert new set |
| `[{ name: 'PRC' }, { name: '' }]` | Delete all, insert only PRC (blank filtered) |

---

## Frontend Must-Ensure: Send Current List on Every Save

**Risk:** If the FE sends `certificationRequirements: []` by default (e.g., when an employer edits unrelated fields and the cert section was not initialized from the current job state), all existing requirements would be cleared.

**Current FE behavior** (from `job-post-detail-step.component.ts`):
- Form initializes `certificationRequirements` FormArray from the existing job data
- On save, the current FormArray value is always sent
- Empty FormArray → `[]` sent → clears DB rows (intentional — employer explicitly cleared them)

**Critical requirement for any future save path:** Always initialize the cert requirements FormArray from the current job's `certificationRequirements` response before saving. Saving with an uninitialized `[]` would inadvertently clear existing requirements.

---

## Job Create Scenarios

| Scenario | certificationRequirements in request | DB result |
|---|---|---|
| New job, no credentials | `undefined` or `[]` | 0 rows |
| New job, one required license | `[{ name: 'PRC', type: 'license', importance: 'required' }]` | 1 row |
| New job, mixed Required + Preferred | `[{ ..., importance: 'required' }, { ..., importance: 'preferred' }]` | 2 rows |
| New job via AI Job Create / draft claim | `[]` (publicJobPreviewController initializes empty) | 0 rows; employer fills in on review |

---

## Job Update Scenarios

| Scenario | Action | Result |
|---|---|---|
| Employer adds a row | Sends current list + new row | Delete old, insert new set with new row |
| Employer edits a row | Sends current list with modified row | Delete old, reinsert modified set |
| Employer removes a row | Sends list without that row | Delete old, insert reduced set |
| Employer clears all | Sends `[]` | Delete all, insert none |
| Employer saves unrelated field | FE sends current certificationRequirements from form state | Existing rows preserved |

---

## Draft Scenarios

| Scenario | Result |
|---|---|
| Save Draft with requirements | `saveJobArray()` called → requirements persisted in DB |
| Autosave with requirements | Same as manual draft save (autosave calls same API endpoint) |
| Resume Draft | `mappedJob()` returns `certificationRequirements` → FE initializes FormArray |
| Publish with requirements | No separate publish step for requirements — already saved in DB; `mappedJob()` returns them publicly after publish |

---

## Published Job Scenarios

| Scenario | Result |
|---|---|
| Employer edits published job | `updateJob()` → `saveJobArray()` → full replacement (same as draft) |
| Public reads published job with requirements | `getJobCertificationRequirements()` returns public-safe DTO |
| Public reads published job with no requirements | Empty array → FE hides section |

---

## API Cannot Distinguish Omit vs Empty Risk

**Finding:** The server CAN distinguish:
- `undefined` (not in body) → `if (certificationRequirements)` is falsy → skip → preserve existing
- `[]` (sent in body) → truthy → delete all → clear

**This is correct behavior.** FE must always send the current list on save.

**Risk if FE fails to initialize:** Sending `[]` inadvertently clears requirements.
**Mitigation:** FE `job-post-detail-step.component.ts` initializes from job data on load. Verified that `undefined`/`null` from API normalizes to `[]` in the normalizer, then FormArray is initialized from this — an empty FormArray will send `[]` if employer hasn't added anything (which is correct: job had no requirements, still has none).

**Edge case to watch:** If FE initializes FormArray AFTER the autosave fires (race condition). Autosave should wait for form initialization before firing. Backlog item.

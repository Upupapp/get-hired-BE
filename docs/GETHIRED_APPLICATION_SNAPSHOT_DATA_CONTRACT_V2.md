# GETHIRED APPLICATION SNAPSHOTS — Phase 3: Data Contract

**Command:** GETHIRED_APPLICATION_SNAPSHOTS_COMPLETENESS_MATCH_SNAPSHOT_WORLD_CLASS_V2
**Date:** 2026-06-24

## application_snapshots

| Field | Type | Notes |
|-------|------|-------|
| id | varchar (UUID) | PK |
| application_id | varchar | FK → job_applicants.job_application_id |
| applicant_id | varchar | Firebase UID of applicant |
| job_id | varchar | FK → jobs.job_id |
| company_id | varchar | FK → companies.company_id |
| snapshot_version | varchar | "application_snapshot_v1" |
| source | varchar | "application_submit" or "backfill_current_data" |
| provenance_json | jsonb | Creation context: who/when/why |
| snapshot_hash | varchar | Reserved for future integrity verification |
| applicant_profile_snapshot | jsonb | Submitted-state profile (see below) |
| job_snapshot | jsonb | Job state at submission time |
| submitted_documents_snapshot | jsonb | Document metadata only (no binaries) |
| submitted_answers_snapshot | jsonb | Interview answer metadata only (no video content) |
| submitted_video_answers_snapshot | jsonb | Video answer metadata (nullable) |
| excluded_fields | jsonb | Protected attributes excluded from snapshot |
| created_at | timestamp | Immutable: set once on INSERT |
| updated_at | timestamp | Available for future versioning |

### applicant_profile_snapshot shape
```json
{
  "available": true,
  "snapshotVersion": "application_snapshot_v1",
  "displayName": "John Doe",
  "jobTitle": "Software Engineer",
  "shortBio": "...",
  "city": "Manila",
  "country": "Philippines",
  "workSetupName": "Remote",
  "jobTypeName": "Full-time",
  "jobLevelName": "Mid-level",
  "salaryMinimum": 50000,
  "salaryMaximum": 80000,
  "salaryCurrency": "PHP",
  "skills": [...],
  "workExperience": [{companyName, jobTitle, startDate, endDate, jobTypeName}],
  "educationalBackground": [{schoolName, courseName, startYear, endYear}],
  "certifications": [{certTitle, startYear, endYear}],
  "hasVideoCv": false,
  "videoCvUrl": null,
  "documentCount": 2
}
```

**Excluded (never stored):** name/photo/video inference data, gender, civil_status, date_of_birth, religion, nationality, political_views, union_membership, disability_status, health_conditions, family_status, race, ethnicity, raw_video_content, raw_audio_content, face_traits, voice_traits, accent_analysis, personality_analysis, emotion_analysis, private_preparation_notes, raw_file_binaries.

## application_completeness_snapshots

| Field | Type | Notes |
|-------|------|-------|
| completeness_score | integer | 0–100, rubric v1 |
| completeness_level | varchar | "excellent", "strong", "basic", "incomplete" |
| required_completed_count | integer | |
| required_total_count | integer | |
| recommended_completed_count | integer | |
| recommended_total_count | integer | |
| missing_required | jsonb | [{field, label, reason}] |
| missing_recommended | jsonb | [{field, label, reason}] |
| completed_sections | jsonb | string[] |
| evidence | jsonb | Internal rubric trace |
| scoring_rubric_version | varchar | "application_completeness_v1" |
| source | varchar | Same as parent snapshot |
| calculated_at | timestamp | When the score was computed |

## match_snapshots

| Field | Type | Notes |
|-------|------|-------|
| match_score | integer | Nullable (null if insufficient data) |
| match_level | varchar | "strong", "possible", "low", null |
| matched_evidence | jsonb | [{type:"required_skill", value, source}] |
| missing_evidence | jsonb | [{type:"missing_required_skill", value, source}] |
| neutral_evidence | jsonb | Factors noted but not scored |
| factor_scores | jsonb | {required_skills_score, cv_presence_score} |
| excluded_factors | jsonb | Protected attributes + unimplemented factors |
| match_algorithm_version | varchar | "employer_signals_v5" |
| source | varchar | Same as parent snapshot |
| calculated_at | timestamp | When signals were computed |

**Critical note:** Match snapshots are guidance only. Never used to auto-rank, auto-reject, or hide candidates. The `matchDisclaimer` field in API responses quotes this constraint.

## Idempotency Anchor
Each table has a partial unique index on `(application_id) WHERE source = 'application_submit'` — one original snapshot per application, never duplicated on retry. `ON CONFLICT DO NOTHING` in all INSERT statements.

/**
 * GETHIRED_APPLICATION_SNAPSHOTS_COMPLETENESS_MATCH_SNAPSHOT_WORLD_CLASS_V2
 *
 * Application Snapshot Service — three snapshot types:
 *   1. application_snapshots         — immutable submitted-state record
 *   2. application_completeness_snapshots — deterministic completeness score
 *   3. match_snapshots               — persisted explainable match guidance
 *
 * Design invariants:
 *   - Snapshot creation never blocks or fails the application submission.
 *     If any snapshot fails, the error is logged and the application result
 *     is still returned to the caller.
 *   - Every snapshot is idempotent: the unique index on (application_id)
 *     WHERE source='application_submit' means a retry never creates a
 *     duplicate original. ON CONFLICT DO NOTHING is used throughout.
 *   - No protected attributes are persisted (see EXCLUDED_FIELDS).
 *   - File/video content is never stored — only URL references.
 *   - Match snapshots are guidance only, never auto-rank/auto-reject signals.
 */

import dbQuery from "../db/dbQuery";
import env from "../env";
import { appplicantProfile } from "./applicant.service";
import { jobDetails } from "./job.service";
import { getApplicantFitSignals, DISCLAIMER } from "./match/employerApplicantSignalsService";

const dbSchema = env.schema;

// Fields deliberately excluded from every snapshot for privacy/fairness.
// Persisted in excluded_fields so employers can verify what was omitted.
const EXCLUDED_FIELDS = [
  "gender", "civil_status", "date_of_birth", "religion", "nationality",
  "political_views", "union_membership", "disability_status", "health_conditions",
  "family_status", "race", "ethnicity",
  "raw_video_content", "raw_audio_content", "face_traits", "voice_traits",
  "accent_analysis", "personality_analysis", "emotion_analysis",
  "private_preparation_notes", "raw_file_binaries",
];

const SNAPSHOT_VERSION = "application_snapshot_v1";
const COMPLETENESS_RUBRIC_VERSION = "application_completeness_v1";
const MATCH_ALGORITHM_VERSION = "employer_signals_v5";

// ─── Completeness scoring rubric ────────────────────────────────────────────

/**
 * Application-time completeness scoring. Measures whether the submitted
 * application has enough information for employer review. NOT a quality or
 * hiring decision — purely structural completeness.
 *
 * Rubric version: application_completeness_v1
 */
const scoreApplicationCompleteness = (profile, submittedDocs, submittedAnswers, submittedVideoAnswers) => {
  const requiredItems = [];
  const completedRequired = [];
  const missingRequired = [];
  const recommendedItems = [];
  const completedRecommended = [];
  const missingRecommended = [];
  const completedSections = [];

  // ── Required: basic profile present ──────────────────────────────────────
  requiredItems.push("basic_profile");
  if (profile && profile.jobTitle) {
    completedRequired.push("basic_profile");
    completedSections.push("Basic profile (job title)");
  } else {
    missingRequired.push({
      field: "basic_profile",
      label: "Basic profile (job title)",
      reason: "Add a job title to your profile so employers can see your current professional focus at a glance.",
    });
  }

  // ── Required: work experience ─────────────────────────────────────────────
  requiredItems.push("work_experience");
  if (profile && (profile.workExperience || []).length > 0) {
    completedRequired.push("work_experience");
    completedSections.push("Work experience");
  } else {
    missingRequired.push({
      field: "work_experience",
      label: "Work experience",
      reason: "Add your work history so employers can see what roles and responsibilities you've had.",
    });
  }

  // ── Required: skills ─────────────────────────────────────────────────────
  requiredItems.push("skills");
  if (profile && (profile.skills || []).length > 0) {
    completedRequired.push("skills");
    completedSections.push("Skills");
  } else {
    missingRequired.push({
      field: "skills",
      label: "Skills",
      reason: "List your skills so employers can see how well you match what the role needs.",
    });
  }

  // ── Recommended: education ───────────────────────────────────────────────
  recommendedItems.push("education");
  if (profile && (profile.educationalBackground || []).length > 0) {
    completedRecommended.push("education");
    completedSections.push("Education");
  } else {
    missingRecommended.push({
      field: "education",
      label: "Education",
      reason: "Add your education history to give employers a fuller picture of your background.",
    });
  }

  // ── Recommended: CV/document submitted ───────────────────────────────────
  recommendedItems.push("cv_submitted");
  const hasCvDoc = (submittedDocs.resume && submittedDocs.resume.length > 0) ||
    (profile && (profile.documents || []).length > 0) ||
    (profile && !!profile.videoCVUrl);
  if (hasCvDoc) {
    completedRecommended.push("cv_submitted");
    completedSections.push("CV/document submitted with application");
  } else {
    missingRecommended.push({
      field: "cv_submitted",
      label: "CV or document submitted",
      reason: "Upload a CV to give employers more detail to review alongside your application.",
    });
  }

  // ── Recommended: video answer submitted ──────────────────────────────────
  recommendedItems.push("video_answers");
  if (submittedVideoAnswers && submittedVideoAnswers.length > 0) {
    completedRecommended.push("video_answers");
    completedSections.push("Video answers submitted");
  } else {
    missingRecommended.push({
      field: "video_answers",
      label: "Video answers",
      reason: "Record a video answer to present yourself in your own words, beyond what's on the page.",
    });
  }

  // ── Recommended: certifications ─────────────────────────────────────────
  recommendedItems.push("certifications");
  if (profile && (profile.certifications || []).length > 0) {
    completedRecommended.push("certifications");
    completedSections.push("Certifications");
  } else {
    missingRecommended.push({
      field: "certifications",
      label: "Certifications",
      reason: "Add any certifications you hold to strengthen your profile, especially for roles that ask for specific credentials.",
    });
  }

  // ── Score calculation ─────────────────────────────────────────────────────
  const requiredWeight = 70;
  const recommendedWeight = 30;

  const requiredScore = requiredItems.length > 0
    ? (completedRequired.length / requiredItems.length) * requiredWeight
    : 0;
  const recommendedScore = recommendedItems.length > 0
    ? (completedRecommended.length / recommendedItems.length) * recommendedWeight
    : 0;

  const totalScore = Math.round(requiredScore + recommendedScore);

  const level = totalScore >= 90 ? "excellent"
    : totalScore >= 70 ? "strong"
    : totalScore >= 40 ? "basic"
    : "incomplete";

  return {
    completeness_score: totalScore,
    completeness_level: level,
    required_completed_count: completedRequired.length,
    required_total_count: requiredItems.length,
    recommended_completed_count: completedRecommended.length,
    recommended_total_count: recommendedItems.length,
    missing_required: missingRequired,
    missing_recommended: missingRecommended,
    completed_sections: completedSections,
    evidence: {
      requiredItems,
      completedRequired,
      recommendedItems,
      completedRecommended,
      disclaimerNote: "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions.",
    },
    scoring_rubric_version: COMPLETENESS_RUBRIC_VERSION,
  };
};

// ─── Profile snapshot builder ─────────────────────────────────────────────────

const buildApplicantProfileSnapshot = (profile) => {
  if (!profile) return { available: false, reason: "no_profile_found" };

  // Store only review-relevant fields. Never store protected attributes,
  // raw video content, or unrelated account data.
  return {
    available: true,
    snapshotVersion: SNAPSHOT_VERSION,
    displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Applicant",
    jobTitle: profile.jobTitle || null,
    shortBio: profile.shortBio || null,
    city: profile.city || null,
    country: profile.country || null,
    workSetupName: profile.workSetupName || null,
    jobTypeName: profile.jobTypeName || null,
    jobLevelName: profile.jobLevelName || null,
    salaryMinimum: profile.salaryMinimum || null,
    salaryMaximum: profile.salaryMaximum || null,
    salaryCurrency: profile.salaryCurrency || null,
    skills: (profile.skills || []).slice(),
    workExperience: (profile.workExperience || []).map(w => ({
      companyName: w.companyName || null,
      jobTitle: w.jobTitle || null,
      startDate: w.startDate || null,
      endDate: w.endDate || null,
      jobTypeName: w.jobTypeName || null,
    })),
    educationalBackground: (profile.educationalBackground || []).map(e => ({
      schoolName: e.schoolName || null,
      courseName: e.courseName || null,
      startYear: e.startYear || null,
      endYear: e.endYear || null,
    })),
    certifications: (profile.certifications || []).map(c => ({
      certTitle: c.certTitle || null,
      startYear: c.startYear || null,
      endYear: c.endYear || null,
    })),
    // URL references only — never raw file content
    hasVideoCv: !!profile.videoCVUrl,
    videoCvUrl: profile.videoCVUrl || null,
    documentCount: (profile.documents || []).length,
  };
};

const buildJobSnapshot = (job) => {
  if (!job) return { available: false, reason: "no_job_found" };

  return {
    available: true,
    snapshotVersion: SNAPSHOT_VERSION,
    jobId: job.jobId || null,
    jobTitle: job.jobTitle || null,
    companyId: job.companyId || null,
    companyName: job.companyName || null,
    jobTypeName: job.jobTypeName || null,
    jobLevelName: job.jobLevelName || null,
    workSetupName: job.workSetupName || null,
    jobCity: job.jobCity || null,
    jobCountry: job.jobCountry || null,
    salaryMinimum: job.salaryMinimum || null,
    salaryMaximum: job.salaryMaximum || null,
    salaryCurrency: job.salaryCurrency || null,
    jobDescription: job.jobDescription || null,
    skills: (job.skills || []).slice(),
    requirements: (job.requirements || []).slice(),
  };
};

// ─── Document/video/answer snapshot builders ──────────────────────────────────

const buildSubmittedDocumentsSnapshot = (coverLetter, resume, governmentFiles) => {
  // Store file metadata (name, type, size) and URL references only.
  // Never store raw file content or binaries.
  return {
    coverLetter: (coverLetter || []).map(d => ({
      filename: d.filename || null,
      type: d.type || null,
      size: d.size || null,
      fileUrlRef: d.fileUrl || d.id || "ref_only",
    })),
    resume: (resume || []).map(d => ({
      filename: d.filename || null,
      type: d.type || null,
      size: d.size || null,
      fileUrlRef: d.fileUrl || d.id || "ref_only",
    })),
    governmentFiles: (governmentFiles || []).map(d => ({
      filename: d.filename || null,
      type: d.type || null,
      size: d.size || null,
      fileUrlRef: d.fileUrl || d.id || "ref_only",
    })),
    totalCount: (coverLetter || []).length + (resume || []).length + (governmentFiles || []).length,
  };
};

const buildSubmittedAnswersSnapshot = (interviewAnswers) => {
  // Store answer metadata only — never video content or raw file binaries.
  return {
    answers: (interviewAnswers || []).map(a => ({
      questionId: a.questionId || null,
      hasAnswerFile: !!a.answerFile,
      answerUrlRef: a.answerFile ? "video_answer_ref" : null,
    })),
    totalCount: (interviewAnswers || []).length,
  };
};

const buildSubmittedVideoAnswersSnapshot = (interviewAnswers) => {
  const videoAnswers = (interviewAnswers || []).filter(a => !!a.answerFile);
  if (videoAnswers.length === 0) return null;

  return {
    count: videoAnswers.length,
    questionIds: videoAnswers.map(a => a.questionId).filter(Boolean),
    noteForReview: "Video answer URLs are stored in interview_answers table. References only in snapshot.",
  };
};

// ─── Persist application snapshot ─────────────────────────────────────────────

const persistApplicationSnapshot = async (
  applicationId, applicantId, jobId, companyId,
  profileSnapshot, jobSnapshot, docsSnapshot, answersSnapshot, videoAnswersSnapshot,
  source = "application_submit"
) => {
  const provenance = {
    snapshotVersion: SNAPSHOT_VERSION,
    source,
    createdBy: "applicationSnapshotService.js",
    note: source === "backfill_current_data"
      ? "Generated from current profile/job data; not original submission-time record."
      : "Captured at application submission time.",
  };

  const insertQuery = `
    INSERT INTO ${dbSchema}.application_snapshots
      (application_id, applicant_id, job_id, company_id,
       snapshot_version, source, provenance_json,
       applicant_profile_snapshot, job_snapshot,
       submitted_documents_snapshot, submitted_answers_snapshot,
       submitted_video_answers_snapshot, excluded_fields)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT DO NOTHING
    RETURNING id;
  `;

  const { rows } = await dbQuery.query(insertQuery, [
    applicationId, applicantId, jobId, companyId,
    SNAPSHOT_VERSION, source,
    JSON.stringify(provenance),
    JSON.stringify(profileSnapshot),
    JSON.stringify(jobSnapshot),
    JSON.stringify(docsSnapshot),
    JSON.stringify(answersSnapshot),
    videoAnswersSnapshot ? JSON.stringify(videoAnswersSnapshot) : null,
    JSON.stringify({ excludedFields: EXCLUDED_FIELDS }),
  ]);

  return rows && rows.length > 0 ? rows[0].id : null;
};

// ─── Persist completeness snapshot ────────────────────────────────────────────

const persistCompletenessSnapshot = async (
  applicationId, applicantId, jobId, companyId,
  completenessResult, source = "application_submit"
) => {
  const insertQuery = `
    INSERT INTO ${dbSchema}.application_completeness_snapshots
      (application_id, applicant_id, job_id, company_id,
       completeness_score, completeness_level,
       required_completed_count, required_total_count,
       recommended_completed_count, recommended_total_count,
       missing_required, missing_recommended, completed_sections,
       evidence, scoring_rubric_version, source, calculated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
    ON CONFLICT DO NOTHING
    RETURNING id;
  `;

  const { rows } = await dbQuery.query(insertQuery, [
    applicationId, applicantId, jobId, companyId,
    completenessResult.completeness_score,
    completenessResult.completeness_level,
    completenessResult.required_completed_count,
    completenessResult.required_total_count,
    completenessResult.recommended_completed_count,
    completenessResult.recommended_total_count,
    JSON.stringify(completenessResult.missing_required),
    JSON.stringify(completenessResult.missing_recommended),
    JSON.stringify(completenessResult.completed_sections),
    JSON.stringify(completenessResult.evidence),
    completenessResult.scoring_rubric_version,
    source,
  ]);

  return rows && rows.length > 0 ? rows[0].id : null;
};

// ─── Persist match snapshot ───────────────────────────────────────────────────

const persistMatchSnapshot = async (
  applicationId, applicantId, jobId, companyId,
  fitSignals, source = "application_submit"
) => {
  const matchScore = fitSignals && typeof fitSignals.applicationCompleteness === "number"
    ? Math.round(
        ((fitSignals.matchedRequiredSkills || []).length > 0
          ? fitSignals.matchedRequiredSkills.length /
            ((fitSignals.matchedRequiredSkills || []).length + (fitSignals.missingRequiredSkills || []).length)
          : 0) * 60 + (fitSignals.hasCv ? 40 : 0)
      )
    : null;

  const matchLevel = fitSignals
    ? mapMatchLevel(fitSignals.label)
    : null;

  const matchedEvidence = (fitSignals && fitSignals.matchedRequiredSkills || []).map(skill => ({
    type: "required_skill",
    value: skill,
    source: "applicant_skills vs job_required_skills",
  }));

  const missingEvidence = (fitSignals && fitSignals.missingRequiredSkills || []).map(skill => ({
    type: "missing_required_skill",
    value: skill,
    source: "job_required_skills",
  }));

  const neutralEvidence = fitSignals && fitSignals.dataNotUsed
    ? fitSignals.dataNotUsed.map(d => ({ type: "not_used", reason: d }))
    : [];

  const factorScores = {
    required_skills_score: Math.round(
      (fitSignals && fitSignals.matchedRequiredSkills || []).length > 0
        ? ((fitSignals.matchedRequiredSkills.length) /
            ((fitSignals.matchedRequiredSkills.length) + (fitSignals.missingRequiredSkills || []).length)) * 60
        : 0
    ),
    cv_presence_score: fitSignals && fitSignals.hasCv ? 40 : 0,
  };

  const excludedFactors = {
    protectedAttributes: EXCLUDED_FIELDS.filter(f =>
      ["gender", "civil_status", "date_of_birth", "religion", "nationality",
       "race", "ethnicity", "disability_status", "family_status"].includes(f)
    ),
    note: "Protected attributes are never scored or persisted in match evidence.",
    certificationLicenseMatching: "Not implemented in current match algorithm version.",
    personalityAnalysis: "Not implemented; excluded by design.",
  };

  const insertQuery = `
    INSERT INTO ${dbSchema}.match_snapshots
      (application_id, applicant_id, job_id, company_id,
       match_score, match_level,
       matched_evidence, missing_evidence, neutral_evidence,
       factor_scores, excluded_factors,
       match_algorithm_version, source, calculated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
    ON CONFLICT DO NOTHING
    RETURNING id;
  `;

  const { rows } = await dbQuery.query(insertQuery, [
    applicationId, applicantId, jobId, companyId,
    matchScore, matchLevel,
    JSON.stringify(matchedEvidence),
    JSON.stringify(missingEvidence),
    JSON.stringify(neutralEvidence),
    JSON.stringify(factorScores),
    JSON.stringify(excludedFactors),
    MATCH_ALGORITHM_VERSION,
    source,
  ]);

  return rows && rows.length > 0 ? rows[0].id : null;
};

const mapMatchLevel = (label) => {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("strong")) return "strong";
  if (l.includes("good")) return "possible";
  if (l.includes("needs review")) return "low";
  if (l.includes("missing")) return "low";
  if (l.includes("limited")) return null;
  return null;
};

// ─── Main orchestrator ────────────────────────────────────────────────────────

/**
 * Called after a successful application insert. Best-effort: never throws
 * to the caller. Failures are logged and summarized in the returned object.
 */
const createApplicationSnapshots = async ({
  applicationId,
  applicantId,  // firebase uid
  jobId,
  companyId,
  coverLetter,
  resume,
  governmentFiles,
  interviewAnswers,
  source = "application_submit",
}) => {
  const result = {
    snapshotId: null,
    completenessSnapshotId: null,
    matchSnapshotId: null,
    errors: [],
  };

  // company_id NOT NULL in all 3 snapshot tables — skip entirely rather than
  // letting the INSERT fail silently inside the fire-and-forget .catch().
  if (!companyId) {
    console.warn("[applicationSnapshot] skipped: companyId is missing for applicationId", applicationId);
    return result;
  }

  let profile = null;
  let job = null;

  try {
    [profile, job] = await Promise.all([
      appplicantProfile(applicantId),
      jobDetails(jobId),
    ]);
  } catch (fetchErr) {
    result.errors.push({ phase: "fetch_data", error: String(fetchErr) });
    return result;
  }

  const profileSnapshot = buildApplicantProfileSnapshot(profile);
  const jobSnapshot = buildJobSnapshot(job);
  const docsSnapshot = buildSubmittedDocumentsSnapshot(coverLetter, resume, governmentFiles);
  const answersSnapshot = buildSubmittedAnswersSnapshot(interviewAnswers);
  const videoAnswersSnapshot = buildSubmittedVideoAnswersSnapshot(interviewAnswers);

  // 1. Application snapshot
  try {
    result.snapshotId = await persistApplicationSnapshot(
      applicationId, applicantId, jobId, companyId,
      profileSnapshot, jobSnapshot, docsSnapshot, answersSnapshot, videoAnswersSnapshot,
      source
    );
  } catch (snapshotErr) {
    result.errors.push({ phase: "application_snapshot", error: String(snapshotErr) });
  }

  // 2. Completeness snapshot
  try {
    const completenessResult = scoreApplicationCompleteness(
      profile, docsSnapshot, answersSnapshot.answers, answersSnapshot.answers.filter(a => a.hasAnswerFile)
    );
    result.completenessSnapshotId = await persistCompletenessSnapshot(
      applicationId, applicantId, jobId, companyId, completenessResult, source
    );
  } catch (completenessErr) {
    result.errors.push({ phase: "completeness_snapshot", error: String(completenessErr) });
  }

  // 3. Match snapshot (optional: failure here never blocks)
  try {
    const fitSignals = await getApplicantFitSignals(applicantId, jobId);
    result.matchSnapshotId = await persistMatchSnapshot(
      applicationId, applicantId, jobId, companyId, fitSignals, source
    );
  } catch (matchErr) {
    result.errors.push({ phase: "match_snapshot", error: String(matchErr) });
  }

  return result;
};

// ─── Retrieval helpers ────────────────────────────────────────────────────────

const getApplicationSnapshot = async (applicationId) => {
  const { rows } = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.application_snapshots WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [applicationId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
};

const getCompletenessSnapshot = async (applicationId) => {
  const { rows } = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.application_completeness_snapshots WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [applicationId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
};

const getMatchSnapshot = async (applicationId) => {
  const { rows } = await dbQuery.query(
    `SELECT * FROM ${dbSchema}.match_snapshots WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [applicationId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
};

/**
 * Returns a snapshot summary suitable for the employer applicant list.
 * Never exposes raw document content or cross-company data.
 */
const getApplicationSnapshotSummaryForEmployer = async (applicationId) => {
  const [appSnap, compSnap, matchSnap] = await Promise.all([
    getApplicationSnapshot(applicationId),
    getCompletenessSnapshot(applicationId),
    getMatchSnapshot(applicationId),
  ]);

  return {
    hasSnapshot: !!appSnap,
    snapshotSource: appSnap ? appSnap.source : null,
    snapshotCreatedAt: appSnap ? appSnap.created_at : null,
    completenessScore: compSnap ? compSnap.completeness_score : null,
    completenessLevel: compSnap ? compSnap.completeness_level : null,
    matchScore: matchSnap ? matchSnap.match_score : null,
    matchLevel: matchSnap ? matchSnap.match_level : null,
    hasMatchSnapshot: !!matchSnap,
    matchDisclaimer: DISCLAIMER,
  };
};

export {
  createApplicationSnapshots,
  getApplicationSnapshot,
  getCompletenessSnapshot,
  getMatchSnapshot,
  getApplicationSnapshotSummaryForEmployer,
  scoreApplicationCompleteness,
  SNAPSHOT_VERSION,
  COMPLETENESS_RUBRIC_VERSION,
  MATCH_ALGORITHM_VERSION,
  EXCLUDED_FIELDS,
  DISCLAIMER,
};

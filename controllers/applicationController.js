import { jobApply } from "../services/application.service";
import { successResponse, errorResponse, status } from "../helpers/status";
import {
  getApplicationSnapshot,
  getCompletenessSnapshot,
  getMatchSnapshot,
  getApplicationSnapshotSummaryForEmployer,
  EXCLUDED_FIELDS,
} from "../services/applicationSnapshotService";
import { getUserCompanyForRequest } from "./companiesController";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const submitApplication = async (req, res) => {
  const { uid } = req.user;
  // SECURE fix: candidateId is no longer read from the request body --
  // jobApply() derives it from the authenticated uid directly. Kept out
  // of the `application` object entirely so there's no path left where a
  // body-supplied value could be mistaken for the real one.
  const { jobId, applicantId, coverLetter, resume, governmentFiles, interviewAnswers } = req.body;

  const application = {
    jobId,
    applicantId,
    coverLetter,
    resume,
    governmentFiles,
    interviewAnswers,
    applicationStatusId: interviewAnswers.length > 0 ? 3:2
  };

  try {
    const apply = await jobApply(application, uid);
    return res.status(status.success).json(successResponse(apply));
  } catch (error) {
    // GH-FOUND-B01: duplicate application is a normal, expected user
    // state, not a server error -- give it its own safe response instead
    // of falling into the generic 500/raw-error path.
    if (error && error.code === "JOB_APPLICATION_ALREADY_EXISTS") {
      return res.status(409).send({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    return res.status(status.error).json(errorResponse("Something went wrong. Please try again later."));
  }
};

/**
 * GET /applicant/application/snapshot?applicationId=<id>
 * Returns this applicant's own application snapshot + completeness summary.
 * Never exposes data to other applicants.
 */
const getApplicantApplicationSnapshot = async (req, res) => {
  const { uid } = req.user;
  const { applicationId } = req.query;

  if (!applicationId) {
    return res.status(status.bad).json(errorResponse("applicationId is required."));
  }

  try {
    // Confirm the caller owns this application
    const { rows: appRows } = await dbQuery.query(
      `SELECT candidate_id, job_id FROM ${dbSchema}.job_applicants WHERE job_application_id = $1 LIMIT 1`,
      [applicationId]
    );
    if (!appRows || appRows.length === 0) {
      return res.status(status.notfound).send({ status: "error", error: "Application not found." });
    }
    if (appRows[0].candidate_id !== uid) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    const [snap, comp] = await Promise.all([
      getApplicationSnapshot(applicationId),
      getCompletenessSnapshot(applicationId),
    ]);

    return res.status(status.success).json(successResponse({
      applicationId,
      hasSnapshot: !!snap,
      snapshotCreatedAt: snap ? snap.created_at : null,
      completenessScore: comp ? comp.completeness_score : null,
      completenessLevel: comp ? comp.completeness_level : null,
      completedSections: comp ? comp.completed_sections : null,
      missingRequired: comp ? comp.missing_required : null,
      missingRecommended: comp ? comp.missing_recommended : null,
      disclaimerNote: "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions.",
      privacyNote: "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring.",
    }));
  } catch (error) {
    console.error("[getApplicantApplicationSnapshot]", error);
    return res.status(status.error).json(errorResponse("Unable to retrieve your application snapshot. Please try again later."));
  }
};

/**
 * GET /job/applicant/snapshot-summary?applicationId=<id>
 * Returns a snapshot summary for an employer reviewing an applicant.
 * Enforces company ownership: the caller's company must own the job.
 */
const getEmployerApplicantSnapshotSummary = async (req, res) => {
  const { uid } = req.user;
  const { applicationId } = req.query;

  if (!applicationId) {
    return res.status(status.bad).json(errorResponse("applicationId is required."));
  }

  try {
    // Get the application's job and candidate
    const { rows: appRows } = await dbQuery.query(
      `SELECT job_id, candidate_id FROM ${dbSchema}.job_applicants WHERE job_application_id = $1 LIMIT 1`,
      [applicationId]
    );
    // SECURE fix (enumeration oracle): use 403 for both "not found" and
    // "wrong company" so a recruiter from Company B cannot probe valid
    // applicationIds by comparing 404 vs 403 response codes.
    if (!appRows || appRows.length === 0) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    // Confirm the caller's company owns the job
    const { rows: jobRows } = await dbQuery.query(
      `SELECT company_id FROM ${dbSchema}.jobs WHERE job_id = $1 LIMIT 1`,
      [appRows[0].job_id]
    );
    if (!jobRows || jobRows.length === 0) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    const callerCompany = await getUserCompanyForRequest(req, uid);
    // Array.isArray guard: getUserCompany returns [] when no company exists
    // (not null/undefined), so !callerCompany alone won't catch that case.
    if (!callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobRows[0].company_id) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    const summary = await getApplicationSnapshotSummaryForEmployer(applicationId);
    return res.status(status.success).json(successResponse(summary));
  } catch (error) {
    console.error("[getEmployerApplicantSnapshotSummary]", error);
    return res.status(status.error).json(errorResponse("Unable to retrieve application summary. Please try again later."));
  }
};

/**
 * GET /applicant/application/snapshots?applicationIds=id1,id2,...
 * Batch completeness snapshot lookup for the applicant's own applications.
 * Replaces N individual calls with 3 DB queries regardless of list size.
 * Max 50 IDs per request.
 */
const getApplicantApplicationSnapshotsBatch = async (req, res) => {
  const { uid } = req.user;
  const { applicationIds: raw } = req.query;

  if (!raw) {
    return res.status(status.bad).json(errorResponse("applicationIds is required."));
  }

  // Explicit type guard: Express parses repeated params (?x=a&x=b) as Array and
  // nested params (?x[k]=v) as plain object. Array.join(',') is intentional (not
  // accidental String(Array) coercion). A plain object is rejected to '' so the
  // length === 0 check below returns 400 rather than passing "[object Object]" to the DB.
  const rawStr = Array.isArray(raw) ? raw.join(',') : (typeof raw === 'string' ? raw : '');
  const applicationIds = rawStr.split(",").map(s => s.trim()).filter(Boolean);
  if (applicationIds.length === 0 || applicationIds.length > 50) {
    return res.status(status.bad).json(errorResponse("applicationIds must be a non-empty comma-separated list of up to 50 IDs."));
  }

  try {
    // Single ownership check — verify caller owns all supplied IDs.
    // IDs that don't exist are silently excluded from results (not a 403 —
    // the caller owns the list, they may have IDs from before snapshots existed).
    const { rows: appRows } = await dbQuery.query(
      `SELECT job_application_id, candidate_id FROM ${dbSchema}.job_applicants WHERE job_application_id = ANY($1::text[])`,
      [applicationIds]
    );

    const verifiedIds = appRows
      .filter(row => row.candidate_id === uid)
      .map(row => row.job_application_id);

    if (verifiedIds.length === 0) {
      return res.status(status.success).json(successResponse({ snapshots: {} }));
    }

    // Two batch queries — N*3 individual queries reduced to 3 regardless of list size.
    // Both queries include 'backfill_current_data' so applicants see completeness tips
    // for applications submitted before real-time snapshot capture was enabled.
    // DISTINCT ON (application_id) prioritises the real submission row when both exist
    // (in case the backfill ran before the submit snapshot was captured, then the
    // submission snapshot was captured later, producing two rows per application).
    const [snapshotRows, completenessRows] = await Promise.all([
      dbQuery.query(
        `SELECT DISTINCT ON (application_id) application_id FROM ${dbSchema}.application_snapshots
         WHERE application_id = ANY($1::text[]) AND source IN ('application_submit', 'backfill_current_data')
         ORDER BY application_id, CASE WHEN source = 'application_submit' THEN 1 ELSE 2 END`,
        [verifiedIds]
      ),
      dbQuery.query(
        `SELECT DISTINCT ON (application_id) application_id, completeness_score, completeness_level, missing_required, missing_recommended
         FROM ${dbSchema}.application_completeness_snapshots
         WHERE application_id = ANY($1::text[]) AND source IN ('application_submit', 'backfill_current_data')
         ORDER BY application_id, CASE WHEN source = 'application_submit' THEN 1 ELSE 2 END`,
        [verifiedIds]
      ),
    ]);

    const snapshotSet = new Set(snapshotRows.rows.map(r => r.application_id));
    const completenessMap = {};
    completenessRows.rows.forEach(r => { completenessMap[r.application_id] = r; });

    const disclaimerNote = "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions.";
    const privacyNote = "Protected personal attributes (such as gender, age, religion, and disability status) are never included in completeness scoring.";

    const snapshots = {};
    verifiedIds.forEach(id => {
      const comp = completenessMap[id] || null;
      snapshots[id] = {
        hasSnapshot: snapshotSet.has(id),
        completenessScore: comp ? comp.completeness_score : null,
        completenessLevel: comp ? comp.completeness_level : null,
        missingRequired: comp ? comp.missing_required : null,
        missingRecommended: comp ? comp.missing_recommended : null,
        disclaimerNote,
        privacyNote,
      };
    });

    return res.status(status.success).json(successResponse({ snapshots }));
  } catch (error) {
    console.error("[getApplicantApplicationSnapshotsBatch]", error);
    return res.status(status.error).json(errorResponse("Unable to retrieve your application snapshots. Please try again later."));
  }
};

export { submitApplication, getApplicantApplicationSnapshot, getEmployerApplicantSnapshotSummary, getApplicantApplicationSnapshotsBatch };

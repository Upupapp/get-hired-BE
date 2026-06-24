import { jobApply } from "../services/application.service";
import { successMessage, errorMessage, status } from "../helpers/status";
import {
  getApplicationSnapshot,
  getCompletenessSnapshot,
  getMatchSnapshot,
  getApplicationSnapshotSummaryForEmployer,
  EXCLUDED_FIELDS,
} from "../services/applicationSnapshotService";
import { getUserCompany } from "./companiesController";
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
    successMessage.data = apply;
    return res.status(status.success).send(successMessage);
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
    errorMessage.error = "Something went wrong. Please try again later.";
    return res.status(status.error).send(errorMessage);
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
    errorMessage.error = "applicationId is required.";
    return res.status(status.bad).send(errorMessage);
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

    successMessage.data = {
      applicationId,
      hasSnapshot: !!snap,
      snapshotCreatedAt: snap ? snap.created_at : null,
      completenessScore: comp ? comp.completeness_score : null,
      completenessLevel: comp ? comp.completeness_level : null,
      completedSections: comp ? comp.completed_sections : null,
      missingRequired: comp ? comp.missing_required : null,
      missingRecommended: comp ? comp.missing_recommended : null,
      disclaimerNote: "This score reflects how much information was included when you applied — it is not a quality rating and has no effect on hiring decisions.",
      privacyNote: "Personal attributes such as gender, age, religion, and disability status are never part of this score.",
    };
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error("[getApplicantApplicationSnapshot]", error);
    errorMessage.error = "Unable to retrieve your application snapshot. Please try again later.";
    return res.status(status.error).send(errorMessage);
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
    errorMessage.error = "applicationId is required.";
    return res.status(status.bad).send(errorMessage);
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

    const callerCompany = await getUserCompany(uid);
    // Array.isArray guard: getUserCompany returns [] when no company exists
    // (not null/undefined), so !callerCompany alone won't catch that case.
    if (!callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobRows[0].company_id) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    const summary = await getApplicationSnapshotSummaryForEmployer(applicationId);
    successMessage.data = summary;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error("[getEmployerApplicantSnapshotSummary]", error);
    errorMessage.error = "Unable to retrieve application summary. Please try again later.";
    return res.status(status.error).send(errorMessage);
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
    errorMessage.error = "applicationIds is required.";
    return res.status(status.bad).send(errorMessage);
  }

  const applicationIds = String(raw).split(",").map(s => s.trim()).filter(Boolean);
  if (applicationIds.length === 0 || applicationIds.length > 50) {
    errorMessage.error = "applicationIds must be a non-empty comma-separated list of up to 50 IDs.";
    return res.status(status.bad).send(errorMessage);
  }

  try {
    // Single ownership check — verify caller owns all supplied IDs.
    // IDs that don't exist are silently excluded from results (not a 403 —
    // the caller owns the list, they may have IDs from before snapshots existed).
    const { rows: appRows } = await dbQuery.query(
      `SELECT job_application_id, candidate_id FROM ${dbSchema}.job_applicants WHERE job_application_id = ANY($1)`,
      [applicationIds]
    );

    const verifiedIds = appRows
      .filter(row => row.candidate_id === uid)
      .map(row => row.job_application_id);

    if (verifiedIds.length === 0) {
      successMessage.data = { snapshots: {} };
      return res.status(status.success).send(successMessage);
    }

    // Two batch queries — N*3 individual queries reduced to 3 regardless of list size.
    const [snapshotRows, completenessRows] = await Promise.all([
      dbQuery.query(
        `SELECT application_id FROM ${dbSchema}.application_snapshots WHERE application_id = ANY($1) AND source = 'application_submit'`,
        [verifiedIds]
      ),
      dbQuery.query(
        `SELECT application_id, completeness_score, completeness_level, missing_required, missing_recommended FROM ${dbSchema}.application_completeness_snapshots WHERE application_id = ANY($1) AND source = 'application_submit'`,
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

    successMessage.data = { snapshots };
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error("[getApplicantApplicationSnapshotsBatch]", error);
    errorMessage.error = "Unable to retrieve your application snapshots. Please try again later.";
    return res.status(status.error).send(errorMessage);
  }
};

export { submitApplication, getApplicantApplicationSnapshot, getEmployerApplicantSnapshotSummary, getApplicantApplicationSnapshotsBatch };

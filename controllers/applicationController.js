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
    errorMessage.error = "ERROR: " + error;
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
      disclaimerNote: "Application completeness measures submitted information, not candidate quality. It is not a hiring score.",
      privacyNote: `Protected attributes are never scored. Excluded fields: ${EXCLUDED_FIELDS.slice(0, 6).join(", ")}...`,
    };
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
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
    if (!appRows || appRows.length === 0) {
      return res.status(status.notfound).send({ status: "error", error: "Application not found." });
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
    if (!callerCompany || callerCompany.companyId !== jobRows[0].company_id) {
      return res.status(403).send({ status: "error", error: "Forbidden." });
    }

    const summary = await getApplicationSnapshotSummaryForEmployer(applicationId);
    successMessage.data = summary;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { submitApplication, getApplicantApplicationSnapshot, getEmployerApplicantSnapshotSummary };

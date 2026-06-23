import { appplicantProfile } from "../applicant.service";
import { jobApplicants, getJobCompanyId, jobDetails } from "../job.service";
import { getUserCompany } from "../../controllers/companiesController";

/**
 * Applicant Data Foundation v2 -- MATCH Readiness Bridge.
 *
 * This is the one piece of genuinely new code this command produces. It
 * does not introduce a new data model or duplicate any query -- it composes
 * three already-working, already-correct functions
 * (applicant.service.appplicantProfile, job.service.jobApplicants,
 * job.service.getJobCompanyId) behind a stable interface MATCH v5 can call
 * without knowing about applicants_profile/job_applicants directly.
 *
 * Before this file existed, MATCH v1/v3/v5 had no backend data source at
 * all and stayed frontend-only by necessity (see GETHIRED_MATCH_V5_REPORT.md).
 * The schema those services query existed in the project's own legacy DDL
 * but was never migrated to the live "gethired" schema until this command's
 * migration (db/applicant_application_ddl.sql) restored it.
 *
 * Excludes by construction (never reads these fields at all):
 * protected attributes, raw CV text (no extraction pipeline writes CV text
 * to any column these queries touch), video content traits (only
 * `videoCVUrl`, a submitted-or-not URL, is ever read -- never analyzed).
 */

const getApplicantMatchProfile = async (firebaseUid) => {
  const profile = await appplicantProfile(firebaseUid);
  if (!profile) {
    return null;
  }
  // appplicantProfile already composes skills/workExperience/
  // educationalBackground/certifications/documents -- nothing to add here,
  // this function exists so MATCH calls a name describing what it's for
  // rather than depending on applicant.service's internal naming.
  return profile;
};

/**
 * Employer-side: every applicant for a job, scoped to the caller's own
 * company. Throws "FORBIDDEN" if the caller's company doesn't own the job
 * -- same ownership check already proven in
 * jobsController.getAllApplicantOfJob (SECURE pass BOLA fix), reused here
 * rather than re-implemented, so this bridge can never be a second,
 * inconsistent place that gets the authorization check wrong.
 */
const getEmployerJobApplicantsForMatch = async (callerFirebaseUid, jobId) => {
  const jobCompanyId = await getJobCompanyId(jobId);
  const callerCompany = await getUserCompany(callerFirebaseUid);
  if (!jobCompanyId || !callerCompany || callerCompany.companyId !== jobCompanyId) {
    throw new Error("FORBIDDEN");
  }
  return await jobApplicants(jobId);
};

/**
 * Evidence bundle for one applicant-job pair, suitable for an explainable
 * match calculation. Deliberately a subset of the full applicant profile --
 * only fields with a defensible matching use, matching the same forbidden-
 * field list every MATCH command this session has enforced.
 */
const getApplicantEvidenceBundle = async (firebaseUid, jobId) => {
  const [profile, job] = await Promise.all([
    appplicantProfile(firebaseUid),
    jobDetails(jobId),
  ]);

  return {
    applicantProfile: profile
      ? {
          skills: profile.skills,
          workExperience: profile.workExperience,
          educationalBackground: profile.educationalBackground,
          certifications: profile.certifications,
          jobTitle: profile.jobTitle,
          jobTypeId: profile.jobTypeId,
          jobLevelId: profile.jobLevelId,
          workSetupId: profile.workSetupId,
          salaryMinimum: profile.salaryMinimum,
          salaryMaximum: profile.salaryMaximum,
          hasCv: !!profile.videoCVUrl || (profile.documents && profile.documents.length > 0),
        }
      : null,
    job: job || null,
    dataNotUsed: [
      "protected attributes", "photo", "exact address",
      "video content traits (face/voice/accent/emotion/personality)",
      "school prestige",
    ],
  };
};

export {
  getApplicantMatchProfile,
  getEmployerJobApplicantsForMatch,
  getApplicantEvidenceBundle,
};

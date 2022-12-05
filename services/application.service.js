import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const jobApply = async (jobApplication) => {
  const { jobId, candidateId, applicationStatusId } = jobApplication;
  const jobApplicantId = idGenerator(6, "APPL");

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.job_applicants
          (job_applicant_id, job_id, date_applied, candidate_id, application_status_id)
          VALUES($1, $2, $3, $4, $5) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      jobApplicantId,
      jobId,
      now,
      candidateId,
      applicationStatusId
    ]);

    if (!rows || rows.length === 0) {
      return "Failed to submit application";
    }

    const dbResponse = rows[0];

    return {
      jobApplicantId: dbResponse.job_applicant_id,
      jobId: dbResponse.job_id,
      dateApplied: dbResponse.date_applied,
      candidateId: dbResponse.candidate_id,
      applicationStatusId: dbResponse.application_status_id,
    };
  } catch (error) {
    throw error;
  }
};

export { jobApply }
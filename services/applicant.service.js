import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const candidateListByJobId = async (jobId) => {
  const searchQuery = `SELECT job_applicant_id, job_id, date_applied, updated_at, candidate_id, application_status_id, is_archived,
  u.firstname, u.lastname,
    FROM ${dbSchema}.job_applicants j 
    LEFT JOIN user u
    on u.uid = j.candidate_id
    WHERE job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    throw error;
  }
}

const mappedCandidate = (raw) => {
    return {
        jobId: raw.jobId,
        fullName: raw.firstname + ' ' + raw.lastname,
        dateApplied: raw.date_applied,

    }
}

export {
    candidateListByJobId
};



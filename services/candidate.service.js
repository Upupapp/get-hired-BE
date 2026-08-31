import dbQuery from "../db/dbQuery";
import { send } from "../helpers/mailer";
import env from "../env";
import { jobDetails } from "./job.service";

const dbSchema = env.schema;

const addCandidates = async (candidate) => {
  let message = "";
  const {
    companyId,
    userId,
    firstName,
    lastName,
    email,
    mobileNumber,
    address,
    jobId,
  } = candidate;
  try {
    const ifExistCandidate = await checkEmailIfExistInCandidate(email, companyId);
    //const ifRegistered = await checkEmailIfExistInContactAndRegistered(email, userId)
    if (ifExistCandidate) {
      // NOTIFY-P2: pure duplicate — no new candidate added.
      message = "Candidate already exists";
      return { message, status: 'DUPLICATE_CANDIDATE' };
    }
    const insertQuery = `INSERT INTO ${dbSchema}.candidates
                          (user_id, first_name, last_name, email, mobile_number, address,
                               created_at, job_id, company_id, status)
                            VALUES($1, $2, $3, $4, $5, $6, current_timestamp, $7, $8, 'imported') returning *;`;
    const { rows } = await dbQuery.query(insertQuery, [
      userId,
      firstName,
      lastName,
      email,
      mobileNumber,
      address,
      jobId,
      companyId,
    ]);

    if (!rows || rows.length == 0) {
      throw Error("Failed to Add Candidate");
    }
    const dbResponse = rows[0];

    const jobName = await getJobName(jobId);
    const sendEmail = await sendEmailInvite(email, firstName, jobName);
    message = "Successfully add candidate";
    return { ...dbResponse, message, status: 'ADDED' };
  } catch (error) {
    throw Error(error);
  }
};

const checkEmailIfExistInCandidate = async (email, companyId) => {
  try {
    const searchQuery = `SELECT email
            FROM ${dbSchema}.candidates
            WHERE candidates.email = $1 AND company_id = $2;`;
    const { rows } = await dbQuery.query(searchQuery, [email, companyId]);
    if (!rows || rows.length === 0) {
      return false;
    }
    return true;
  } catch {
    throw Error("Operation Failed");
  }
};

const checkCandidateIfExist = async (candidateId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id=$1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [candidateId]);
    if (!rows || rows.length === 0) {
      return false;
    }
    return true;
  } catch {
    throw Error("Operation Failed");
  }
};

const editCandidate = async (candidate) => {
  const {
    firstName,
    lastName,
    email,
    mobileNumber,
    address,
    jobId,
    candidateId,
    companyId,
  } = candidate;
  try {
    // QA10 FIX-6: company_id=$8 folds ownership into WHERE — zero rows =
    // candidate not found OR company mismatch; both treated as failure.
    const updateQuery = `UPDATE ${dbSchema}.candidates
                            SET  first_name=$1, last_name=$2, email=$3, mobile_number=$4, address=$5, job_id=$6
                            WHERE candidate_id=$7 AND company_id=$8 returning *;`;
    const { rows } = await dbQuery.query(updateQuery, [
      firstName,
      lastName,
      email,
      mobileNumber,
      address,
      jobId,
      candidateId,
      companyId,
    ]);
    const dbResponse = rows[0];
    if (!dbResponse) {
      throw Error("Failed to Update Candidate");
    }
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const candidateList = async (companyId) => {
  try {
    // BUGFIX: neither query selected a photo_url, so the "View Candidate
    // Detail" overlay panel always fell back to the default avatar. This
    // manually-added-candidate row (jobhunt.candidates) has no photo column
    // at all -- select NULL explicitly so both queries return the same
    // shape (getUniqueListBy below merges their rows).
    const searchQuery = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.email, c.mobile_number, c.address,
                                c.created_at, c.job_id, j.job_title, c.status, c.candidate_id, NULL as photo_url
                            FROM ${dbSchema}.candidates c
                            right join ${dbSchema}.jobs j on j.job_id = c.job_id
                            where c.company_id = $1
                            order by created_at DESC;`;

    // BUGFIX: u.email caused every /candidates/list request to 500
    // ("column u.email does not exist") -- email was moved off
    // gethired.users onto gethired.user_credentials in a later migration
    // (see db/user_ddl.sql: "ALTER TABLE gethired.users DROP COLUMN
    // email"), and this query was never updated for it. Joins
    // user_credentials the same way applicant.service.js already does
    // elsewhere for this exact case.
    const searchQuery2 = `SELECT concat(u.firstname, ' ', u.lastname) as full_name, uc.email, u.cell_number as mobile_number, u.address,
                            j.date_applied as created_at,  jo.job_id , jo.job_title, s.job_applicant_status_name as status , u.uid as candidate_id, ap.photo_url
                           FROM ${dbSchema}.job_applicants j
                           left join ${dbSchema}.jobs jo on jo.job_id = j.job_id
                           left join ${dbSchema}.applicants_profile ap on ap.user_id = j.candidate_id
                           left join ${dbSchema}.users u on u.uid = ap.user_id
                           left join ${dbSchema}.user_credentials uc on uc.uid = u.uid
                           left join ${dbSchema}.job_applicant_status s on j.application_status_id = s.job_applicant_status_id
                           where jo.company_id = $1`;

    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const applicants = await dbQuery.query(searchQuery2, [companyId]);
    const dbResponse = rows;

    if (!dbResponse) {
      throw Error(error);
    }
    applicants.rows.forEach((row) => dbResponse.push(row));
    function getUniqueListBy(arr, key) {
      return [...new Map(arr.map((item) => [item[key], item])).values()];
    }

    const arr1 = getUniqueListBy(dbResponse, "email");

    return arr1;
  } catch (error) {
    throw Error(error);
  }
};

const getJobName = async (jobId) => {
  const searchQuery = `SELECT job_title
    FROM ${dbSchema}.jobs where job_id = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    return rows[0].job_title;
  } catch (error) {
    throw Error(error);
  }
};

const sendEmailInvite = async (email, firstName, jobName) => {
  const userData = {
    name: firstName,
    job: jobName,
    app_url: `${env.app_url}/signup`,
  };
  send(email, "invite", userData);
  return { msg: "Email has been sent", link: `${env.app_url}/signup` };
};

const listOfAppliedJobsById = async (candidateId) => {
  let listOfJobs = [];

  const searchQuery = `SELECT a.*, s.job_applicant_status_name FROM ${dbSchema}.job_applicants a 
  right join ${dbSchema}.job_applicant_status s 
  on a.application_status_id = s.job_applicant_status_id
  where a.candidate_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [candidateId]);

    if (rows && rows.length > 0) {
      const listOfJobs = await Promise.all(
        rows.map(async (row) => {
          const job = await jobDetails(row.job_id);
          const hasEmployerMessage = await employerHasMessaged(row.job_id, candidateId);
          return {
            ...job,
            ...mappedApplication(row),
            hasEmployerMessage,
          };
        })
      );

      return listOfJobs;
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

// "My Applications" list (applicant self-view): whether the employer has
// ever sent a message for this job's thread with this applicant -- drives
// the Pending/Reviewed status shown instead of the applicant's own
// "Hello" test message (or no message at all) counting as contact.
const employerHasMessaged = async (jobId, candidateId) => {
  const query = `SELECT EXISTS (
    SELECT 1 FROM ${dbSchema}.messages m
    JOIN ${dbSchema}.message_threads t ON t.id = m.thread_id
    WHERE t.job_id = $1 AND t.applicant_uid = $2 AND m.sender_uid <> $2
  ) AS has_message;`;

  try {
    const { rows } = await dbQuery.query(query, [jobId, candidateId]);
    return !!(rows && rows[0] && rows[0].has_message);
  } catch (error) {
    // Non-fatal: the applications list should never fail to load just
    // because the message-status lookup errored -- default to "no
    // employer message yet" (Pending), same as a genuine no-message case.
    console.error('[candidate.service] employerHasMessaged error:', error);
    return false;
  }
};

const mappedApplication = (raw) => {
  return {
    jobApplicationId: raw.job_application_id,
    jobId: raw.job_id,
    dateApplied: raw.date_applied,
    updatedAt: raw.updated_at,
    candidateId: raw.candidate_id,
    applicationStatusId: raw.application_status_id,
    isArchived: raw.is_archived,
    // Bug fix: the underlying query selects `job_applicant_status_name`
    // (no alias) -- this previously read `application_status_name`, a key
    // that never existed on the row, so applicantStatusName was always
    // undefined. Found while building the first real consumer of this
    // function (the applicant's own "My Applications" list).
    applicantStatusName: raw.job_applicant_status_name,
  };
};

export {
  addCandidates,
  checkCandidateIfExist,
  editCandidate,
  candidateList,
  listOfAppliedJobsById,
};

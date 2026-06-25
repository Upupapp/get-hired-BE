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
    const ifExistCandidate = await checkEmailIfExistInCandidate(email);
    //const ifRegistered = await checkEmailIfExistInContactAndRegistered(email, userId)
    if (ifExistCandidate) {
      message = "Candidate Already Exist";
      return { message };
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
    return { ...dbResponse, message };
  } catch (error) {
    throw Error(error);
  }
};

const checkEmailIfExistInCandidate = async (email) => {
  // TODO (Filter by agency)
  try {
    const searchQuery = `SELECT email
            FROM ${dbSchema}.candidates
            where candidates.email = $1;`;
    const { rows } = await dbQuery.query(searchQuery, [email]);
    if (!rows || rows.length === 0) {
      return false;
    }
    return true;
  } catch {
    throw Error("Operation Failed");
  }
};

const checkCandidateIfExist = async (candidateId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.candidates WHERE candidate_id='${candidateId}';`;
  try {
    const { rows } = await dbQuery.query(searchQuery, []);
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
    const searchQuery = `SELECT concat(c.first_name, ' ', c.last_name) as full_name, c.email, c.mobile_number, c.address, 
                                c.created_at, c.job_id, j.job_title, c.status, c.candidate_id
                            FROM ${dbSchema}.candidates c
                            right join ${dbSchema}.jobs j on j.job_id = c.job_id
                            where c.company_id = '${companyId}'
                            order by created_at DESC;`;

    const searchQuery2 = `SELECT concat(u.firstname, ' ', u.lastname) as full_name, u.email, u.cell_number as mobile_number, u.address, 
                            j.date_applied as created_at,  jo.job_id , jo.job_title, s.job_applicant_status_name as status , u.uid as candidate_id
                           FROM ${dbSchema}.job_applicants j
                           left join ${dbSchema}.jobs jo on jo.job_id = j.job_id
                           left join ${dbSchema}.applicants_profile ap on ap.user_id = j.candidate_id
                           left join ${dbSchema}.users u on u.uid = ap.user_id
                           left join ${dbSchema}.job_applicant_status s on j.application_status_id = s.job_applicant_status_id
                           where jo.company_id = '${companyId}'`;

    const { rows } = await dbQuery.query(searchQuery, []);
    const applicants = await dbQuery.query(searchQuery2, []);
    const dbResponse = rows;

    if (!dbResponse) {
      throw Error(error);
    }
    applicants.rows.forEach((row) => dbResponse.push(row));
    console.log(dbResponse);
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
          return {
            ...job,
            ...mappedApplication(row),
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

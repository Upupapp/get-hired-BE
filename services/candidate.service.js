import dbQuery from "../db/dbQuery";
import { send } from "../helpers/mailer";
import env from "../env";
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
                            VALUES($1, $2, $3, $4, $5, $6, current_timestamp, $7, $8, 'invited') returning *;`;
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
    if (!dbResponse) {
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
  } = candidate;
  try {
    const updateQuery = `UPDATE ${dbSchema}.candidates
                            SET  first_name=$1, last_name=$2, email=$3, mobile_number=$4, address=$5, job_id=$6
                            WHERE candidate_id=$7 returning *;`;
    const { rows } = await dbQuery.query(updateQuery, [
      firstName,
      lastName,
      email,
      mobileNumber,
      address,
      jobId,
      candidateId,
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
                            FROM gethired.candidates c
                            right join gethired.jobs j on j.job_id = c.job_id
                            where c.company_id = '${companyId}'
                            order by created_at DESC;`;

    const { rows } = await dbQuery.query(searchQuery, []);

    const dbResponse = rows;

    if (!dbResponse) {
      throw Error(error);
    }

    return dbResponse;
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

export { addCandidates, checkCandidateIfExist, editCandidate, candidateList };

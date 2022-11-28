import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import idGenerator from "../helpers/randomNumberForId";
import env from "../env";
import {
  appplicantProfile,
  createApplicationProfile,
  updateApplicationProfile,
} from "../services/applicant.service";
import { getUserProfileById } from "../helpers/userDetails";

const dbSchema = env.schema;

const createApplication = async (req, res) => {
  const { jobId, candidateId, status } = req.body;

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.application
      (job_id, candidate_id, applicationdate, status)
      values ($1, $2, now(), $3) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      jobId,
      candidateId,
      status,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Create Application";
      return res.status(status.error).send(errorMessage);
    }

    const applicationList = await getApplicationListCandidate(candidateId);

    successMessage.data = applicationList;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const deleteApplication = async (req, res) => {
  const { applicationId } = req.body;
  const deleteQuery = `DELETE FROM ${dbSchema}.application
      WHERE application_id='${applicationId}'`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, []);
    const applications = await getApplicationListCandidate(candidateId);
    successMessage.data = applications;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateApplication = async (req, res) => {
  const { jobId, candidateId, status, applicationId } = req.body;

  try {
    const updateQuery = `UPDATE ${dbSchema}.application
            SET jobId=$1, candidateId=$2, applicationdate=now(), status=$3
            WHERE application_id =$4 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      jobId,
      candidateId,
      status,
      applicationId,
    ]);

    const dbResponse = await getApplicationWithJobDetails(applicationId);

    if (!dbResponse) {
      errorMessage.error = "Failed to Update Appplication";
      return res.status(status.error).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getApplicationListCandidate = async (candidateId) => {
  const selectQuery = `
      SELECT 
        a.application_id, j.job_id, j.jobtitle, a.applicationdate, a.status
      FROM ${dbSchema}.jobs j
      inner join ${dbSchema}.application a
      on j.job_id = a.job_id 
      inner join ${dbSchema}.candidate c 
      on c.candidate_id = a.candidate_id where c.candidate_id = $1`;

  try {
    const { rows } = await dbQuery.query(selectQuery, [candidateId]);
    const dbResponse = rows.map((row) => mapApplications(row));

    return dbResponse;
  } catch (error) {
    throw Error("Failed to retrieve Companies");
  }
};

const getApplicationWithJobDetails = async (applicationId) => {
  const searchQuery = `
      select * from ${dbSchema}.jobs j 
      inner join ${dbSchema}.application a
      on j.job_id = a.job_id
      inner join ${dbSchema}.candidate c
      on a.candidate_id = c a.candidate_id
      where a.application_id = '${applicationId}'
    `;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = mapApplications(rows[0]);
    return dbResponse;
  } catch (error) {
    throw Error("Error getting Job Details");
  }
};
const mapApplications = (application) => {
  return {
    applicationId: application.application_id,
    jobId: application.job_id,
    jobTitle: application.jobtitle,
    applicationDate: application.applicationdate,
    applicationStatus: application.status,
  };
};

const createProfile = async (req, res) => {
  try {
    const profile = await createApplicationProfile(req.body);
    successMessage.data = profile;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateProfile = async (req, res) => {
  try {
    const profile = await updateApplicationProfile(req.body);
    successMessage.data = profile;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};
const getApplicantProfileById = async (req, res) => {
  const { id } = req.query;

  try {
    const profile = await appplicantProfile(id);
    successMessage.data = profile;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getUserProfile = async (req, res) => {
  const { id } = req.query;

  try {
    const creds = await getUserProfileById(id);

    successMessage.data = creds;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export {
  createApplication,
  deleteApplication,
  updateApplication,
  createProfile,
  getApplicantProfileById,
  updateProfile,
  getUserProfile
};

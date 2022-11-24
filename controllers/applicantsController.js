import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import idGenerator from "../helpers/randomNumberForId";
import env from "../env";
import { appplicantProfile } from "../services/applicant.service";

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

const createApplicationProfile = async (req, res) => {
  const {
    applicantId,
    photoUrl,
    jobTitle,
    shortBio,
    servicesProvided,
    jobTypeId,
    jobLevelId,
    jobSetUpId,
    salaryMinimum,
    salaryMaximum,
  } = req.body;
  const applicantProfileId = idGenerator(6, "AP");
  try {
    const insertQuery = `INSERT INTO ${dbSchema}.applicants_profile
      (applicant_profile_id, applicant_id, photo_url, job_title, short_bio, services_provided, job_type_id, job_level_id, job_setup_id, salary_minimum, salary_maximum)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      applicantProfileId,
      applicantId,
      photoUrl,
      jobTitle,
      shortBio,
      servicesProvided,
      jobTypeId,
      jobLevelId,
      jobSetUpId,
      salaryMinimum,
      salaryMaximum,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Create Applicant Profile";
      return res.status(status.error).send(errorMessage);
    }

    const applicantProfile = {
      applicantProfileId: dbResponse.applicant_profile_id,
      applicantId: dbResponse.applicant_id,
      photoUrl: dbResponse.photo_url,
      jobTitle: dbResponse.job_title,
      shortBio: dbResponse.short_bio,
      servicesProvided: dbResponse.services_provided,
      jobTypeId: dbResponse.job_type_id,
      jobLevelId: dbResponse.job_level_id,
      jobSetUpId: dbResponse.job_setup_id,
      salaryMinimum: dbResponse.salary_minimum,
      salaryMaximum: dbResponse.salary_maximum,
    };

    successMessage.data = applicantProfile;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
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

export {
  createApplication,
  deleteApplication,
  updateApplication,
  createApplicationProfile,
  getApplicantProfileById
};

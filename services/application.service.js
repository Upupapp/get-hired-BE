import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";
import uploadInStorage from "../helpers/uploader";

const dbSchema = env.schema;
const now = new Date();

const jobApply = async (jobApplication) => {
  const {
    jobId,
    candidateId,
    applicantId,
    applicationStatusId,
    coverLetter,
    resume,
    governmentFiles,
  } = jobApplication;

  const jobApplicantionId = idGenerator(6, "APPL");

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.job_applicants
          (job_application_id, job_id, date_applied, candidate_id, application_status_id)
          VALUES($1, $2, $3, $4, $5) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      jobApplicantionId,
      jobId,
      now,
      candidateId,
      applicationStatusId,
    ]);

    if (!rows || rows.length === 0) {
      return "Failed to submit application";
    }

    if (coverLetter.length > 0) {
      const output = await Promise.all(
        coverLetter.map(async (document, index) => {
          return await uploadApplicationAttachment(
            document,
            applicantId,
            "applicant_covered_letter",
            "applicant_id",
            jobId
          );
        })
      );
    }

    if (resume.length > 0) {
      const output = await Promise.all(
        resume.map(async (document, index) => {
          return await uploadApplicationAttachment(
            document,
            applicantId,
            "applicant_resume",
            "applicant_id",
            jobId
          );
        })
      );
    }

    if (governmentFiles.length > 0) {
      const output = await Promise.all(
        governmentFiles.map(async (document, index) => {
          return await uploadApplicationAttachment(
            document,
            applicantId,
            "applicant_government_files",
            "applicant_id",
            jobId
          );
        })
      );
    }

    const dbResponse = rows[0];

    return {
      jobApplicantionId: dbResponse.job_application_id,
      jobId: dbResponse.job_id,
      dateApplied: dbResponse.date_applied,
      candidateId: dbResponse.candidate_id,
      applicationStatusId: dbResponse.application_status_id,
    };
  } catch (error) {
    throw error;
  }
};


const uploadApplicationAttachment = async (attachment, applicantId, tableName, column, jobId) => {
  let rawUrl = "";
  let generalQuery = "";
  let dbResponse = {};

  const { id, file, fileUrl, size, type, filename } = attachment;

  try {
    if (file && file != "") {
      rawUrl = await uploadInStorage("Applicant-Documents", filename, file);
    }

    generalQuery = `INSERT INTO ${dbSchema}.${tableName}
      (fileurl, filename, "size", "type", ${column}, job_id)
      VALUES($1, $2, $3, $4, $5, $6) returning *;`;

    const { rows } = await dbQuery.query(generalQuery, [
      rawUrl,
      filename,
      size,
      type,
      applicantId,
      jobId
    ]);

    if (rows && rows.length == 0) {
      throw "Failed to save Url in DB";
    }
    dbResponse = rows[0];

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

export { jobApply };

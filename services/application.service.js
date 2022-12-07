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
    interviewAnswers,
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

    if (interviewAnswers.length > 0) {
      const output = await Promise.all(
        interviewAnswers.map(async (item, index) => {
          const answer = {
            questionId: item.questionId,
            answerFile: item.answerFile,
            jobId,
            applicantId,
          };

          return await saveInterviewAnswer(answer);
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

const saveInterviewAnswer = async (answer) => {
  const { questionId, answerFile, jobId, applicantId } = answer;
  let rawUrl = "";

  const insertQuery = `INSERT INTO ${dbSchema}.interview_answers
  (question_id, answer_url, created_at, job_id, applicant_id)
  VALUES($1, $2, $3, $4, $5) returning *;`;

  const filename = `${jobId}-${questionId}-${applicantId}`;

  try {
    if (answerFile && answerFile != "") {
      rawUrl = await uploadInStorage(
        "Applicant-Interview-Answers",
        filename,
        answerFile,
        1
      );
    }

    const { rows } = await dbQuery.query(insertQuery, [
      questionId,
      rawUrl,
      now,
      jobId,
      applicantId,
    ]);

    if (!rows || rows.length == 0) {
      throw "Failed to save video";
    }

    const dbResponse = rows[0];
    return {
      questionId: dbResponse.question_id,
      answerUrl: dbResponse.answer_url,
      createdAt: dbResponse.created_at,
      jobId: dbResponse.job_id,
      applicantId: dbResponse.applicant_id,
    };
  } catch (error) {
    throw error;
  }
};

const uploadApplicationAttachment = async (
  attachment,
  applicantId,
  tableName,
  column,
  jobId
) => {
  let rawUrl = "";
  let generalQuery = "";
  let dbResponse = {};

  const { id, file, fileUrl, size, type, filename } = attachment;

  const name = `${filename}-${now}`;

  try {
    if (file && file != "") {
      rawUrl = await uploadInStorage("Applicant-Documents", name, file);
    }

    generalQuery = `INSERT INTO ${dbSchema}.${tableName}
      (fileurl, filename, "size", "type", ${column}, job_id)
      VALUES($1, $2, $3, $4, $5, $6) returning *;`;

    const { rows } = await dbQuery.query(generalQuery, [
      rawUrl,
      name,
      size,
      type,
      applicantId,
      jobId,
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

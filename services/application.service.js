import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";
import uploadInStorage from "../helpers/uploader";
import { send } from "../helpers/mailer";

import { getUserProfileById } from '../helpers/userDetails';

import {
  jobDetails
} from './job.service';

import { createApplicationSnapshots } from './applicationSnapshotService';

const dbSchema = env.schema;
const now = new Date();

// GH-FOUND-B01 -- "active" means not archived. Checked before every
// insert so the same applicant can't create a second row for the same
// job; also reused as the single source of truth for what "duplicate"
// means here, rather than re-deriving the definition at each call site.
const findActiveApplication = async (jobId, candidateId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.job_applicants
    WHERE job_id = $1 AND candidate_id = $2 AND (is_archived IS NULL OR is_archived = false)
    LIMIT 1;`;
  const { rows } = await dbQuery.query(searchQuery, [jobId, candidateId]);
  return rows && rows.length > 0 ? rows[0] : null;
};

const jobApply = async (jobApplication, userId) => {
  const {
    jobId,
    applicantId,
    applicationStatusId,
    coverLetter,
    resume,
    governmentFiles,
    interviewAnswers,
  } = jobApplication;

  // SECURE fix (BOLA), found alongside GH-FOUND-B01: this previously read
  // `candidateId` from the request body, trusting the frontend's claimed
  // identity for who the application belongs to. An authenticated
  // applicant could submit an application recorded under any other
  // candidate_id. Identity must come from the verified auth token.
  const candidateId = userId;

  const existing = await findActiveApplication(jobId, candidateId);
  if (existing) {
    const duplicateError = new Error("You already applied to this job.");
    duplicateError.code = "JOB_APPLICATION_ALREADY_EXISTS";
    duplicateError.existingApplication = existing;
    throw duplicateError;
  }

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
    const user = await getUserProfileById(userId);

    const job = await jobDetails(jobId);
    // Send email application
    const data = {
      job_name: job.jobTitle,
      company_name: job.companyName,
      app_url: `${env.app_url}/user/dashboard`,
    };
    send(user.email, "application", data);

    // Best-effort: build application/completeness/match snapshots.
    // Never throws — snapshot failure must never block submission.
    createApplicationSnapshots({
      applicationId: jobApplicantionId,
      applicantId: candidateId,
      jobId,
      companyId: job.companyId || null,
      coverLetter: coverLetter || [],
      resume: resume || [],
      governmentFiles: governmentFiles || [],
      interviewAnswers: interviewAnswers || [],
      source: "application_submit",
    }).catch((err) => {
      console.error("[applicationSnapshot] snapshot creation failed:", err);
    });

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

const charts = async (uid) => {
  const searchQuery = ` SELECT date_part('month', a.updated_at) as month, count(a.job_application_id) as applicant
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      where a.candidate_id = $1 and j.job_status_id = '2' and (a.application_status_id = '2' OR a.application_status_id = '3' OR a.application_status_id = '4'
                      OR a.application_status_id = '5' OR a.application_status_id = '6')
                      and date_part('month', CURRENT_DATE) = date_part('month', a.updated_at)
                      group by date_part('month', a.updated_at);`;
  const searchQuery3 = `SELECT date_part('month', a.updated_at) as month, count(a.job_application_id) as interviews
                    FROM ${dbSchema}.job_applicants a
                    left join ${dbSchema}.jobs j on j.job_id = a.job_id
                    where a.candidate_id = $1 and j.job_status_id = '2' and a.application_status_id = '3'
                    and date_part('month', CURRENT_DATE) = date_part('month', a.updated_at) 
                    group by date_part('month', a.updated_at);`;

  try {
    var today = new Date();
    var mm = today.getMonth() + 1;
    const activeApplication = await dbQuery.query(searchQuery, [uid]);
    const videoInterview = await dbQuery.query(searchQuery3, [uid]);

    const result = {
      activeApplications: activeApplication.rows[0]
        ? parseInt(activeApplication.rows[0].applicant)
        : 0,
        videoInterviews: videoInterview.rows[0]
        ? parseInt(videoInterview.rows[0].interviews)
        : 0,
    };

    return result
  } catch (error) {
    throw Error("Operation Failed" + error);
  }
};

const graph = async (uid) => {

  const searchQuery = `select DATE(a.updated_at), count(distinct a.job_application_id)
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      where a.candidate_id = $1 and j.job_status_id = '2' and (a.application_status_id = '2' OR a.application_status_id = '3' OR a.application_status_id = '4'
                      OR a.application_status_id = '5' OR a.application_status_id = '6')
                      group by DATE(a.updated_at)`;
  const selectQuery = `SELECT DATE(l.date_of_activity), count(l.activity_id)
                      FROM ${dbSchema}.logs l
                      left join ${dbSchema}.jobs j on j.job_id = l.activity_id 
                      where l.activity_id = $1 and l.activity_name = 'Profile View'
                      group by DATE(l.date_of_activity)`;

  try {
    const applicants = await dbQuery.query(searchQuery, [uid]);
    const jobView = await dbQuery.query(selectQuery, [uid]);

    const result = {
        jobApplication: applicants.rows ? applicants.rows : 0,
        profileView: jobView.rows ? jobView.rows : 0
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const statistic = async (uid) => {

  const searchQuery = `SELECT count(a.job_application_id) as applicant
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      where a.candidate_id = $1 and j.job_status_id = '2' and a.application_status_id = '2';`;
  const searchQuery2 = `SELECT count(a.job_application_id) as interviews
                     FROM ${dbSchema}.job_applicants a
                    left join ${dbSchema}.jobs j on j.job_id = a.job_id
                    where a.candidate_id = $1 and j.job_status_id = '2' and a.application_status_id = '3';`;

  try {
    const application = await dbQuery.query(searchQuery, [uid]);
    const interviews = await dbQuery.query(searchQuery2, [uid]);

    const interviewsPercentage = parseInt( interviews.rows[0]
      ? interviews.rows[0].interviews : 0)/parseInt(application.rows[0].applicant) * 100
    const applicationPercentage = 100 - interviewsPercentage 

    const result = {
      application: applicationPercentage ? applicationPercentage.toPrecision(3) : 0,
      interviews: interviewsPercentage ? interviewsPercentage.toPrecision(3) : 0,
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const totalJobs = async (uid) => {

  const searchQuery = `SELECT count(a.job_application_id) as applicant
                    FROM ${dbSchema}.job_applicants a
                    left join ${dbSchema}.jobs j on j.job_id = a.job_id
                    where a.candidate_id = $1 and j.job_status_id = '2' and a.application_status_id = '2';`;

  try {
    const jobApplications = await dbQuery.query(searchQuery, [uid]);

    const result = {
      totalJobApplication: jobApplications.rows[0] ? parseInt(jobApplications.rows[0].applicant) : 0,
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

export { jobApply, charts, graph, statistic, totalJobs };

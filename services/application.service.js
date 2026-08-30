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
import { validateDocumentFile } from './documentUploadValidationService';
import { canAccessJob } from './accessControl.service';
import { createNotification } from './notification.service';

const SHORTLISTED_STATUS_ID = 4;

const dbSchema = env.schema;

// LAUNCH-02: applicant-safe status labels — never expose internal enum IDs directly.
const APPLICANT_SAFE_STATUS_MAP = {
  1: 'Application received',
  2: 'Application received',
  3: 'Under review',
  4: 'Shortlisted',
  5: 'Not selected',
  6: 'Selected',
};

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

  // BOLA FIX (TAB 10): `applicantId` was previously taken from the request
  // body too (jobApplication.applicantId) and used as the FK for every
  // resume/cover-letter/government-ID/interview-answer row written by this
  // function -- an authenticated applicant could submit a guessed/arbitrary
  // applicantId and have their attachments filed under a different
  // applicant's profile. applicant_profile_id is a separately-generated ID
  // (not the same as uid), so it must be looked up server-side from the
  // verified uid rather than trusted from the client, exactly like
  // candidateId above.
  const { rows: profileRows } = await dbQuery.query(
    `SELECT applicant_profile_id FROM ${dbSchema}.applicants_profile WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (!profileRows || profileRows.length === 0) {
    const profileError = new Error("Please complete your profile before applying.");
    profileError.code = "APPLICANT_PROFILE_REQUIRED";
    throw profileError;
  }
  const applicantId = profileRows[0].applicant_profile_id;

  // P0 FIX (TAB 10): nothing previously checked whether the job was still
  // open before accepting an application -- an applicant could apply to an
  // expired or closed job through the UI (which renders normally for
  // expired jobs, see job-posts-details.component.ts's own comment on that)
  // or via a direct API call. jobStatusId === 2 is the app's existing
  // "active/published" convention (see TAB 05's robots-tag fix).
  const job = await jobDetails(jobId);
  if (!job || job.jobStatusId !== 2) {
    const closedError = new Error("This job is no longer accepting applications.");
    closedError.code = "JOB_NOT_ACCEPTING_APPLICATIONS";
    throw closedError;
  }
  if (job.expirationDate && new Date(job.expirationDate) < new Date()) {
    const expiredError = new Error("This job posting has expired.");
    expiredError.code = "JOB_NOT_ACCEPTING_APPLICATIONS";
    throw expiredError;
  }

  const existing = await findActiveApplication(jobId, candidateId);
  if (existing) {
    const duplicateError = new Error("You already applied to this job.");
    duplicateError.code = "JOB_APPLICATION_ALREADY_EXISTS";
    duplicateError.existingApplication = existing;
    throw duplicateError;
  }

  // Screening questions/video responses are optional at submission time --
  // the applicant may skip them from the FE and still submit for
  // evaluation. Previously this function rejected the submission if any
  // interviewQuestion lacked a matching interviewAnswers entry (P0 FIX
  // TAB 10); that enforcement was intentionally removed per product
  // decision so screening completeness no longer blocks submission.
  // interviewAnswers (whatever subset was actually recorded) still flows
  // through unchanged below for employer review.

  // SEC-08 FIX (TAB 08): uploadApplicationAttachment() had no MIME/size
  // validation at all -- the sibling /applicant/docs upload path was
  // already hardened (documentUploadValidationService.js), but a resume,
  // cover letter, or government ID submitted as part of a job application
  // went through this separate code path unchecked. Validate every
  // attached file before creating the application row, rejecting the
  // whole submission on the first bad file rather than partially applying it.
  const attachmentsToValidate = [
    ...(coverLetter || []),
    ...(resume || []),
    ...(governmentFiles || []),
  ];
  for (const document of attachmentsToValidate) {
    if (document && document.file) {
      const validation = validateDocumentFile(document.file);
      if (!validation.valid) {
        const validationError = new Error(validation.message);
        validationError.code = "APPLICATION_DOCUMENT_INVALID";
        throw validationError;
      }
    }
  }

  const jobApplicantionId = idGenerator(6, "APPL");

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.job_applicants
          (job_application_id, job_id, date_applied, candidate_id, application_status_id)
          VALUES($1, $2, $3, $4, $5) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      jobApplicantionId,
      jobId,
      new Date(),
      candidateId,
      applicationStatusId,
    ]);

    if (!rows || rows.length === 0) {
      return "Failed to submit application";
    }

    // P0 FIX (TAB 10): bare `.length` on these previously crashed
    // (unhandled rejection, no response sent) for any caller that omitted
    // one of these arrays -- normal FE traffic always sends them, but a
    // malformed/direct-API request didn't hit this guard until now.
    if ((coverLetter || []).length > 0) {
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

    if ((resume || []).length > 0) {
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

    if ((governmentFiles || []).length > 0) {
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

    if ((interviewAnswers || []).length > 0) {
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

    // job was already fetched above (job-status/expiration/screening-question
    // checks) -- reused here instead of querying it a second time.

    // LAUNCH-02: confirmation email — non-blocking, failure never blocks submission.
    const statusLabel = APPLICANT_SAFE_STATUS_MAP[applicationStatusId] || 'Application received';
    const emailData = {
      job_name: job.jobTitle,
      company_name: job.companyName,
      first_name: user.firstName || '',
      status_label: statusLabel,
      app_url: env.app_url + '/user/applications',
    };
    send(user.email, 'application', emailData).catch(function(err) {
      console.error('[application] APPLICATION_CONFIRMATION_EMAIL_FAILED (non-blocking):',
        err && err.message ? err.message.substring(0, 80) : 'unknown');
    });
    console.log('[application] APPLICATION_CONFIRMATION_EMAIL_QUEUED', { applicationId: jobApplicantionId, jobId: jobId });

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

    // LAUNCH-01: include jobTitle/companyName/statusLabel so FE inline
    // success panel can display them without a second fetch.
    return {
      jobApplicantionId: dbResponse.job_application_id,
      jobId: dbResponse.job_id,
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      dateApplied: dbResponse.date_applied,
      candidateId: dbResponse.candidate_id,
      applicationStatusId: dbResponse.application_status_id,
      statusLabel: statusLabel,
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
      new Date(),
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

  // BUGFIX: destructured `fileUrl` (camelCase), but every frontend caller
  // (profile-documents.component.ts's mappedOutToControl, and the CV-reuse
  // path that builds this object) actually sends `fileurl` (lowercase) --
  // fileUrl was always undefined here, so attaching a document that
  // referenced an EXISTING already-uploaded file (no new `file` blob to
  // upload) silently saved an empty fileurl to the database instead of the
  // real one. Reading the correct key and falling back to it when there's
  // no new file to upload.
  const { id, file, fileurl, size, type, filename } = attachment;

  const name = `${filename}-${Date.now()}`;

  try {
    if (file && file != "") {
      rawUrl = await uploadInStorage("Applicant-Documents", name, file);
    } else if (fileurl) {
      rawUrl = fileurl;
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

// LAUNCH-02: employer status-update with idempotency check and status-change email.
// Company ownership is pre-verified by the caller (applicationController).
const updateApplicationStatus = async (applicationId, newStatusId, callerCompanyId, accessCtx) => {
  const newStatusIdInt = parseInt(newStatusId);

  const selectQuery = `SELECT ja.job_application_id, ja.job_id, ja.candidate_id,
    ja.application_status_id as old_status_id, j.company_id
    FROM ${dbSchema}.job_applicants ja
    INNER JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
    WHERE ja.job_application_id = $1
    AND (ja.is_archived IS NULL OR ja.is_archived = false)
    LIMIT 1`;

  const { rows: appRows } = await dbQuery.query(selectQuery, [applicationId]);
  if (!appRows || appRows.length === 0) {
    const err = new Error('Application not found');
    err.code = 'APPLICATION_NOT_FOUND';
    throw err;
  }

  const app = appRows[0];

  if (app.company_id !== callerCompanyId) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }
  // SECURITY FIX (zero-scope/null-context remediation): was
  // `accessCtx && !canAccessJob(...)` -- when accessCtx is null (a
  // suspended company_employees row, or one whose team_role_id hasn't
  // been backfilled yet -- both real states buildAccessContext()
  // deliberately returns null for), the `accessCtx &&` guard short-
  // circuited and this check was skipped entirely instead of denying.
  // canAccessJob(null, jobId) already correctly returns false; the bug
  // was never calling it. No accessCtx should ever mean "unrestricted."
  if (!canAccessJob(accessCtx, app.job_id)) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const oldStatusId = parseInt(app.old_status_id);

  // LAUNCH-02: no-op suppression — do not update or email if status unchanged.
  if (oldStatusId === newStatusIdInt) {
    console.log('[applicationStatus] APPLICATION_STATUS_CHANGE_EMAIL_SUPPRESSED_NOOP',
      { applicationId: applicationId, statusId: oldStatusId });
    return { noop: true, applicationId: applicationId, jobId: app.job_id,
      candidateId: app.candidate_id, oldStatusId: oldStatusId, newStatusId: newStatusIdInt };
  }

  const updateQuery = `UPDATE ${dbSchema}.job_applicants
    SET application_status_id = $1, updated_at = NOW()
    WHERE job_application_id = $2
    AND (is_archived IS NULL OR is_archived = false)
    RETURNING *`;

  const { rows: updRows } = await dbQuery.query(updateQuery, [newStatusIdInt, applicationId]);
  if (!updRows || updRows.length === 0) {
    throw new Error('Status update failed');
  }

  const newStatusLabel = APPLICANT_SAFE_STATUS_MAP[newStatusIdInt] || 'Status updated';

  // LAUNCH-02: status-change email — non-blocking, post-commit.
  try {
    const job = await jobDetails(app.job_id);
    const applicant = await getUserProfileById(app.candidate_id);
    if (applicant && applicant.email) {
      const oldStatusLabel = APPLICANT_SAFE_STATUS_MAP[oldStatusId] || 'Application received';
      const emailData = {
        job_name: job.jobTitle,
        company_name: job.companyName,
        first_name: applicant.firstName || '',
        status_label: newStatusLabel,
        old_status_label: oldStatusLabel,
        is_selected: newStatusIdInt === 6,
        is_rejected: newStatusIdInt === 5,
        app_url: env.app_url + '/user/applications',
      };
      send(applicant.email, 'application_status_changed', emailData).catch(function(err) {
        console.error('[applicationStatus] APPLICATION_STATUS_CHANGE_EMAIL_FAILED (non-blocking):',
          err && err.message ? err.message.substring(0, 80) : 'unknown');
      });
      console.log('[applicationStatus] APPLICATION_STATUS_CHANGE_EMAIL_QUEUED',
        { applicationId: applicationId, oldStatusId: oldStatusId, newStatusId: newStatusIdInt, newStatusLabel: newStatusLabel });
    } else {
      console.warn('[applicationStatus] APPLICATION_STATUS_CHANGE_EMAIL_SUPPRESSED_NO_EMAIL',
        { applicationId: applicationId });
    }
  } catch (emailErr) {
    console.warn('[applicationStatus] status-change email setup error (non-blocking):',
      emailErr && emailErr.message ? emailErr.message.substring(0, 80) : 'unknown');
  }

  // In-app "shortlisted" notification -- non-blocking, mirrors the email
  // side effect above. Only fires on the transition INTO Shortlisted
  // (id 4), not every status change, per the ask ("when im shortlisted...
  // i get notified"). eventKey makes this idempotent per (applicationId,
  // old->new) pair, same precedent as the email audit log's event_key.
  if (newStatusIdInt === SHORTLISTED_STATUS_ID) {
    (async () => {
      try {
        const job = await jobDetails(app.job_id);
        createNotification({
          recipientUid: app.candidate_id,
          type: 'application_shortlisted',
          title: "You've been shortlisted!",
          body: `${job.companyName || 'An employer'} shortlisted you for ${job.jobTitle || 'a job'}.`,
          linkRoute: '/user/applications/' + applicationId,
          relatedApplicationId: applicationId,
          relatedJobId: app.job_id,
          eventKey: `application:${applicationId}:notif:status_change:${oldStatusId}->${newStatusIdInt}`,
        }).catch((err) => {
          console.error('[applicationStatus] SHORTLIST_NOTIFICATION_FAILED (non-blocking):',
            err && err.message ? err.message.substring(0, 80) : 'unknown');
        });
      } catch (err) {
        console.error('[applicationStatus] SHORTLIST_NOTIFICATION_SETUP_FAILED (non-blocking):',
          err && err.message ? err.message.substring(0, 80) : 'unknown');
      }
    })();
  }

  return {
    noop: false,
    applicationId: applicationId,
    jobId: app.job_id,
    candidateId: app.candidate_id,
    companyId: app.company_id,
    oldStatusId: oldStatusId,
    newStatusId: newStatusIdInt,
    newStatusLabel: newStatusLabel,
  };
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

export { jobApply, updateApplicationStatus, APPLICANT_SAFE_STATUS_MAP, charts, graph, statistic, totalJobs };

import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import uploadInStorage from "../helpers/uploader";
import {
  createInterviewTemplateQuestions,
  createQuestion,
  updateQuestionById,
  changeQuestionSequence,
} from "../services/interview.service";
import { getJobApplicantsWithFitSignals } from "../services/match/employerApplicantSignalsService";
import {
  getPublishedJobs,
  jobDetails,
  saveJobArray,
  mappedJob,
  jobBasicDetails,
  jobApplicants,
  getJobCompanyId,
  applicationOfApplicant,
  interviewQuestionsUpdate,
  getJobInterviewQuestions,
} from "../services/job.service";

import { listOfJobAppliedByApplicant } from "../services/applicant.service";
import { getUserCompany } from "./companiesController";

import { createDynamicLink } from "../helpers/firebaseFunctions";
import { insertLogs } from "../services/user.service";

import { companySubscriptions } from "../controllers/subscriptionController";


const dbSchema = env.schema;
const now = Date.now();

const createJobs = async (req, res) => {
  let questions = [];

  const jobId = idGenerator(6, "JB");
  let rawUrl = "";
  const { uid } = req.user

  const {
    jobTitle,
    bannerFile,
    industryId,
    jobRoleId,
    jobTypeId,
    jobLevelId,
    jobCategoryId,
    jobDescription,
    jobDuties,
    workSetupId,
    salaryMinimum,
    salaryMaximum,
    salaryCurrency,
    rate,
    jobAddress,
    expirationDate,
    jobStatusId,
    jobCity,
    jobCountry,
    badges,
    requirements,
    goodToHave,
    educationalBackground,
    skills,
    tags,
    interviewQuestions,
    certificationRequirements,
  } = req.body;

  const insertQuery = `INSERT INTO ${dbSchema}.jobs
  (job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at, job_status_id, job_city, job_category_id, job_country, salary_currency)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, current_timestamp, $16, $17, $18, $19, $20) returning *;`;

  try {
    // QA8 FIX-2 BOLA: derive companyId from the authenticated caller's JWT,
    // never from req.body.companyId — any employer could otherwise post a job
    // attributed to a different company by supplying a spoofed companyId.
    const callerCompany = await getUserCompany(uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    if (bannerFile && bannerFile.length != 0) {
      rawUrl = await uploadInStorage(
        "Job-Banner",
        `${jobId}-Banner`,
        bannerFile[0].file
      );
    }

    const { rows } = await dbQuery.query(insertQuery, [
      jobId,
      rawUrl,
      jobTitle,
      companyId,
      industryId,
      jobRoleId,
      jobTypeId,
      jobLevelId,
      jobDescription,
      jobDuties,
      workSetupId,
      salaryMinimum,
      salaryMaximum,
      rate,
      jobAddress,
      jobStatusId,
      jobCity,
      jobCategoryId,
      jobCountry,
      salaryCurrency,
    ]);

    if (!rows || rows.length == 0) {
      errorMessage.error = "Failed to create Jobs";
      return res.status(status.error).send(errorMessage);
    }

    if (rows[0].job_id) {
      await saveJobArray(rows[0].job_id, {
        badges,
        requirements,
        goodToHave,
        educationalBackground,
        skills,
        tags,
        certificationRequirements,
      });

      if (interviewQuestions && interviewQuestions.length != 0) {
        const template = await createInterviewTemplateQuestions(
          jobId,
          "default",
          companyId,
          uid
        );
        const rawQuestions = Promise.all(
          await interviewQuestions.map(
            async (question) =>
              await createQuestion(question, template.jobInterviewTemplateId)
          )
        );

        rawQuestions.then((ques) => (questions = ques));
      }
    }

    const dbResponse = await mappedJob(rows[0]);
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[createJobs] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobApplicantDetails = async (req, res) => {
  const { jobId, id } = req.query;

  try {
    const applicants = await applicationOfApplicant(jobId, id);

    successMessage.data = applicants;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobBasicListOfCompany = async (req, res) => {
  const { id } = req.query;

  try {
    const list = await getBasicJobList(id, 0);
    successMessage.data = list;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getExpiredJobListOfCompany = async (req, res) => {
  const { id } = req.query;

  try {
    const list = await getBasicJobList(id, 10);
    successMessage.data = list;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const deleteJob = async (req, res) => {
  const { jobId, companyId } = req.body;
  try {
    // F-07 BOLA fix: verify the authenticated caller's company owns this job
    // before deleting. getUserCompany() is token-derived, not caller-supplied.
    // OPT-01: company_id check folded into DELETE WHERE clause — eliminates
    // a separate ownership SELECT round-trip (was 3 DB calls, now 2).
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to delete this job." });
    }

    // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
    // company_id=$2 constraint enforces ownership without a separate SELECT.
    const deleteQuery = `DELETE FROM ${dbSchema}.jobs
      WHERE job_id=$1 AND company_id=$2`;
    const { rows, rowCount } = await dbQuery.query(deleteQuery, [jobId, callerCompany.companyId]);
    if (rowCount === 0) {
      return res.status(403).json({ message: "You don't have permission to delete this job." });
    }
    const jobs = await getJobList(companyId);
    successMessage.data = jobs;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[deleteJob] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const updateJob = async (req, res) => {
  let rawUrl = "";

  // OPT-01: company_id=$20 constraint folds the ownership check into the
  // UPDATE itself — eliminates a separate ownership SELECT round-trip.
  // Zero rows returned means either the job doesn't exist or it belongs to
  // a different company; both cases return 403 (no information leak).
  const updateQuery = `UPDATE ${dbSchema}.jobs
    SET job_banner=$1, job_title=$2, industry_id=$3,
      job_role_id=$4, job_type_id=$5, job_level_id=$6,
      job_description=$7, job_duties=$8, work_setup_id=$9,
      salary_minimum=$10, salary_maximum=$11, rate=$12,
      job_address=$13, job_city=$14, job_category_id=$15,
      job_country= $16, job_status_id = $17, salary_currency=$18
      WHERE job_id=$19 AND company_id=$20 returning *;`;

  const {
    jobBanner,
    bannerFile,
    jobTitle,
    industryId,
    jobRoleId,
    jobTypeId,
    jobLevelId,
    jobDescription,
    jobDuties,
    workSetupId,
    salaryMinimum,
    salaryMaximum,
    salaryCurrency,
    rate,
    jobAddress,
    jobCity,
    jobCountry,
    jobCategoryId,
    jobStatusId,
    jobId,
    badges,
    requirements,
    goodToHave,
    educationalBackground,
    skills,
    tags,
    interviewQuestions,
    interviewTemplateId,
    certificationRequirements,
  } = req.body;

  try {
    // F-08 BOLA fix: verify the authenticated caller's company owns this job
    // before allowing any update. getUserCompany() derives company from the
    // verified Firebase token, never from caller-supplied data.
    // OPT-01: separate ownership SELECT removed — company_id=$20 in the
    // UPDATE WHERE clause enforces ownership in a single query.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to update this job." });
    }

    if (bannerFile && bannerFile != "") {
      rawUrl = await uploadInStorage(
        "Job-Banner",
        `${jobId}-Banner`,
        bannerFile[0].file
      );
    } else {
      rawUrl = jobBanner;
    }

    const { rows } = await dbQuery.query(updateQuery, [
      rawUrl,
      jobTitle,
      industryId,
      jobRoleId,
      jobTypeId,
      jobLevelId,
      jobDescription,
      jobDuties,
      workSetupId,
      salaryMinimum,
      salaryMaximum,
      rate,
      jobAddress,
      jobCity,
      jobCategoryId,
      jobCountry,
      jobStatusId,
      salaryCurrency,
      jobId,
      callerCompany.companyId,  // $20 — ownership enforced in WHERE
    ]);

    // Zero rows: either job not found or company_id mismatch — 403 either way
    if (!rows || rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to update this job." });
    }

    const jobArrays = await saveJobArray(jobId, {
      badges,
      requirements,
      goodToHave,
      educationalBackground,
      skills,
      tags,
      certificationRequirements,
    });

    if (interviewQuestions) {
      await interviewQuestionsUpdate(
        jobId,
        interviewQuestions,
        interviewTemplateId
      );
    }

    const dbResponse = await mappedJob(rows[0]);

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[updateJob] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const updateStatusOfJob = async (req, res) => {
  const jobId = req.body.jobId;
  const statusId = req.body.status;

  try {
    // QA7 FIX-1 BOLA: verify the authenticated caller's company owns this job
    // before changing its status. getUserCompany() is token-derived, not
    // caller-supplied — mirrors the pattern in updateJob and deleteJob.
    // OPT-01 (QA7): separate ownership SELECT eliminated — company_id=$3
    // constraint folds the ownership check into the UPDATE itself (same
    // pattern already applied to updateJob and deleteJob). 2 DB calls, not 3.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const updateJob = await updateJobStatus(statusId, jobId, callerCompany.companyId);

    successMessage.data = updateJob;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    if (error === "FORBIDDEN") {
      return res.status(403).json({ message: "You don't have permission to update this job." });
    }
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const updateJobStatus = async (statusId, jobId, companyId) => {
  // OPT-01 (QA7): company_id=$3 folds ownership check into UPDATE WHERE —
  // eliminates the prior separate SELECT ownership round-trip.
  // Zero rows = job not found OR company mismatch — both treated as FORBIDDEN.
  const updateQuery = `UPDATE ${dbSchema}.jobs SET job_status_id=$1 WHERE job_id=$2 AND company_id=$3 returning *`;
  try {
    const { rows } = await dbQuery.query(updateQuery, [statusId, jobId, companyId]);

    if (!rows || rows.length == 0) {
      throw "FORBIDDEN";
    }

    const dbResponse = await mappedJob(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const industryList = async () => {
  const searchQuery = `SELECT industry_id, industry_name FROM ${dbSchema}.industry;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.industry_id,
        name: list.industry_name,
      };
    });

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getIndustryList = async (req, res) => {
  try {
    const dbResponse = await industryList();

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getBadgeList = async (req, res) => {
  const searchQuery = `SELECT badge_id, badge_name, badge_icon FROM ${dbSchema}.badge;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.badge_id,
        name: list.badge_name,
        icon: list.badge_icon,
      };
    });

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobRoleList = async (req, res) => {
  const searchQuery = `SELECT job_role_id, job_role_name FROM ${dbSchema}.job_role;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_role_id,
        name: list.job_role_name,
      };
    });
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getCategoryList = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.category;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_category_id,
        name: list.job_category_name,
      };
    });
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getBasicJobList = async (companyId, statusId) => {
  let filteredStatus = "";

  switch (statusId) {
    case 0: // draft and published
      filteredStatus = `and j.job_status_id != 3 and j.job_status_id != 4`;
      break;
    case 10: // expired and archived
      filteredStatus = `and j.job_status_id != 1 and j.job_status_id != 2`;
      break;
    default:
      filteredStatus = `and j.job_status_id = ${statusId}`;
      break;
  }

  const searchQuery = `SELECT 
  j.job_id, j.job_title, j.created_at, j.company_id,
  j.job_city, j.work_setup_id, j.job_type_id, 
  j.salary_minimum, j.salary_maximum, j.salary_currency,
  j.job_status_id, ws.work_setup_name, jt.job_type_name, j.rate
  FROM ${dbSchema}.jobs j
  left join ${dbSchema}.work_setup ws 
  on ws.work_setup_id = j.work_setup_id
  left join ${dbSchema}.job_type jt 
  on jt.job_type_id = j.job_type_id
  where company_id = $1 ${filteredStatus} ORDER BY j.created_at DESC;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    if (!rows || rows.length > 0) {
      return rows.map((row) => mappedBasicJob(row));
    }
    return rows;
  } catch (error) {
    throw error;
  }
};

const getPublishedJobsWithinDateRange = async (companyId, startRange, newest) => {
  const endMili = new Date(newest);
  const startMili = new Date(startRange);

  try {
    const published = await getBasicJobList(companyId, 2);
    const filteredByDate = published.filter(
      (job) => new Date(job.createdAt) > startMili && new Date(job.createdAt) < endMili
    );
    return filteredByDate;
  } catch (error) {
    throw error;
  }
};

const getJobList = async (companyId) => {
  const selectQuery = `
    SELECT 
      j.job_id, j.jobtitle, j.jobcountry, j.jobcategory,
      j.maxsalary, j.hoursperweek, j.externallink, j.minsalary,
      j.jobcity, j.reqdetails, j.applicationemail, j.jobdescription, 
      j.minrate, j.jobtype, j.jobtags, j.createddate,
      cj.isfilled, cj.applications, cj.isdraft, cj."views",
      c.companyname, c.logourl, c.natureofbusiness  
    FROM ${dbSchema}.jobs j
    inner join ${dbSchema}.company_jobs cj 
    on j.job_id = cj.job_id 
    inner join ${dbSchema}.company c 
    on c.company_id = cj.company_id where cj.company_id = $1`;

  try {
    const { rows } = await dbQuery.query(selectQuery, [companyId]);
    const dbResponse = rows.map((row) => mapJobs(row));

    return dbResponse;
  } catch (error) {
    throw Error("Failed to retrieve Companies");
  }
};

const getAllPublishedJobs = async (req, res) => {
  const { id } = req.query;

  try {
    const published = await getPublishedJobs(id);
    successMessage.data = published;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobDetails = async (req, res) => {
  const { id, uid } = req.query;
  let isApplied = false;

  try {
    if (uid) {
      const applied = await listOfJobAppliedByApplicant(uid);
      const filtered = applied.filter((item) => item.jobId == id);
      isApplied = filtered.length != 0;
    }

    const details = await jobDetails(id);
    const click = await insertLogs("Job View", "", id);
    successMessage.data = {
      ...details,
      isApplied,
    };
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getJobShareableLink = async (req, res) => {
  const { id } = req.query;

  try {
    const job = await jobBasicDetails(id);
    const postLink = `/jobs/details/${id}`;
    const link = await createDynamicLink(
      job.jobTitle + " - " + job.jobCity + " " + job.jobCountry,
      job.companyName,
      job.jobBanner,
      postLink
    );
    successMessage.data = link;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getAllApplicantOfJob = async (req, res) => {
  const { id } = req.query;

  try {
    // SECURE fix (BOLA): this route previously had no auth middleware at
    // all and returned full applicant PII for any job to any caller.
    // Confirm the authenticated caller's company owns this job.
    const jobCompanyId = await getJobCompanyId(id);
    const callerCompany = await getUserCompany(req.user.uid);
    // QA8 FIX-9: return JSON 403 instead of bare string "Forbidden" for
    // consistent error response shape across all employer endpoints.
    if (!jobCompanyId || !callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobCompanyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const list = await jobApplicants(id);
    successMessage.data = list;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

// MATCH v5 -- Employer Applicant Fit Signals (Applicant Data Foundation v2
// re-run). Separate, additive endpoint -- does not change
// getAllApplicantOfJob's existing response shape for any current
// consumer. Reuses the same company-ownership check via the bridge
// service, so authorization can't drift between this endpoint and the
// existing one.
const getJobApplicantFitSignals = async (req, res) => {
  const { id } = req.query;

  try {
    const list = await getJobApplicantsWithFitSignals(req.user.uid, id);
    successMessage.data = list;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    if (error.message === "FORBIDDEN") {
      // QA9 FIX-10: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const deleteInterviewQuestion = async (req, res) => {
  const { questionId, jobId } = req.query;
  try {
    // QA9 FIX-6 BOLA: verify the question belongs to the caller's company
    // before deleting. Join through job_interview_template for company_id.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    // OPT-QA9-1: fold ownership check into the DELETE WHERE via subquery —
    // eliminates the separate SELECT round-trip (was 3 calls, now 2).
    // Zero rowCount = question not found OR company mismatch → 403.
    const { rowCount } = await dbQuery.query(
      `DELETE FROM ${dbSchema}.interview_template_question
       WHERE template_question_id=$1
         AND job_interview_template_id IN (
               SELECT job_interview_template_id
               FROM ${dbSchema}.job_interview_template
               WHERE company_id=$2
             )`,
      [questionId, callerCompany.companyId]
    );
    if (rowCount === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const rawQuestions = await getJobInterviewQuestions(jobId, "default");

    // QA10 FIX-13: was bare .map(async) without Promise.all — sequence
    // updates were fire-and-forget and errors were silently swallowed.
    const dbResponse = await Promise.all(rawQuestions.map(async (question, index) => {
      return await changeQuestionSequence(question.questionId, index + 1);
    }));
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getSubscriptionRestrictions = async (req, res) => {
  try {
    // QA10 FIX-11 BOLA: derive companyId from JWT, never from query param —
    // any authenticated employer could read another company's subscription
    // metadata by supplying a different companyId.
    const callerCompany = await getUserCompany(req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    const dbResponse = await companySubscriptions(companyId);

    if (dbResponse.length == 0) {
      throw "Company is not subscribed to any plan";
    }

    successMessage.data = dbResponse[0];
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[jobsController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const mappedBasicJob = (raw) => {
  return {
    jobId: raw.job_id,
    jobTitle: raw.job_title,
    companyId: raw.company_id,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    workSetupId: raw.work_setup_id,
    workSetupName: raw.work_setup_name,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    salaryCurrency: raw.salary_currency,
    createdAt: raw.created_at,
    jobStatusId: raw.job_status_id,
    jobCity: raw.job_city,
    jobCountry: raw.job_country,
    rate: raw.rate,
  };
};

export {
  createJobs,
  deleteJob,
  updateJob,
  updateJobStatus,
  getIndustryList,
  getBadgeList,
  getJobRoleList,
  getCategoryList,
  getBasicJobList,
  getJobBasicListOfCompany,
  getExpiredJobListOfCompany,
  updateStatusOfJob,
  industryList,
  getAllPublishedJobs,
  getJobDetails,
  getJobShareableLink,
  getAllApplicantOfJob,
  getJobApplicantFitSignals,
  getJobApplicantDetails,
  deleteInterviewQuestion,
  getPublishedJobsWithinDateRange,
  getSubscriptionRestrictions
};

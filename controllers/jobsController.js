import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import uploadInStorage, { uploadImageWithOptimization } from "../helpers/uploader";
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
import { getUserCompanyForRequest } from "./companiesController";

import { createDynamicLink } from "../helpers/firebaseFunctions";
import { insertLogs } from "../services/user.service";
// SEO: Google Indexing API — fire-and-forget notifications on job lifecycle
// events. The service is a no-op unless GOOGLE_INDEXING_API_ENABLED=true.
// Import is always safe; actual HTTP calls only happen when enabled.
import { notifyJobUrlUpdated, notifyJobUrlDeleted } from "../services/googleIndexing.service";

import { companySubscriptions } from "../controllers/subscriptionController";
import { getSavedJobStatus, toggleSavedJob } from "../services/savedJobsService";

const dbSchema = env.schema;

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
  (job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at, job_status_id, job_city, job_category_id, job_country, salary_currency, expiration_date)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, current_timestamp, $16, $17, $18, $19, $20, $21) returning *;`;

  try {
    // QA8 FIX-2 BOLA: derive companyId from the authenticated caller's JWT,
    // never from req.body.companyId — any employer could otherwise post a job
    // attributed to a different company by supplying a spoofed companyId.
    const callerCompany = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    if (bannerFile && bannerFile.length != 0) {
      rawUrl = await uploadImageWithOptimization(
        "Job-Banner",
        jobId + "-Banner",
        bannerFile[0].file,
        "job_banner",
        { ownerType: "job", ownerId: jobId, companyId: companyId, jobId: jobId, createdBy: uid }
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
      expirationDate || null,
    ]);

    if (!rows || rows.length == 0) {
      return res.status(status.error).json(errorResponse("Failed to create Jobs"));
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
        questions = await Promise.all(
          interviewQuestions.map((question) =>
            createQuestion(question, template.jobInterviewTemplateId)
          )
        );
      }
    }

    const dbResponse = await mappedJob(rows[0]);
    // SEO: notify Google the new job URL is available (fire-and-forget).
    // No-op unless GOOGLE_INDEXING_API_ENABLED=true in the environment.
    notifyJobUrlUpdated(dbResponse);
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[createJobs] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getJobApplicantDetails = async (req, res) => {
  const { jobId, id } = req.query;

  try {
    // QA11 FIX-02 BOLA: verify the caller's company owns the job before
    // returning applicant details. Without this check, any authenticated
    // employer from any company could read any applicant's details by
    // supplying a jobId from a different company.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const jobCompanyId = await getJobCompanyId(jobId);
    if (!jobCompanyId || jobCompanyId !== callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const applicants = await applicationOfApplicant(jobId, id);

    return res.status(status.success).json(successResponse(applicants));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getJobBasicListOfCompany = async (req, res) => {
  try {
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    const list = await getBasicJobList(callerCompany.companyId, 0);
    return res.status(status.success).json(successResponse(list));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getExpiredJobListOfCompany = async (req, res) => {
  try {
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    const list = await getBasicJobList(callerCompany.companyId, 10);
    return res.status(status.success).json(successResponse(list));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const deleteJob = async (req, res) => {
  // P2 FIX: companyId is no longer read from req.body — it was previously
  // destructured but only used in a post-delete getJobList() call that could
  // leak another company's job list to an attacker who supplied a spoofed
  // companyId. companyId is now derived exclusively from the authenticated
  // caller's JWT via getUserCompany(), same as all other job mutations.
  const { jobId } = req.body;
  try {
    // Caller identity: derive company from the authenticated Firebase JWT.
    // Never trust req.body.companyId, req.query.companyId, or any other
    // caller-supplied scope claim.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "Job not found or you do not have access." });
    }

    // Ownership-scoped DELETE: company_id=$2 in the WHERE clause ensures the
    // row is only deleted if it belongs to the authenticated caller's company.
    // RETURNING job_id lets us distinguish "not found / wrong company" (0 rows)
    // from a successful delete without a separate SELECT round-trip.
    const deleteQuery = `DELETE FROM ${dbSchema}.jobs
      WHERE job_id=$1 AND company_id=$2
      RETURNING job_id`;
    const { rowCount } = await dbQuery.query(deleteQuery, [jobId, callerCompany.companyId]);

    // 0 rows affected = job_id doesn't exist OR it belongs to a different
    // company. Return 404 (not 403) to avoid revealing whether the job exists.
    if (!rowCount || rowCount === 0) {
      const notFoundMsg = { error: "Job not found or you do not have access." };
      return res.status(status.notfound).send(notFoundMsg);
    }

    // SEO: notify Google the deleted job URL should be removed from the index.
    // Fire-and-forget — no-op unless GOOGLE_INDEXING_API_ENABLED=true.
    notifyJobUrlDeleted({ job_id: jobId });

    // Refresh the caller's own job list — scoped to callerCompany.companyId,
    // never to any caller-supplied ID. Empty array is a valid success response
    // (all jobs deleted).
    const jobs = await getBasicJobList(callerCompany.companyId, 0);
    return res.status(status.success).json(successResponse(jobs));
  } catch (error) {
    console.error('[deleteJob] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
      job_country=$16, job_status_id=$17, salary_currency=$18,
      expiration_date=$19
      WHERE job_id=$20 AND company_id=$21 returning *;`;

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
    expirationDate,
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
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
      expirationDate || null,
      jobId,
      callerCompany.companyId,  // $21 — ownership enforced in WHERE
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
      // F-08 child-table hardening: pass callerCompany.companyId so that
      // updateQuestionById gains a defence-in-depth ownership scope on every
      // individual question update (joins back through job_interview_template).
      await interviewQuestionsUpdate(
        jobId,
        interviewQuestions,
        interviewTemplateId,
        callerCompany.companyId
      );
    }

    const dbResponse = await mappedJob(rows[0]);

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[updateJob] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const updateJob = await updateJobStatus(statusId, jobId, callerCompany.companyId);

    // SEO: notify Google when a job is published (status 2 = active/published)
    // or removed from public view (any other status). Fire-and-forget.
    // No-op unless GOOGLE_INDEXING_API_ENABLED=true in the environment.
    if (statusId == 2) {
      notifyJobUrlUpdated(updateJob);
    } else {
      notifyJobUrlDeleted(updateJob);
    }

    // Attach canonical public URL server-side when publishing so the FE never
    // has to trust a client-supplied path.  Only present on publish (status 2).
    var responseData = updateJob;
    if (statusId == 2 && updateJob && updateJob.jobId) {
      responseData = Object.assign({}, updateJob, {
        postPublish: { publicJobUrl: '/jobs/details/' + updateJob.jobId }
      });
    }

    return res.status(status.success).json(successResponse(responseData));
  } catch (error) {
    if (error === "FORBIDDEN") {
      return res.status(403).json({ message: "You don't have permission to update this job." });
    }
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse(published));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getJobDetails = async (req, res) => {
  const { id } = req.query;
  let isApplied = false;

  // SEC-02 FIX: viewer identity comes only from the verified Firebase token
  // attached by optionalVerifyAuth — never from req.query.uid or any other
  // caller-supplied parameter.
  // ESM 3.x compat: avoid optional chaining (?.) and nullish coalescing (??)
  // which are not supported by esm@3.2.25 used on the Linode server.
  const viewerUid = (req.user && req.user.uid) ? req.user.uid : null;

  // SEC-02 FIX: if caller supplied a uid/userId/applicantId query param,
  // enforce mismatch policy:
  //   - Authenticated + uid matches token: backward compat, safe to proceed.
  //   - Authenticated + uid differs from token: BOLA probe — reject with 403.
  //   - Unauthenticated + uid supplied: ignore; return public-only response.
  const suppliedUid = req.query.uid || req.query.userId || req.query.applicantId
    || req.query.candidateId || req.query.profileId;

  if (suppliedUid && viewerUid && suppliedUid !== viewerUid) {
    console.warn('[SEC_02_JOB_DETAILS_UID_PARAM_PROBE_BLOCKED]', {
      endpoint: 'GET /job/details',
      jobId: id,
      suppliedParam: Object.keys(req.query).find(k =>
        ['uid','userId','applicantId','candidateId','profileId'].includes(k)),
      action: 'blocked_403',
    });
    return res.status(403).json({ message: "Unable to load this job for the current session." });
  }

  let isSaved = false;
  try {
    if (viewerUid) {
      const applied = await listOfJobAppliedByApplicant(viewerUid);
      const filtered = applied.filter((item) => item.jobId == id);
      isApplied = filtered.length != 0;
      isSaved = await getSavedJobStatus(viewerUid, id);
    }

    const details = await jobDetails(id);

    // TAB 05 FIX: jobDetails() returns [] (not null/undefined) when no row
    // matches -- {...[], isApplied, isSaved} silently spreads to just
    // {isApplied, isSaved} with NO job fields at all, and this previously
    // still returned 200/success. The frontend had no signal to treat this
    // as an error: it rendered a real-looking page with placeholder
    // fallback text ("Untitled role at Company") and a default "index,
    // follow" robots tag -- a soft-404 for any dead/mistyped/removed job
    // link, indexable by search engines as if it were real content.
    if (Array.isArray(details) && details.length === 0) {
      return res.status(status.notfound).json(errorResponse("Job not found."));
    }

    const click = await insertLogs("Job View", "", id);
    return res.status(status.success).json(successResponse({
      ...details,
      isApplied,
      isSaved,
    }));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Unable to load this job. Please try again."));
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
    return res.status(status.success).json(successResponse(link));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getAllApplicantOfJob = async (req, res) => {
  const { id } = req.query;

  try {
    // SECURE fix (BOLA): this route previously had no auth middleware at
    // all and returned full applicant PII for any job to any caller.
    // Confirm the authenticated caller's company owns this job.
    const jobCompanyId = await getJobCompanyId(id);
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    // QA8 FIX-9: return JSON 403 instead of bare string "Forbidden" for
    // consistent error response shape across all employer endpoints.
    if (!jobCompanyId || !callerCompany || Array.isArray(callerCompany) || callerCompany.companyId !== jobCompanyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const list = await jobApplicants(id);
    return res.status(status.success).json(successResponse(list));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse(list));
  } catch (error) {
    if (error.message === "FORBIDDEN") {
      // QA9 FIX-10: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const deleteInterviewQuestion = async (req, res) => {
  const { questionId, jobId } = req.query;
  try {
    // QA9 FIX-6 BOLA: verify the question belongs to the caller's company
    // before deleting. Join through job_interview_template for company_id.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
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
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getSubscriptionRestrictions = async (req, res) => {
  try {
    // QA10 FIX-11 BOLA: derive companyId from JWT, never from query param —
    // any authenticated employer could read another company's subscription
    // metadata by supplying a different companyId.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    const dbResponse = await companySubscriptions(companyId);

    if (dbResponse.length == 0) {
      throw "Company is not subscribed to any plan";
    }

    return res.status(status.success).json(successResponse(dbResponse[0]));
  } catch (error) {
    console.error('[jobsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

const toggleSaveJobHandler = async (req, res) => {
  const viewerUid = (req.user && req.user.uid) ? req.user.uid : null;
  if (!viewerUid) {
    return res.status(401).json(errorResponse("Authentication required."));
  }
  const jobId = req.body && req.body.jobId;
  if (!jobId) {
    return res.status(400).json(errorResponse("jobId is required."));
  }
  try {
    const isSaved = await toggleSavedJob(viewerUid, String(jobId));
    return res.status(status.success).json(successResponse({ isSaved }));
  } catch (error) {
    console.error("[jobsController] toggleSaveJob error:", error);
    return res.status(status.error).json(errorResponse("Could not update saved status. Please try again."));
  }
};

// Lightweight action-summary DTO for the employer job action modal.
// Returns job metadata + applicant count + computed action availability.
// No applicant PII is returned — counts only.
// No optional chaining (?.) or nullish coalescing (??) — Node 14 safe.
const getJobActionSummary = async (req, res) => {
  const jobId = req.query && req.query.jobId;
  if (!jobId) {
    return res.status(400).json(errorResponse("jobId is required."));
  }

  try {
    // Verify job belongs to the authenticated caller's company.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You do not have access to this job." });
    }

    // Fetch job row — must match company_id to prevent cross-company leakage.
    const jobQuery = `
      SELECT j.job_id, j.job_title, j.job_status_id, j.work_setup_id,
             ws.work_setup_name, jt.job_type_name, j.job_type_id,
             j.salary_minimum, j.salary_maximum, j.salary_currency, j.rate,
             j.job_city, j.job_country, j.created_at, j.updated_at
      FROM ${dbSchema}.jobs j
      LEFT JOIN ${dbSchema}.work_setup ws ON ws.work_setup_id = j.work_setup_id
      LEFT JOIN ${dbSchema}.job_type jt ON jt.job_type_id = j.job_type_id
      WHERE j.job_id = $1 AND j.company_id = $2
    `;
    const jobResult = await dbQuery.query(jobQuery, [jobId, callerCompany.companyId]);
    if (!jobResult.rows || jobResult.rows.length === 0) {
      return res.status(404).json({ message: "Job not found or you do not have access." });
    }
    const row = jobResult.rows[0];

    // Applicant COUNT only — no names, emails, or any PII.
    const countResult = await dbQuery.query(
      `SELECT COUNT(*) AS total FROM ${dbSchema}.job_applicants WHERE job_id = $1`,
      [jobId]
    );
    const totalApplicants = (countResult.rows && countResult.rows[0])
      ? parseInt(countResult.rows[0].total, 10) || 0
      : 0;

    // Interview questions count — tells the employer whether the job has
    // application questions set up, without returning any question content.
    const qCount = await dbQuery.query(
      `SELECT COUNT(*) AS total
       FROM ${dbSchema}.interview_template_question itq
       JOIN ${dbSchema}.job_interview_template jit ON jit.template_id = itq.template_id
       WHERE jit.job_id = $1`,
      [jobId]
    );
    const interviewQuestionsCount = (qCount.rows && qCount.rows[0])
      ? parseInt(qCount.rows[0].total, 10) || 0
      : 0;

    const statusId = row.job_status_id;

    // Map status ID to label and key.
    const statusMap = { 1: 'Draft', 2: 'Published', 3: 'Expired', 4: 'Archived' };
    const statusKeyMap = { 1: 'draft', 2: 'published', 3: 'expired', 4: 'archived' };
    const statusLabel = statusMap[statusId] || 'Draft';
    const statusKey = statusKeyMap[statusId] || 'draft';

    // Public URL is only valid for published jobs.
    const publicUrl = (statusId === 2) ? ('/jobs/details/' + jobId) : null;
    const previewUrl = '/recruiter/jobs/view?id=' + jobId;
    const editUrl = '/recruiter/jobs/edit?id=' + jobId;
    const applicantsUrl = '/recruiter/jobs/applicants?id=' + jobId;

    // Salary label — handles min-only, max-only, or range.
    const salaryCurrency = row.salary_currency || 'PHP';
    const salaryMin = row.salary_minimum;
    const salaryMax = row.salary_maximum;
    let salaryLabel = null;
    if (salaryMin && salaryMax) {
      salaryLabel = salaryCurrency + ' ' + Number(salaryMin).toLocaleString() + ' - ' + Number(salaryMax).toLocaleString();
    } else if (salaryMin) {
      salaryLabel = salaryCurrency + ' ' + Number(salaryMin).toLocaleString();
    } else if (salaryMax) {
      salaryLabel = salaryCurrency + ' ' + Number(salaryMax).toLocaleString();
    }

    // Action availability is determined server-side based on job status.
    // Frontend must not override these flags — they are authoritative.
    const canView = (statusId === 2);             // published only shows public page
    const canPreview = true;                       // employer can always preview their job
    const canEdit = (statusId === 1 || statusId === 2);  // draft or published
    const canReviewApplicants = true;              // always accessible
    const canCreateInterview = true;               // always accessible
    const canShare = (statusId === 2);             // only published jobs have shareable link
    const canDelete = true;                        // always available with confirmation

    const dto = {
      job: {
        id: row.job_id,
        title: row.job_title,
        statusId: statusId,
        status: {
          key: statusKey,
          label: statusLabel
        },
        workSetupName: row.work_setup_name || null,
        jobTypeName: row.job_type_name || null,
        jobCity: row.job_city || null,
        jobCountry: row.job_country || null,
        salary: {
          label: salaryLabel,
          isVisible: (salaryLabel !== null)
        },
        publicUrl: publicUrl,
        previewUrl: previewUrl,
        editUrl: editUrl,
        applicantsUrl: applicantsUrl,
        updatedAt: row.updated_at || row.created_at || null
      },
      summary: {
        totalApplicants: totalApplicants,
        interviewQuestionsCount: interviewQuestionsCount
      },
      actions: {
        canView: canView,
        canPreview: canPreview,
        canEdit: canEdit,
        canReviewApplicants: canReviewApplicants,
        canCreateInterview: canCreateInterview,
        canShare: canShare,
        canDelete: canDelete
      },
      permissionNotice: "Actions are based on your workspace access."
    };

    return res.status(status.success).json(successResponse(dto));
  } catch (error) {
    console.error('[getJobActionSummary] error:', error);
    return res.status(status.error).json(errorResponse("Could not load job summary. Please try again."));
  }
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
  getSubscriptionRestrictions,
  toggleSaveJobHandler,
  getJobActionSummary
};

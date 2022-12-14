import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import uploadInStorage from "../helpers/uploader";
import {
  createInterviewTemplateQuestions,
  createQuestion,
} from "./interviewController";
import {
  getPublishedJobs,
  jobDetails,
  saveJobArray,
  mappedJob,
  jobBasicDetails,
  jobApplicants,
  applicationOfApplicant,
} from "../services/job.service";

import { listOfJobAppliedByApplicant } from "../services/applicant.service";

import { createDynamicLink } from "../helpers/firebaseFunctions";
import { insertLogs } from "../services/user.service";

const dbSchema = env.schema;
const now = Date.now();

const createJobs = async (req, res) => {
  let questions = [];

  const jobId = idGenerator(6, "JB");
  let rawUrl = "";

  const {
    jobTitle,
    bannerFile,
    companyId,
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
  } = req.body;

  const insertQuery = `INSERT INTO ${dbSchema}.jobs
  (job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at, job_status_id, job_city, job_category_id, job_country, salary_currency)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, current_timestamp, $16, $17, $18, $19, $20) returning *;`;

  try {
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
      salaryCurrency
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
      });

      if (interviewQuestions && interviewQuestions.length != 0) {
        const template = await createInterviewTemplateQuestions(
          jobId,
          "default"
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
    errorMessage.data = "Operation was not successful. Error: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const deleteJob = async (req, res) => {
  const { jobId, companyId } = req.body;
  const deleteQuery = `DELETE FROM ${dbSchema}.jobs
    WHERE job_id='${jobId}'`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, []);
    const jobs = await getJobList(companyId);
    successMessage.data = jobs;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateJob = async (req, res) => {
  let rawUrl = "";

  const updateQuery = `UPDATE ${dbSchema}.jobs
    SET job_banner=$1, job_title=$2, industry_id=$3, 
      job_role_id=$4, job_type_id=$5, job_level_id=$6,
      job_description=$7, job_duties=$8, work_setup_id=$9,
      salary_minimum=$10, salary_maximum=$11, rate=$12, 
      job_address=$13, job_city=$14, job_category_id=$15,
      job_country= $16, job_status_id = $17, salary_currency=$18
      WHERE job_id =$19 returning *;`;

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
  } = req.body;

  try {
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
    ]);

    const jobArrays = await saveJobArray(jobId, {
      badges,
      requirements,
      goodToHave,
      educationalBackground,
      skills,
      tags,
    });

    if (!rows || rows.length == 0) {
      errorMessage.error = "Failed to Update Job";
      return res.status(status.error).send(errorMessage);
    }

    const dbResponse = mappedJob(rows[0]);

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateStatusOfJob = async (req, res) => {
  const jobId = req.body.jobId;
  const statusId = req.body.status;

  try {
    const updateJob = await updateJobStatus(statusId, jobId);

    successMessage.data = updateJob;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateJobStatus = async (statusId, jobId) => {
  const updateQuery = `UPDATE ${dbSchema}.jobs SET job_status_id=$1 WHERE job_id=$2 returning *`;
  try {
    const { rows } = await dbQuery.query(updateQuery, [statusId, jobId]);

    if (!rows || rows.length == 0) {
      throw "Failed to Update Job Status";
    }

    const dbResponse = mappedJob(rows[0]);
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
  j.job_city, j.work_setup_id, j.job_type_id,  j.salary_minimum, j.salary_maximum,
  j.job_status_id, ws.work_setup_name, jt.job_type_name, j.rate
  FROM gethired.jobs j
  left join gethired.work_setup ws 
  on ws.work_setup_id = j.work_setup_id
  left join gethired.job_type jt 
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
    errorMessage.error = "ERROR: " + error;
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
    errorMessage.error = "ERROR: " + error;
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
      job.companyLogoUrl,
      postLink
    );
    successMessage.data = link;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getAllApplicantOfJob = async (req, res) => {
  const { id } = req.query;

  try {
    const list = await jobApplicants(id);
    successMessage.data = list;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
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
  getJobApplicantDetails
};

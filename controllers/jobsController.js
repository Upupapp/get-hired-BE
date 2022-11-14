import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import uploadInStorage from "../helpers/uploader";

const dbSchema = env.schema;
const now = Date.now();

const createJobs = async (req, res) => {
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
    rate,
    jobAddress,
    expirationDate,
    jobStatusId,
    jobCity
  } = req.body;

  const insertQuery = `INSERT INTO ${dbSchema}.jobs
  (job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at, expiration_date, job_status_id, job_city, job_category_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) returning *;`

  try {

    if (bannerFile && bannerFile != "") {
      rawUrl = await uploadInStorage(
        "Job-Banner",
        `${jobId}-Banner`,
        bannerFile
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
      now,
      expirationDate,
      jobStatusId,
      jobCity,
      jobCategoryId
    ]);

    if(rows || rows.length == 0) {
      errorMessage.error = "Failed to create Jobs";
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
  const {
    jobTitle,
    jobCountry,
    jobCategory,
    maxSalary,
    hoursPerWeek,
    externalLink,
    minSalary,
    jobCity,
    reqDetails,
    applicationEmail,
    jobDescription,
    minRate,
    jobType,
    jobTags,
    jobId,
    maxRate,
    companyId,
  } = req.body;

  try {
    const updateQuery = `UPDATE ${dbSchema}.jobs
          SET jobtitle=$1, jobcountry=$2, jobcategory=$3, maxsalary=$4, hoursperweek=$5, externallink=$6, minsalary=$7, jobcity=$8, reqdetails=$9, applicationemail=$10, jobdescription=$11, minrate=$12, jobtype=$13, jobtags=$14, maxrate=$16
          WHERE job_id =$15 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      jobTitle,
      jobCountry,
      jobCategory,
      maxSalary,
      hoursPerWeek,
      externalLink,
      minSalary,
      jobCity,
      reqDetails,
      applicationEmail,
      jobDescription,
      minRate,
      jobType,
      jobTags,
      jobId,
      maxRate,
    ]);

    const dbResponse = await getJobWithCompanyDetails(jobId);

    if (!dbResponse) {
      errorMessage.error = "Failed to Update Job";
      return res.status(status.error).send(errorMessage);
    }

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateJobStatus = async (status, jobId) => {
  const updateQuery = `UPDATE ${dbSchema}.jobs SET job_status_id=$1 WHERE job_id=$2 returning *`;
  try {
    const { rows } = await dbQuery.query(updateQuery, [status, jobId]);

    if (rows || rows.length == 0) {
      throw "Failed to Update Job Status";
    }

    const dbResponse = mappedJob(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getIndustryList = async (req, res) => {
  const searchQuery = `SELECT industry_id, industry_name FROM ${dbSchema}.industry;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.industry_id,
        name: list.industry_name,
      };
    });

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

const getSetupList = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.work_setup;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.work_setup_id,
        name: list.work_setup_name,
      };
    });
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getTypeList = async (req, res) => {
  const searchQuery = `SELECT job_type_id, job_type_name FROM ${dbSchema}.job_type;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_type_id,
        name: list.job_type_name,
      };
    });
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getLevelList = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.job_level;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_level_id,
        name: list.job_level_name,
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
  const searchQuery = `SELECT * FROM ${dbSchema}.job_category;`;

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

const getJobWithCompanyDetails = async (job_id) => {
  const searchQuery = `
    select * from ${dbSchema}.jobs j 
    inner join ${dbSchema}.company_jobs cj 
    on cj.job_id = j.job_id 
    inner join ${dbSchema}.company c 
    on cj.company_id = c.company_id 
    where j.job_id = '${job_id}'
  `;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = mapJobs(rows[0]);
    return dbResponse;
  } catch (error) {
    throw Error("Error getting Job Details");
  }
};

const mappedJob = (raw) => {
  return {
    jobId: raw.job_id,
    jobBanner: raw.job_banner,
    jobTitle: raw.job_title,
    companyId: raw.company_id,
    industryId: raw.industry_id,
    jobRoleId: raw.job_role_id,
    jobTypeId: raw.job_type_id,
    jobLevelId: raw.job_level_id,
    jobDescription: raw.job_description,
    jobDuties: raw.job_duties,
    workSetupId: raw.work_setup_id,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    rate: raw.rate,
    jobAddress: raw.job_address,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    expirationDate: raw.expiration_date,
    jobStatusId: raw.job_status_id,
    jobCity: raw.job_city,
    jobCategoryId: raw.job_category_id
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
  getSetupList,
  getTypeList,
  getLevelList,
  getCategoryList
};

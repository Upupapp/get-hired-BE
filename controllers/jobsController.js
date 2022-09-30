import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helper/status";
import env from "../env";
const dbSchema = env.schema;
const createJobs = async (req, res) => {
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
    maxRate,
    companyId,
  } = req.body;

  try {
    const insertQuery = `INSERT INTO ${dbSchema}.jobs
    (jobtitle, jobcountry, jobcategory, maxsalary, hoursperweek, externallink, minsalary, jobcity, reqdetails, applicationemail, jobdescription, minrate, jobtype, jobtags, maxrate)
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
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
      maxRate,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Create Company";
      return res.status(status.error).send(errorMessage);
    }

    const addJobQuery = `INSERT INTO ${dbSchema}.company_jobs
    (company_id, job_id) VALUES ($1, $2);`;

    const company_job = await dbQuery.query(addJobQuery, [
      companyId,
      dbResponse.job_id,
    ]);

    if (!company_job) {
      errorMessage.error = "Failed to add job to a company";
      return res.status(status.error).send(errorMessage);
    }

    const jobList = await getJobList(companyId);

    successMessage.data = jobList;
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

const mapJobs = (job) => {
  return {
    jobId: job.job_id,
    jobTitle: job.jobtitle,
    jobCity: job.jobcity,
    jobCountry: job.jobcountry,
    jobCategory: job.jobcategory,
    jobType: job.jobtype,
    jobTags: job.jobtags,
    reqDetails: job.reqdetails,
    jobDescription: job.jobdescription,
    applicationEmail: job.applicationemail,
    minSalary: job.minsalary,
    maxSalary: job.maxsalary,
    minRate: job.minrate,
    maxRate: job.maxrate,
    hoursPerWeek: job.hoursperweek,
    externalLink: job.externallink,
    createdDate: job.createddate,
    isFilled: job.isfilled,
    isDraft: job.isdraft,
    application: job.applications,
    views: job.views,
    companyName: job.companyname,
    logoURL: job.logourl,
    natureOfBusiness: job.natureofbusiness,
    companyDesc: job.description,
    updateDate: job.update_date,
  };
};

export { createJobs, deleteJob, updateJob };

import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const companyPublishedJobs = async (companyId) => {
  const searchQuery = `SELECT job_id, job_banner, job_title, company_id, industry_id, job_role_id, job_type_id, job_level_id, job_description, job_duties, work_setup_id, salary_minimum, salary_maximum, rate, job_address, created_at, updated_at, expiration_date, job_status_id, job_city, job_category_id, job_country
    FROM ${dbSchema}.jobs
    WHERE company_id = $1
    ORDER BY updated_at DESC;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getCompanyPublishedJobsCount = async (companyId) => {
  const searchQuery = `SELECT count(*) FROM ${dbSchema}.jobs WHERE company_id = $1 and job_status_id = 2 `;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = parseInt(rows[0].count);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getPublishedJobs = async (companyId) => {
  const filter = companyId ? `and j.company_id = '${companyId}'` : "";

  const searchQuery = `SELECT 
        j.job_id, j.job_banner, j.job_title, 
        j.company_id, j.job_type_id, j.work_setup_id,
        j.job_country, j.job_city, j.salary_minimum, j.salary_maximum,
        c.company_name, t.job_type_name, w.work_setup_name
    FROM ${dbSchema}.jobs j
    LEFT JOIN ${dbSchema}.companies c
    ON j.company_id = c.company_id
    LEFT JOIN ${dbSchema}.job_type t
    ON j.job_type_id = t.job_type_id
    LEFT JOIN ${dbSchema}.work_setup w
    ON j.work_setup_id = w.work_setup_id
    WHERE j.job_status_id = 2 ${filter}
    ORDER BY j.updated_at DESC;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async (row) => mappedBasicJob(row)));
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const getJobBadges = async (jobId) => {
  const searchQuery = `SELECT j.badge_id, b.badge_name, b.badge_icon
    FROM ${dbSchema}.job_badges j
    LEFT JOIN ${dbSchema}.badge b
    ON j.badge_id = b.badge_id
    WHERE job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async (row) => mappedOptions(row)));
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const getJobTags = async (jobId) => {
  const searchQuery = `SELECT *
      FROM ${dbSchema}.job_tags j
      WHERE job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async (row) => row.tags));
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const mappedOptions = (raw) => {
  return {
    id: raw.badge_id,
    name: raw.badge_name,
    icon: raw.badge_icon,
  };
};

const mappedBasicJob = async (raw) => {
  return {
    jobId: raw.job_id,
    jobBanner: raw.job_banner,
    jobTitle: raw.job_title,
    companyId: raw.company_id,
    jobTypeId: raw.job_type_id,
    workSetupId: raw.work_setup_id,
    jobCountry: raw.job_country,
    jobCity: raw.job_city,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    companyName: raw.company_name,
    jobTypeName: raw.job_type_name,
    workSetupName: raw.work_setup_name,
    badges: await getJobBadges(raw.job_id),
    tags: await getJobTags(raw.job_id)
  };
};

const mappedJob = (raw) => {
  return {};
};

export { companyPublishedJobs, getPublishedJobs, getCompanyPublishedJobsCount };

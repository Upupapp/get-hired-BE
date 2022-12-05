import dbQuery from "../db/dbQuery";
import env from "../env";
import genericInsert from "../helpers/genericInsert";

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

const getJobInterviewQuestions = async (jobId, templateName) => {
  const searchQuery = `SELECT i.*
      FROM ${dbSchema}.job_interview_template j
      left join ${dbSchema}.interview_template_question i
      on i.job_interview_template_id = j.job_interview_template_id
      WHERE job_id = $1 and job_interview_template_name = $2;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId, templateName]);
    if (rows && rows.length != 0) {
      return await Promise.all(
        rows.map(async (row) => mappedInterviewQuestions(row))
      );
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const getJobArrayDetails = async (jobId, tableName, column) => {
  const searchQuery = `SELECT *
      FROM ${dbSchema}.${tableName} j
      WHERE job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    if (rows && rows.length != 0) {
      return await Promise.all(rows.map(async (row) => row[column]));
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const deleteArrayJobEntry = async (jobId, tableName, columnName) => {
  const deleteQuery = `DELETE FROM ${dbSchema}.${tableName} WHERE ${columnName} = $1;`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, [jobId]);
    return true;
  } catch (error) {
    throw error;
  }
};

const saveJobDetailsList = async (list, tableName, columnName, jobId) => {
  try {
    const insertedList = list.map(
      async (item) =>
        await genericInsert(tableName, columnName, item, {
          column: "job_id",
          value: jobId,
        })
    );
    return insertedList;
  } catch (error) {
    throw error;
  }
};

const saveJobArray = async (jobId, arrays) => {
  const {
    badges,
    requirements,
    goodToHave,
    educationalBackground,
    skills,
    tags,
  } = arrays;
  if (badges && badges.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(
      jobId,
      "job_badges",
      "job_id"
    );
    const jobBadges = await saveJobDetailsList(
      badges,
      "job_badges",
      "badge_id",
      jobId
    );
  }

  if (requirements && requirements.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(
      jobId,
      "job_requirement",
      "job_id"
    );

    const jobRequirements = await saveJobDetailsList(
      requirements,
      "job_requirement",
      "requirement",
      jobId
    );
  }

  if (goodToHave && goodToHave.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(
      jobId,
      "job_goodtohave",
      "job_id"
    );

    const jobGoodToHave = await saveJobDetailsList(
      goodToHave,
      "job_goodtohave",
      "goodtohave",
      jobId
    );
  }

  if (educationalBackground && educationalBackground.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(
      jobId,
      "job_educationalbackground",
      "job_id"
    );

    const jobEducationalBackground = await saveJobDetailsList(
      educationalBackground,
      "job_educationalbackground",
      "educationalbackground",
      jobId
    );
  }

  if (skills && skills.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(
      jobId,
      "job_skills",
      "job_id"
    );

    const jobSkillList = await saveJobDetailsList(
      skills,
      "job_skills",
      "skills",
      jobId
    );
  }

  if (tags && tags.length != 0) {
    const deleteArrays = await deleteArrayJobEntry(jobId, "job_tags", "job_id");

    const jobTagsList = await saveJobDetailsList(
      tags,
      "job_tags",
      "tags",
      jobId
    );
  }
};

const jobDetails = async (jobId) => {
  const searchQuery = `SELECT 
  j.job_id, j.job_banner, j.job_title, 
  j.company_id, c.company_name,
  j.industry_id, i.industry_name,
  j.job_role_id, jr.job_role_name,
  j.job_type_id, jt.job_type_name,
  j.job_level_id, jl.job_level_name,
  j.job_description, j.job_duties, 
  j.work_setup_id, ws.work_setup_name,
  j.salary_minimum, j.salary_maximum, j.rate, j.job_address, j.created_at, j.updated_at, j.expiration_date, 
  j.job_status_id, 
  j.job_city, 
  j.job_category_id, cat.job_category_name, 
  j.job_country, j.is_featured,
  c.company_city, c.company_country, c.company_logo,
  c.company_details, c.number_of_employee
    FROM ${dbSchema}.jobs j
    left join ${dbSchema}.companies c
    on c.company_id = j.company_id
    left join ${dbSchema}.industry i
    on i.industry_id = j.industry_id
    left join ${dbSchema}.job_role jr
    on jr.job_role_id  = j.job_role_id
    left join ${dbSchema}.job_type jt
    on jt.job_type_id  = j.job_type_id
    left join ${dbSchema}.job_level jl
    on jl.job_level_id  = j.job_level_id
    left join ${dbSchema}.work_setup ws
    on ws.work_setup_id  = j.work_setup_id
    left join ${dbSchema}.category cat
    on cat.job_category_id  = j.job_category_id
    where j.job_id = $1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    if (rows && rows.length != 0) {
      return await mappedJob(rows[0]);
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const jobBasicDetails = async (jobId) => {
  const searchQuery = `SELECT 
  j.job_id, j.job_banner, j.job_title, 
  j.company_id, c.company_name,
  j.job_description, 
  j.job_city, 
  j.job_country, c.company_logo,
  c.company_details
    FROM ${dbSchema}.jobs j
    left join ${dbSchema}.companies c
    on c.company_id = j.company_id
    where j.job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    if (rows && rows.length != 0) {
      const raw = rows[0];
      return {
        jobId: raw.job_id,
        jobBanner: raw.job_banner,
        jobTitle: raw.job_title,
        companyId: raw.company_id,
        companyName: raw.company_name,
        jobDescription: raw.job_description,
        jobCity: raw.job_city,
        jobCountry: raw.job_country,
        companyLogoUrl: raw.company_logo,
        companyDetails: raw.company_details,
      };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

const mappedInterviewQuestions = (raw) => {
  return {
    question: raw.template_question,
    answerDuration: raw.template_answer_duration,
    questionId: raw.template_question_id
  };
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
    tags: await getJobArrayDetails(raw.jobId, "job_tags", "tags"),
  };
};

const mappedJob = async (raw) => {
  return {
    jobId: raw.job_id,
    jobBanner: raw.job_banner,
    jobTitle: raw.job_title,
    companyId: raw.company_id,
    industryId: raw.industry_id,
    industryName: raw.industry_name,
    jobRoleId: raw.job_role_id,
    jobRoleName: raw.job_role_name,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    jobLevelId: raw.job_level_id,
    jobLevelName: raw.job_level_name,
    jobDescription: raw.job_description,
    jobDuties: raw.job_duties,
    workSetupId: raw.work_setup_id,
    workSetupName: raw.work_setup_name,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    rate: raw.rate,
    jobAddress: raw.job_address,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    expirationDate: raw.expiration_date,
    jobStatusId: raw.job_status_id,
    jobCity: raw.job_city,
    jobCategoryId: raw.job_category_id,
    jobCountry: raw.job_country,
    companyCity: raw.company_city,
    companyCountry: raw.company_country,
    companyLogoUrl: raw.company_logo,
    companyDetails: raw.company_details,
    numberOfEmployee: raw.number_of_employee,
    companyRating: 0,
    badges: await getJobBadges(raw.job_id),
    tags: await getJobArrayDetails(raw.job_id, "job_tags", "tags"),
    requirements: await getJobArrayDetails(
      raw.job_id,
      "job_requirement",
      "requirement"
    ),
    skills: await getJobArrayDetails(raw.job_id, "job_skills", "skills"),
    goodToHave: await getJobArrayDetails(
      raw.job_id,
      "job_goodtohave",
      "goodtohave"
    ),
    educationalBackground: await getJobArrayDetails(
      raw.job_id,
      "job_educationalbackground",
      "educationalbackground"
    ),
    interviewQuestions: await getJobInterviewQuestions(raw.job_id, "default"),
  };
};

export {
  companyPublishedJobs,
  getPublishedJobs,
  getCompanyPublishedJobsCount,
  jobDetails,
  saveJobArray,
  mappedJob,
  jobBasicDetails,
};

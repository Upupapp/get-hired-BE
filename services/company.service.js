import dbQuery from "../db/dbQuery";
import env from "../env";
import { getCompanyPublishedJobsCount } from "./job.service";
import idGenerator from "../helpers/randomNumberForId";

const dbSchema = env.schema;
const now = new Date();

const companyList = async (isFeatured) => {
  const searchQuery = `SELECT
        c.company_id, c.company_logo, c.company_name, c.industry_id, c.is_featured,
        i.industry_name as company_industry_name
    FROM ${dbSchema}.companies c
    RIGHT JOIN ${dbSchema}.industry i
    on c.industry_id = i.industry_id
    WHERE c.is_featured = $1 ORDER BY c.updated_at limit 6;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [isFeatured]);
    if (rows && rows.length != 0) {
      return await Promise.all(
        rows.map(async (row) => await mappedCompanyBasicInfo(row))
      );
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const companyDetailsById = async (companyId) => {
  const searchQuery = `SELECT c.*, i.industry_name as company_industry_name
    FROM ${dbSchema}.companies c
    RIGHT JOIN ${dbSchema}.industry i
    on c.industry_id = i.industry_id
    WHERE company_id=$1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = mappedCompany(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const companyUsers = async (companyId) => {
  const searchQuery = `SELECT ce.*, u.firstname, u.lastname, u.email 
    FROM ${dbSchema}.company_employees ce 
    LEFT JOIN ${dbSchema}.users u 
    ON ce.employee_uuid = u.uid 
    WHERE ce.company_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    if (rows && rows.length != 0) {
      return await Promise.all(
        rows.map(async (row) => {
          return {
            employeeId: row.employee_id,
            companyId: row.company_id,
            assignedAt: row.assigned_at,
            email: row.email,
            fullName: row.firstname + " " + row.lastname,
          };
        })
      );
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const assignEmployeeToCompany = async (companyId, uid, assignedBy) => {
  const insertQuery = `INSERT INTO ${dbSchema}.company_employees
      (employee_id, company_id, employee_uuid, assigned_at, updated_at, position_id, assigned_by)
      VALUES($1, $2, $3, $4, $5, $6, $7) returning *;`;

  const employeeId = idGenerator(6, "EMP");

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      employeeId,
      companyId,
      uid,
      now,
      now,
      0, // TODO to change if position is available
      assignedBy,
    ]);

    if (rows && rows.length == 0) {
      throw "Failed to assign employee to the company";
    }

    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getCompanyNameByCompanyId = async (companyId) => {
  const searchQuery = `Select company_name from ${dbSchema}.companies where company_id = $1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = rows[0].company_name;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getCompanyIdByUserId = async (uid) => {
  const searchQuery = `Select company_id from ${dbSchema}.company_employees where employee_uuid = $1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [uid]);
    const dbResponse = rows[0].company_id;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedCompanyBasicInfo = async (raw) => {
  return {
    companyId: raw.company_id,
    companyName: raw.company_name,
    companyLogo: raw.company_logo,
    companyIndustry: raw.company_industry_name,
    companyJobsOpening:
      (await getCompanyPublishedJobsCount(raw.company_id)) || 0,
  };
};

const mappedCompany = (raw) => {
  return {
    companyId: raw.company_id,
    companyLogoUrl: raw.company_logo,
    companyName: raw.company_name,
    companyDetails: raw.company_details,
    industryId: raw.industry_id,
    companyIndustry: raw.company_industry_name,
    workSetupId: raw.work_setup_id,
    numberOfEmployee: raw.number_of_employee,
    companyEmail: raw.company_email,
    companyCity: raw.company_city,
    companyContactNumber: raw.company_contact_number,
    companyCountry: raw.company_country,
    companyAddress: raw.company_address,
    createdAt: raw.created_at,
    createdBy: raw.created_by,
    updatedAt: raw.updated_at,
  };
};

const charts = async (companyId) => {
  const searchQuery = `SELECT date_part('month', updated_at) as month, count(job_id) as activejobs
                      FROM gethired.jobs
                      where job_status_id = '2' and company_id  = $1 
                      and date_part('month', CURRENT_DATE) = date_part('month', updated_at)
                      group by date_part('month', updated_at);`;
  const searchQuery2 = `SELECT date_part('month', a.updated_at) as month, count(a.job_application_id) as applicant
                      FROM gethired.job_applicants a
                      left join gethired.jobs j on j.job_id = a.job_id
                      where j.company_id = $1 and j.job_status_id = '2' and a.application_status_id = '2'
                      and date_part('month', CURRENT_DATE) = date_part('month', a.updated_at)
                      group by date_part('month', a.updated_at);`;
  const searchQuery3 = `SELECT date_part('month', a.updated_at) as month, count(a.job_application_id) as interviews
                    FROM gethired.job_applicants a
                    left join gethired.jobs j on j.job_id = a.job_id
                    where j.company_id = $1 and j.job_status_id = '2' and a.application_status_id = '3' and a.application_status_id = '4'
                    and date_part('month', CURRENT_DATE) = date_part('month', a.updated_at) 
                    group by date_part('month', a.updated_at);`;

  try {
    var today = new Date();
    var mm = today.getMonth() + 1;
    const activeJobs = await dbQuery.query(searchQuery, [companyId]);
    const applicants = await dbQuery.query(searchQuery2, [companyId]);
    const interview = await dbQuery.query(searchQuery3, [companyId]);

    const result = {
      activeJobs: activeJobs.rows[0]
        ? parseInt(activeJobs.rows[0].activejobs)
        : 0,
      applicants: applicants.rows[0]
        ? parseInt(applicants.rows[0].applicant)
        : 0,
      interviews: interview.rows[0]
        ? parseInt(interview.rows[0].interviews)
        : 0,
    };

    return result
  } catch (error) {
    throw Error("Operation Failed" + error);
  }
};

const statistic = async (companyId) => {

  const searchQuery = `SELECT count(contact_id) as contact
                      FROM gethired.contact
                      where company_id = $1;`;
  const searchQuery2 = `select count(distinct a.job_application_id) as applicant
                        FROM gethired.job_applicants a
                        left join gethired.jobs j on j.job_id = a.job_id
                        right join gethired.users u on u.uid = a.candidate_id 
                        right join gethired.contact c on c.email = u.email 
                        where j.company_id = $1 and j.job_status_id = '2' and a.application_status_id = '2' 
                        group by a.job_application_id, c.email`;

  try {
    const contacts = await dbQuery.query(searchQuery, [companyId]);
    const applicants = await dbQuery.query(searchQuery2, [companyId]);
    const applicantPercentage = parseInt( applicants.rows[0]
      ? applicants.rows[0].applicant : 0)/parseInt(contacts.rows[0].contact) * 100
    const contactPercentage = 100 - applicantPercentage 

    const result = {
        contacts: contactPercentage ? contactPercentage.toPrecision(3) : 0,
        applicants: applicantPercentage ? applicantPercentage.toPrecision(3) : 0,
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const totalContacts = async (companyId) => {

  const searchQuery = `SELECT count(contact_id) as contact
                      FROM gethired.contact
                      where company_id = $1;`;

  try {
    const contacts = await dbQuery.query(searchQuery, [companyId]);

    const result = {
        totalContacts: contacts.rows[0] ? parseInt(contacts.rows[0].contact) : 0,
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const graph = async (companyId) => {

  const searchQuery = `select date_part('month', a.updated_at) as month, date_part('day', a.updated_at) as day, count(distinct a.job_application_id)
                      FROM gethired.job_applicants a
                      left join gethired.jobs j on j.job_id = a.job_id
                      where j.company_id = $1 and j.job_status_id = '2' and a.application_status_id = '2' 
                      group by date_part('month', a.updated_at), date_part('day', a.updated_at)`;
  const selectQuery = `SELECT date_part('month', l.date_of_activity) as month, date_part('day', l.date_of_activity) as day, count(l.activity_id)
                      FROM gethired.logs l
                      left join gethired.jobs j on j.job_id = l.activity_id 
                      where j.company_id = $1 and l.activity_name = 'Job View'
                      group by date_part('month', l.date_of_activity), date_part('day', l.date_of_activity)`

  try {
    const applicants = await dbQuery.query(searchQuery, [companyId]);
    const jobView = await dbQuery.query(selectQuery, [companyId]);

    const result = {
        graph: applicants.rows ? applicants.rows : 0,
        jobViews: jobView.rows ? jobView.rows : 0
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const cities = async (companyId) => {

  const searchQuery = `select u.city, count(a.job_application_id)
                      FROM gethired.job_applicants a
                      left join gethired.jobs j on j.job_id = a.job_id
                      left join gethired.users u on u.uid = a.candidate_id 
                      where j.company_id = $1 and city notnull 
                      group by u.city
                      order by count(a.job_application_id) desc limit 5`;

  try {
    const city = await dbQuery.query(searchQuery, [companyId]);

    const result = {
        cities: city.rows ? city.rows : 0,
    }

    return result;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

export {
  companyList,
  companyDetailsById,
  companyUsers,
  assignEmployeeToCompany,
  getCompanyNameByCompanyId,
  getCompanyIdByUserId,
  charts,
  statistic,
  totalContacts,
  graph,
  cities
};

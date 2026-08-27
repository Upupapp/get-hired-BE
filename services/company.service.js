import dbQuery from "../db/dbQuery";
import env from "../env";
import { getCompanyPublishedJobsCount } from "./job.service";
import idGenerator from "../helpers/randomNumberForId";

const dbSchema = env.schema;

const companyList = async (isFeatured) => {
  // LEFT JOIN, not RIGHT JOIN -- a RIGHT JOIN against industry drops any
  // company with no industry_id set, which is a real bug (STITCH fix):
  // such companies would silently never appear in this list at all.
  const searchQuery = `SELECT
        c.company_id, c.company_logo, c.company_name, c.industry_id, c.is_featured,
        i.industry_name as company_industry_name
    FROM ${dbSchema}.companies c
    LEFT JOIN ${dbSchema}.industry i
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
  // LEFT JOIN, not RIGHT JOIN -- see companyList() above for why. A company
  // with no industry_id set previously caused this to return zero rows
  // (RIGHT JOIN against industry requires a matching industry row to exist),
  // which crashed mappedCompany(rows[0]) on undefined. STITCH fix.
  const searchQuery = `SELECT c.*, i.industry_name as company_industry_name
    FROM ${dbSchema}.companies c
    LEFT JOIN ${dbSchema}.industry i
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
  // STITCH QA11 FIX F-01: users.email was dropped in a DDL migration
  // (db/user_ddl.sql: "ALTER TABLE gethired.users DROP COLUMN email") --
  // email lives on user_credentials only. Same fix pattern already applied
  // in candidate.service.js/interviewController.js/message.service.js.
  const searchQuery = `SELECT ce.employee_id, ce.company_id, ce.employee_uuid, ce.assigned_at,
    u.firstname, u.lastname, uc.email, u.photo_url, u.uid, u.role_title
    FROM ${dbSchema}.company_employees ce
    LEFT JOIN ${dbSchema}.users u ON ce.employee_uuid = u.uid
    LEFT JOIN ${dbSchema}.user_credentials uc ON ce.employee_uuid = uc.uid
    WHERE ce.company_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    if (rows && rows.length != 0) {
      return rows.map(function(row) {
        var firstName = row.firstname || '';
        var lastName = row.lastname || '';
        var initials = (firstName.charAt(0) || '') + (lastName.charAt(0) || '');
        return {
          employeeId: row.employee_id,
          companyId: row.company_id,
          uid: row.uid || row.employee_uuid || null,
          assignedAt: row.assigned_at,
          email: row.email,
          fullName: (firstName + ' ' + lastName).trim(),
          photoUrl: row.photo_url || null,
          roleTitle: row.role_title || null,
          initials: initials.toUpperCase(),
        };
      });
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

// BUG FIX (2026-08-19, found live-debugging a fresh employer signup): this
// function never set team_role_id/access_scope at all -- every row it
// created left team_role_id NULL, which buildAccessContext() (services/
// accessControl.service.js) deliberately treats identically to "zero
// access" (the same fail-closed design applied to suspended members). The
// one-time RBAC migration (db/20260813_team_access_rbac.sql) backfilled
// every company_employees row that existed AT THAT TIME, but nothing was
// ever updated here in the ongoing runtime code path -- so every company
// created (and every teammate added via the legacy invite flow) SINCE that
// migration got a permanently permission-less row, silently. Confirmed:
// jobs.create (and every other permission-gated action) 403s for every
// such row, with no error indicating why.
//
// Both real call patterns are distinguished by whether the caller is
// assigning themselves (uid === assignedBy, the two company-creation call
// sites in companiesController.js) or assigning someone else (the legacy
// addCompanyUserByEmail invite flow) -- matching exactly the same
// creator-becomes-owner / everyone-else-becomes-company_admin choice the
// RBAC migration's own one-time backfill already made, so a newly created
// company and a migration-backfilled one land in the same place.
const assignEmployeeToCompany = async (companyId, uid, assignedBy) => {
  const isSelfAssignment = uid === assignedBy;
  const roleKey = isSelfAssignment ? "owner" : "company_admin";

  const roleRow = await dbQuery.query(
    `SELECT team_role_id FROM ${dbSchema}.team_roles WHERE role_key = $1 AND company_id IS NULL LIMIT 1`,
    [roleKey]
  );
  const teamRoleId = roleRow.rows[0] && roleRow.rows[0].team_role_id;
  if (!teamRoleId) {
    throw new Error(`Missing system team role: ${roleKey}`);
  }

  const insertQuery = `INSERT INTO ${dbSchema}.company_employees
      (employee_id, company_id, employee_uuid, assigned_at, updated_at, position_id, assigned_by, team_role_id, access_scope, status)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, 'all_jobs', 'active') returning *;`;

  const employeeId = idGenerator(6, "EMP");

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      employeeId,
      companyId,
      uid,
      new Date(),
      new Date(),
      0, // TODO to change if position is available
      assignedBy,
      teamRoleId,
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

const generateSlug = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const mappedCompanyBasicInfo = async (raw) => {
  return {
    companyId: raw.company_id,
    companyName: raw.company_name,
    companyLogo: raw.company_logo,
    companyIndustry: raw.company_industry_name,
    companyJobsOpening:
      (await getCompanyPublishedJobsCount(raw.company_id)) || 0,
    slug: raw.company_slug || generateSlug(raw.company_name),
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
    slug: raw.company_slug || generateSlug(raw.company_name),
  };
};

const companyDetailsBySlug = async (slug) => {
  const searchQuery = `SELECT c.*, i.industry_name as company_industry_name
    FROM ${dbSchema}.companies c
    LEFT JOIN ${dbSchema}.industry i ON c.industry_id = i.industry_id
    WHERE c.company_slug = $1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [slug]);
    if (!rows || rows.length === 0) return null;
    return mappedCompany(rows[0]);
  } catch (error) {
    throw error;
  }
};

const charts = async (companyId) => {
  const searchQuery = `SELECT date_part('month', updated_at) as month, count(job_id) as activejobs
                      FROM ${dbSchema}.jobs
                      where job_status_id = '2' and company_id  = $1 
                      and date_part('month', CURRENT_DATE) = date_part('month', updated_at)
                      group by date_part('month', updated_at);`;
  const searchQuery2 = `SELECT date_part('month', a.updated_at) as month, count(a.job_application_id) as applicant
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      where j.company_id = $1 and j.job_status_id = '2' and (a.application_status_id = '2' OR a.application_status_id = '3' OR a.application_status_id = '4'
                      OR a.application_status_id = '5' OR a.application_status_id = '6')
                      and date_part('month', CURRENT_DATE) = date_part('month', a.updated_at)
                      group by date_part('month', a.updated_at);`;
  const searchQuery3 = `SELECT count(a.interview_answer_id) as interviews, date_part('month', a.created_at) as month
                        FROM ${dbSchema}.interview_answers a
                        left join ${dbSchema}.jobs j on j.job_id = a.job_id
                        where j.company_id = $1 and j.job_status_id = '2'
                        and date_part('month', CURRENT_DATE) = date_part('month', a.created_at)
                        group by date_part('month', a.created_at);`;

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
                      FROM ${dbSchema}.contact
                      where company_id = $1;`;
  // STITCH QA11 FIX F-01: users.email was dropped; join user_credentials
  // for email (same pattern as companyUsers() above).
  const searchQuery2 = `select count(distinct a.job_application_id) as applicant
                        FROM ${dbSchema}.job_applicants a
                        left join ${dbSchema}.jobs j on j.job_id = a.job_id
                        right join ${dbSchema}.users u on u.uid = a.candidate_id
                        right join ${dbSchema}.user_credentials uc on uc.uid = u.uid
                        right join ${dbSchema}.contact c on c.email = uc.email
                        where j.company_id = $1 and j.job_status_id = '2' and (a.application_status_id = '2' OR a.application_status_id = '3' OR a.application_status_id = '4'
                        OR a.application_status_id = '5' OR a.application_status_id = '6')
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
                      FROM ${dbSchema}.contact
                      where company_id = $1;`;
  const searchQuery2 = `SELECT count(candidate_id) as candidate
                        FROM ${dbSchema}.candidates
                      where company_id = $1;`;

  try {
    const contacts = await dbQuery.query(searchQuery, [companyId]);
    const candidate = await dbQuery.query(searchQuery2, [companyId]);
    const total = (contacts.rows[0] ? parseInt(contacts.rows[0].contact) : 0) + (candidate.rows[0] ? parseInt(candidate.rows[0].candidate) : 0)
    // const result = {
    // //   total
    // // }

    return total;

  } catch (error) {
    throw Error("Operation Failed" + error);
  };
};

const graph = async (companyId) => {

  const searchQuery = `select DATE(a.updated_at), count(distinct a.job_application_id)
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      where j.company_id = $1 and j.job_status_id = '2' and (a.application_status_id = '2' OR a.application_status_id = '3' OR a.application_status_id = '4'
                      OR a.application_status_id = '5' OR a.application_status_id = '6') 
                      group by DATE(a.updated_at)`;
  const selectQuery = `SELECT DATE(l.date_of_activity), count(l.activity_id)
                      FROM ${dbSchema}.logs l
                      left join ${dbSchema}.jobs j on j.job_id = l.activity_id 
                      where j.company_id = $1 and l.activity_name = 'Job View'
                      group by DATE(l.date_of_activity)`;

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
                      FROM ${dbSchema}.job_applicants a
                      left join ${dbSchema}.jobs j on j.job_id = a.job_id
                      left join ${dbSchema}.users u on u.uid = a.candidate_id 
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

// GETHIRED_EMPLOYER_DASHBOARD_WORLD_CLASS_TECHY_REDESIGN_V2 -- one new,
// narrowly-scoped, read-only aggregate for the dashboard's hiring-pipeline
// and applicants-needing-review widgets. No new table, no new tracking --
// composed from job_applicants/jobs/job_applicant_status/users exactly
// like charts()/statistic() above, same company-scoping convention.
// "Needs review" = application_status_id 1 (Pending Review) or 3 (Under
// Review), the two real seed statuses that represent unreviewed work --
// confirmed against the live job_applicant_status table, not assumed.
// Only firstname/lastname are selected from users -- no protected
// attributes (gender/civil_status/date_of_birth exist on that table and
// are deliberately not selected here).
const pipelineOverview = async (companyId) => {
  const stageQuery = `SELECT a.application_status_id, s.job_applicant_status_name, count(*) as count
    FROM ${dbSchema}.job_applicants a
    JOIN ${dbSchema}.jobs j ON j.job_id = a.job_id
    LEFT JOIN ${dbSchema}.job_applicant_status s ON s.job_applicant_status_id = a.application_status_id
    WHERE j.company_id = $1 AND (a.is_archived IS NULL OR a.is_archived = false)
    GROUP BY a.application_status_id, s.job_applicant_status_name
    ORDER BY a.application_status_id;`;

  const needsReviewQuery = `SELECT a.job_application_id, a.application_status_id, a.date_applied,
      j.job_id, j.job_title, u.firstname, u.lastname
    FROM ${dbSchema}.job_applicants a
    JOIN ${dbSchema}.jobs j ON j.job_id = a.job_id
    LEFT JOIN ${dbSchema}.users u ON u.uid = a.candidate_id
    WHERE j.company_id = $1
      AND a.application_status_id IN (1, 3)
      AND (a.is_archived IS NULL OR a.is_archived = false)
    ORDER BY a.date_applied DESC
    LIMIT 10;`;

  try {
    const stages = await dbQuery.query(stageQuery, [companyId]);
    const needsReview = await dbQuery.query(needsReviewQuery, [companyId]);

    return {
      byStage: stages.rows.map((r) => ({
        statusId: r.application_status_id,
        label: r.job_applicant_status_name || "Unknown",
        count: parseInt(r.count, 10),
      })),
      needsReview: needsReview.rows.map((r) => ({
        applicationId: r.job_application_id,
        jobId: r.job_id,
        candidateName: [r.firstname, r.lastname].filter(Boolean).join(" ") || "Candidate",
        jobTitle: r.job_title,
        statusId: r.application_status_id,
        submittedDate: r.date_applied,
      })),
    };
  } catch (error) {
    throw Error("Operation Failed" + error);
  }
};

export {
  companyList,
  companyDetailsById,
  companyDetailsBySlug,
  generateSlug,
  companyUsers,
  assignEmployeeToCompany,
  getCompanyNameByCompanyId,
  getCompanyIdByUserId,
  charts,
  statistic,
  totalContacts,
  graph,
  cities,
  pipelineOverview
};

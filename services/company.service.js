import dbQuery from "../db/dbQuery";
import env from "../env";
import { getCompanyPublishedJobsCount } from "./job.service";

const dbSchema = env.schema;

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

// const shareableLink = async (companyId) => {
//   const company = await companyDetailsById(companyId);
//   const postLink = `/#/companies/details?id=${companyId}`;
//   const link = await createDynamicLink(
//     jobDetails.jobTitle,
//     jobDetails.companyName,
//     jobDetails.logoURL,
//     postLink
//   );

//   successMessage.data = link;
// };

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

export { companyList, companyDetailsById };

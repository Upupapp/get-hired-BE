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

export { companyList };

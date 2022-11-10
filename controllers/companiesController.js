import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import idGenerator from "../helpers/randomNumberForId";

import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const createInitialCompany = async (req, res) => {
  const details = req.body;
  const { uid } = req.user;
  console.log(details);

  try {
    const company = await createCompany(details, uid);

    if (!company) {
      throw "No company created";
    }

    const assigned = await assignEmployeeToCompany(company.companyId, uid, uid);

    if (!assigned) {
      throw "Failed to assign Creator as Employee";
    }

    successMessage.data = company;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getUserCompany = async (id) => {
  const searchQuery = `select c.*, ce.employee_id from ${dbSchema}.company_employees ce 
    left join ${dbSchema}.companies c 
    on c.company_id = ce.company_id 
    where ce.employee_uuid = $1`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [id]);

    if (!rows || rows.length == 0) {
      return [];
    }

    const dbResponse = {
      ...mappedCompany(rows[0]),
      employeedCompanyId: rows[0].employee_id,
    };
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getCompanyDetailsById = async (companyId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.companies WHERE company_id=$1;`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = mappedCompany(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getSpecificCompany = async (req, res) => {
  const { id } = req.query;
  const { uid } = req.user;
  let company = null;
  console.log(id)

  try {
    if (!id || id == '') {
      console.log('dapat dito')
      company = await getUserCompany(uid);
    } else {
      company = await getCompanyDetailsById(id);
    }

    const dbResponse = company;
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
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

const createCompany = async (company, uid) => {
  console.log(company);
  let rawUrl = "";
  const companyId = idGenerator(6, "COM");

  const insertQuery = `INSERT INTO ${dbSchema}.companies
  (company_id, company_logo, company_name, company_details, industry_id, work_setup_id, number_of_employee, company_email, company_city, company_contact_number, company_country, company_address, created_date, created_by)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning *;`;

  const {
    companyLogoFile,
    companyName,
    companyDetails,
    industryId,
    workSetupId,
    numberOfEmployee,
    companyEmail,
    companyCity,
    companyContactNumber,
    companyCountry,
    companyAddress,
  } = company;

  if (companyLogoFile && companyLogoFile != "") {
    rawUrl = await uploadInStorage(
      "Company-Logo",
      `${companyId}-Logo`,
      companyLogoFile
    );
  }

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      companyId,
      rawUrl,
      companyName,
      companyDetails,
      industryId,
      workSetupId,
      numberOfEmployee,
      companyEmail,
      companyCity,
      companyContactNumber,
      companyCountry,
      companyAddress,
      now,
      uid,
    ]);

    if (rows && rows.length == 0) {
      throw "Failed to create Company";
    }

    const dbResponse = mappedCompany(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedCompany = (raw) => {
  return {
    companyId: raw.company_id,
    companyLogoUrl: raw.company_logo,
    companyName: raw.company_name,
    companyDetails: raw.company_details,
    industryId: raw.industry_id,
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

export {
  createCompany,
  assignEmployeeToCompany,
  createInitialCompany,
  getUserCompany,
  getSpecificCompany,
};

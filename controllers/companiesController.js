import { successMessage, errorMessage, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import idGenerator from "../helpers/randomNumberForId";
import { getIdByEmail } from "../helpers/userDetails";
import { industryList, setupList } from "./jobsController";

import { companyList, companyDetailsById } from "../services/company.service";

import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;
const now = new Date();

const createInitialCompany = async (req, res) => {
  const details = req.body;
  const { uid } = req.user;

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

const updateCompany = async (req, res) => {
  const updateQuery = `UPDATE gethired.companies
  SET company_logo=$1, company_name=$2, company_details=$3, industry_id=$4, work_setup_id=$5, number_of_employee=$6, company_email=$7, company_city=$8, company_contact_number=$9, company_country=$10, company_address=$11
  WHERE company_id=$12 returning *;`;
  let rawUrl = "";

  const {
    companyId,
    companyEmail,
    companyContactNumber,
    companyAddress,
    companyCity,
    companyCountry,
    companyLogoUrl,
    companyName,
    companyDetails,
    industryId,
    workSetupId,
    numberOfEmployee,
    companyLogoFile,
  } = req.body;

  try {
    if (companyLogoFile && companyLogoFile != "") {
      rawUrl = await uploadInStorage(
        "Company-Logo",
        `${companyId}-Logo`,
        companyLogoFile
      );
    } else {
      rawUrl = companyLogoUrl;
    }

    const { rows } = await dbQuery.query(updateQuery, [
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
      companyId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to Update";
    }

    const dbResponse = mappedCompany(rows[0]);
    successMessage.data = dbResponse;
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



const getSpecificCompany = async (req, res) => {
  const { id } = req.query;
  let company = {};
  console.log(id);

  try {
    if (!id || id == "") {
      const { uid } = req.user;
      company = await getUserCompany(uid);
    } else {
      company = await companyDetailsById(id);
    }

    successMessage.data = company;
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

const getDashboard = async (req, res) => {
  const { uid } = req.user;

  try {
    const userCompany = await getUserCompany(uid);

    const dbResponse = {
      company: userCompany,
      charts: {
        activeJobs: 0,
        applicants: 0,
        interviews: 0,
      },
      statistic: {
        totalHired: 0,
        totalIncrease: 0,
        interviewAppointments: 0,
      },
    };

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getIndustryListCompany = async (req, res) => {
  try {
    const industries = await industryList();
    successMessage.data = industries;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getSetupListCompany = async (req, res) => {
  try {
    const setup = await setupList();
    successMessage.data = setup;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
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

const removeCompanyUser = async (req, res) => {
  const { userId, companyId } = req.body;
  const deleteQuery = `DELETE FROM ${dbSchema}.company_employees
  WHERE employee_uuid='${userId}' and company_id='${companyId}'`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, []);

    successMessage.data = "Company user has been removed";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getAllCompanyUser = async (req, res) => {
  const { uid } = req.user;
  const searchQuery = `SELECT * FROM ${dbSchema}.company_employees ce JOIN ${dbSchema}.users u ON ce.employee_uuid = u.uid WHERE ce.employee_uuid = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [uid]);
    const dbResponse = rows.map((row) => mappedCompanyUser(row));
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const addCompanyUser = async (email) => {
  const { uid } = req.user;
  console.log(email);
  try {
    const id = await getIdByEmail(email);

    if (!id) {
      throw "No user id get";
    }

    const company = await getUserCompany(uid);

    if (!company.companyId) {
      throw "User has no company";
    }

    const assigned = await assignEmployeeToCompany(company.companyId, id, uid);

    if (!assigned) {
      throw "Failed to assign Creator as Employee";
    }

    successMessage.data = assigned;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    throw error;
  }
};

const getFeaturedCompanies = async (req, res) => {
  const isFeatured = true;

  try {
    const featured = await companyList(isFeatured);
    const latest = await companyList(!isFeatured);
    
    successMessage.data = featured.length != 0 ? featured : latest;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const mappedCompanyUser = (raw) => {
  return {
    employeeId: raw.employee_id,
    companyId: raw.company_id,
    employeeUuid: raw.employee_uuid,
    assignedAt: raw.assigned_at,
    updatedAt: raw.updated_at,
    positionId: raw.position_id,
    assignedBy: raw.assigned_by,
    uId: raw.uid,
    firstName: raw.firstname,
    middleName: raw.middlename,
    lastName: raw.lastname,
    address: raw.address,
    city: raw.city,
    zip: raw.zip,
    phoneNumber: raw.phone_number,
    cellNumber: raw.cell_number,
    photoUrl: raw.photo_url,
    dateOfBirth: raw.date_of_birth,
    isProfileUpdated: raw.is_profile_updated,
    updateAt: raw.updated_at,
    gender: raw.gender,
    civilStatus: raw.civil_status,
    state: raw.state,
    country: raw.country,
    email: raw.email,
  };
};

export {
  createCompany,
  assignEmployeeToCompany,
  createInitialCompany,
  getUserCompany,
  getSpecificCompany,
  updateCompany,
  getDashboard,
  removeCompanyUser,
  getAllCompanyUser,
  addCompanyUser,
  getSetupListCompany,
  getIndustryListCompany,
  getFeaturedCompanies,
};

import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import env from "../env";

const dbSchema = env.schema;

const createCompany = async (req, res) => {
  const logo = req.body.logoFile;
  const logoName = "logo-" + req.body.companyCode;
  let logoURL = "";
  const {
    companyName,
    description,
    companyCode,
    city,
    country,
    natureOfBusiness,
    contactNumber,
    creator_id,
    contactPerson,
    companyEmail,
  } = req.body;

  if (logo && logo.length !== 0) {
    logoURL = await uploadInStorage("Company-logo", logoName, logo);
  }

  try {
    const userRole = await getUserRole(creator_id);

    const insertQuery = `INSERT INTO ${dbSchema}.company
    (companyname, description, companycode, city, country, natureofbusiness, contactnumber, creator_id, createddate, logourl, contactperson, company_email)
    values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp, $9, $10, $11) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      companyName,
      description,
      companyCode,
      city,
      country,
      natureOfBusiness,
      contactNumber,
      creator_id,
      logoURL,
      contactPerson,
      companyEmail,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Create Company";
      return res.status(status.error).send(errorMessage);
    }

    if (userRole.roleid == 2) {
      const assign = await assignCompany(dbResponse.company_id, creator_id);

      if (!assign) {
        errorMessage.data = "Failed to save company to your Account";
        return res.status(status.error).send(errorMessage);
      }

      successMessage.data = [assign ? await mappedCompany(assign) : assign];
      return res.status(status.success).send(successMessage);
    }

    const companies = await getUsersCompanies(creator_id);

    successMessage.data = companies;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getAllCreatedCompanies = async (req, res) => {
  const user_id = req.query.user_id;

  try {
    const companies = await getUsersCompanies(user_id);

    const dbResponse = companies;

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getSpecificCompany = async (req, res) => {
  const company_id = req.params.company_id;
  try {
    const company = await getCompanyDetails(company_id);

    successMessage.data = company;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateCompany = async (req, res) => {
  const logo = req.body.logoFile;
  const logoName = "logo-" + req.body.companyCode;
  let logoURL = "";

  const {
    companyName,
    description,
    city,
    country,
    natureOfBusiness,
    contactNumber,
    contactPerson,
    companyEmail,
    companyId,
    creator_id,
  } = req.body;

  if (logo && logo.length !== 0) {
    logoURL = await uploadInStorage("images", logoName, logo);
  } else {
    logoURL = req.body.logoURL;
  }

  try {
    const updateQuery = `UPDATE ${dbSchema}.company
        SET companyname=$1, description=$2, city=$3, country=$4, natureofbusiness=$5, contactnumber=$6, logourl=$7, contactperson=$8, company_email=$9
        WHERE company_id =$10 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      companyName,
      description,
      city,
      country,
      natureOfBusiness,
      contactNumber,
      logoURL,
      contactPerson,
      companyEmail,
      companyId,
    ]);

    const dbResponse = rows[0];

    if (!dbResponse) {
      errorMessage.error = "Failed to Update Company";
      return res.status(status.error).send(errorMessage);
    }

    const companies = await getUsersCompanies(creator_id);
    successMessage.data = companies;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const deleteCompany = async (req, res) => {
  const { companyId, creatorId } = req.query;
  const deleteQuery = `DELETE FROM ${dbSchema}.company WHERE company_id = $1`;

  try {
    const company = await getCompanyDetails(companyId);

    if (!company || company.length == 0) {
      errorMessage.data = "Company does not exist";
      return res.status(status.error).send(data);
    }

    const { rows } = await dbQuery.query(deleteQuery, [companyId]);

    const companies = await getUsersCompanies(creatorId);

    successMessage.data = companies;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const changeCompanyLogo = async (req, res) => {
  const { logoFile, companyId, companyCode } = req.body;
  const logoName = "logo-" + companyCode;
  let logoURL = "";

  const updateQuery = `
    UPDATE ${dbSchema}.company
    SET logourl=$1
    WHERE company_id=$2`;

  try {
    if (logoFile && logoFile.length !== 0) {
      logoURL = await uploadInStorage("images", logoName, logoFile);
    }

    const { rows } = await dbQuery.query(updateQuery, [logoURL, companyId]);

    if (!rows) {
      errorMessage.data = "Failed to update logo";
      return res.status(status.error).send(errorMessage);
    }

    successMessage.data = logoURL;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

/** Helper Functions */

// User as admin
const getUsersCompanies = async (userId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.company where creator_id = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [userId]);
    const dbResponse =
      rows.length > 0
        ? rows.map((dbResponse) => mappedCompany(dbResponse))
        : rows;

    const companies = dbResponse;
    return companies;
  } catch (error) {
    throw Error("Failed to retrieve Companies");
  }
};

const assignCompany = async (companyId, userId) => {
  const insertQuery = `Insert into ${dbSchema}.company_employer(company_id, employer_id) values($1, $2) returning *`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [companyId, userId]);

    const dbResponse = rows.length > 0 ? await mappedCompany(rows[0]) : rows;

    return dbResponse;
  } catch (error) {
    throw Error("Failed to create Company");
  }
};

const getCompanyDetails = async (companyId) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.company where company_id = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [companyId]);
    const dbResponse = rows.length > 0 ? await mappedCompany(rows[0]) : rows;

    return dbResponse;
  } catch (err) {
    throw Error("Company: " + err);
  }
};

const mappedCompany = (dbResponse) => {
  if (dbResponse) {
    return {
      companyId: dbResponse.company_id,
      companyName: dbResponse.companyname,
      description: dbResponse.description,
      companyCode: dbResponse.companycode,
      city: dbResponse.city,
      country: dbResponse.country,
      natureOfBusiness: dbResponse.natureofbusiness,
      contactNumber: dbResponse.contactnumber,
      creator_id: dbResponse.creator_id,
      logoURL: dbResponse.logourl,
      contactPerson: dbResponse.contactperson,
      companyEmail: dbResponse.company_email,
      createdDate: dbResponse.createddate,
    };
  }

  return dbResponse;
};

const getUserRole = async (userId) => {
  const searchQuery = `Select roleid from ${dbSchema}.usercredentials where user_id = $1`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [userId]);

    const dbResponse = rows[0];

    return dbResponse;
  } catch (error) {
    throw Error("Failed to create Company");
  }
};

const getNumberOfCompanies = async (req, res) => {
  const creatorId = req.body.creatorId;
  const searchQuery = `SELECT * FROM ${dbSchema}.company where creator_id = $1`;
  try {
    const { rows } = await dbQuery.query(searchQuery, [creatorId]);
    const dbResponse = rows.map((dbResponse) => mappedCompany(dbResponse));
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getAllCompanies = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.company`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((row) => mappedCompany(row));

    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export {
  createCompany,
  getAllCreatedCompanies,
  getSpecificCompany,
  deleteCompany,
  updateCompany,
  changeCompanyLogo,
  getUsersCompanies,
  assignCompany,
  getAllCompanies,
  getNumberOfCompanies,
};

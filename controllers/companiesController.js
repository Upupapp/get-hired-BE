import { successResponse, errorResponse, status } from "../helpers/status";
import uploadInStorage from "../helpers/uploader";
import idGenerator from "../helpers/randomNumberForId";
import { getIdByEmail } from "../helpers/userDetails";
import { industryList } from "./jobsController";
import {
  checkUserIfExistInFirebase,
  registerNewUserInFirebase,
  createDynamicLink,
  getForgetPwLinkInFirebase,
} from "../helpers/firebaseFunctions";
import crypto from "crypto";

import {
  hashPassword,
  comparePassword,
  isValidEmail,
  isEmpty,
  validatePassword,
} from "../helpers/validation";
import { send } from "../helpers/mailer";

import { registerUserInDB, getVerification } from "./userController";
import {
  companyList,
  companyDetailsById,
  companyUsers,
  assignEmployeeToCompany,
  getCompanyNameByCompanyId,
  charts,
  getCompanyIdByUserId,
  statistic,
  totalContacts,
  graph,
  cities,
  pipelineOverview,
} from "../services/company.service";

import { contactList } from "../services/contact.service";
import {
  companySubscriptions,
  createCompanySubscription,
} from "../controllers/subscriptionController";

import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const createInitialCompany = async (req, res) => {
  const { companyName, companyEmail } = req.body;
  const { uid } = req.user;

  try {
    const company = await createBasicCompany(companyName, companyEmail, uid);

    if (!company) {
      throw "No company created";
    }

    const assigned = await assignEmployeeToCompany(company.companyId, uid, uid);

    if (!assigned) {
      throw "Failed to assign Creator as Employee";
    }

    return res.status(status.success).json(successResponse(company));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const createCompanyFull = async (req, res) => {
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

    return res.status(status.success).json(successResponse(company));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateCompany = async (req, res) => {
  const updateQuery = `UPDATE ${dbSchema}.companies
  SET company_logo=$1, company_name=$2, company_details=$3, industry_id=$4, work_setup_id=$5, number_of_employee=$6, company_email=$7, company_city=$8, company_contact_number=$9, company_country=$10, company_address=$11,
  company_state=$12, company_mapurl=$13, company_suburb=$14, company_zip=$15, company_address_one=$16
  WHERE company_id=$17 returning *;`;

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
    companyState,
    companyTown,
    companyZip,
    companyMapUrl,
    companyAddressOne,
  } = req.body;

  try {
    // SECURE fix (BOLA): this route previously had no auth middleware AND
    // trusted companyId straight from the request body, letting any caller
    // update any company's profile. Confirm the authenticated caller
    // actually belongs to the company being updated.
    // QA8 FIX-8: added Array.isArray guard — getUserCompany returns [] (not null)
    // when no company row exists, so the prior !userCompany check alone would
    // have passed for a caller with no company ([] is truthy).
    const userCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

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
      companyState,
      companyTown,
      companyZip,
      companyMapUrl,
      companyAddressOne,
      companyId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to Update";
    }

    const dbResponse = mappedCompany(rows[0]);
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getUserCompany = async (id) => {
  const searchQuery = `select
    c.*, ce.employee_id, i.industry_name as company_industry_name
    from ${dbSchema}.company_employees ce
      left join ${dbSchema}.companies c
      on c.company_id = ce.company_id
      LEFT JOIN ${dbSchema}.industry i
      on c.industry_id = i.industry_id
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

// PERF-01: request-scoped cache for getUserCompany.
// Stores a pending Promise on first miss so concurrent same-uid calls
// within one request share a single DB round-trip (singleflight pattern).
// Cache lives on req.getHiredRequestCache and is discarded with the request.
// The original getUserCompany() is preserved for non-request contexts
// (services without req, scripts, tests).
const getRequestCache = (req) => {
  if (!req.getHiredRequestCache) {
    req.getHiredRequestCache = new Map();
  }
  return req.getHiredRequestCache;
};

const getUserCompanyForRequest = (req, uid) => {
  if (!uid) {
    return getUserCompany(uid);
  }
  const cache = getRequestCache(req);
  const key = 'getUserCompany:' + uid;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const promise = getUserCompany(uid).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
};

const getSpecificCompany = async (req, res) => {
  const { id } = req.query;
  let company = {};

  try {
    if (!id || id == "") {
      const { uid } = req.user;

      company = await getUserCompanyForRequest(req, uid);
    } else {
      company = await companyDetailsById(id);
    }

    return res.status(status.success).json(successResponse(company));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const createBasicCompany = async (companyName, companyEmail, userId) => {
  const companyId = idGenerator(6, "COM");
  const insertQuery = `INSERT INTO ${dbSchema}.companies
  (company_id, company_name, company_email, created_at, created_by)
  VALUES($1, $2, $3, $4, $5) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      companyId,
      companyName,
      companyEmail,
      new Date(),
      userId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to create company";
    }

    const dbResponse = mappedCompany(rows[0]);

    const subs = await createCompanySubscription(dbResponse.companyId, 1);

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const createCompany = async (company, uid) => {
  let rawUrl = "";
  const companyId = idGenerator(6, "COM");

  const insertQuery = `INSERT INTO ${dbSchema}.companies
  (company_id, company_logo, company_name, company_details, industry_id, work_setup_id, number_of_employee, company_email, company_city, company_contact_number, company_country, company_address, created_at, created_by, 
  company_state, company_mapurl, company_suburb, company_zip, company_address_one)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) returning *;`;

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
    companyState,
    companyTown,
    companyZip,
    companyMapUrl,
    companyAddressOne,
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
      new Date(),
      uid,
      companyState,
      companyTown,
      companyZip,
      companyMapUrl,
      companyAddressOne,
    ]);

    if (!rows && rows.length == 0) {
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
    const userCompany = await getUserCompanyForRequest(req, uid);
    const chart = await charts(userCompany.companyId);
    const statistics = await statistic(userCompany.companyId);
    const totalContact = await totalContacts(userCompany.companyId);
    const graphList = await graph(userCompany.companyId);
    const cityList = await cities(userCompany.companyId);
    const contact = await contactList(userCompany.companyId);
    const dbResponse = {
      company: userCompany,
      charts: chart,
      statistic: statistics,
      ...graphList,
      ...cityList,
      totalContacts: contact.length,
    };

    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// GETHIRED_EMPLOYER_DASHBOARD_WORLD_CLASS_TECHY_REDESIGN_V2 -- new,
// narrowly-scoped endpoint for the dashboard's hiring-pipeline and
// applicants-needing-review widgets. Same getUserCompany() pattern as
// getDashboard() above; defensively checks for the [] no-company shape
// (getUserCompany returns an array, not null, when no row exists) rather
// than letting a stray undefined companyId silently reach the query.
const getDashboardPipelineOverview = async (req, res) => {
  const { uid } = req.user;

  try {
    const userCompany = await getUserCompanyForRequest(req, uid);
    if (!userCompany || Array.isArray(userCompany)) {
      return res.status(status.unauthorized).send({
        status: "error",
        error: "No company found for this account.",
      });
    }

    const overview = await pipelineOverview(userCompany.companyId);
    return res.status(status.success).json(successResponse(overview));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getIndustryListCompany = async (req, res) => {
  try {
    const industries = await industryList();
    return res.status(status.success).json(successResponse(industries));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// const getSetupListCompany = async (req, res) => {
//   try {
//     const setup = await setupList();
//     successMessage.data = setup;
//     return res.status(status.success).send(successMessage);
//   } catch (error) {
//     console.error('[companiesController] error:', error);
//     errorMessage.error = "Operation not successful. Please try again.";
//     return res.status(status.error).send(errorMessage);
//   }
// };

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
    companyIndustryName: raw.company_industry_name,
    companyState: raw.company_state,
    companyMapUrl: raw.company_mapurl,
    companyTown: raw.company_suburb,
    companyZip: raw.company_zip,
    companyAddressOne: raw.company_address_one,
    withActiveSubscription: raw.with_active_subscription,
  };
};

const removeCompanyUser = async (req, res) => {
  const { userId, companyId } = req.body;
  // Parameterized, not string-interpolated -- STITCH fix (SQL injection).
  const deleteQuery = `DELETE FROM ${dbSchema}.company_employees
  WHERE employee_uuid=$1 and company_id=$2`;
  try {
    // SECURE fix (BOLA): this route previously had no auth middleware at
    // all -- anyone could remove any user from any company. Confirm the
    // authenticated caller belongs to the company they're modifying.
    // QA9 FIX-9: added Array.isArray guard — getUserCompany returns [] (not null)
    // when no company row exists, so the prior !callerCompany check alone would
    // have passed for a caller with no company ([] is truthy).
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || callerCompany.companyId !== companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const { rows } = await dbQuery.query(deleteQuery, [userId, companyId]);

    return res.status(status.success).json(successResponse("Company user has been removed"));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getAllCompanyUser = async (req, res) => {
  const { id } = req.query;

  try {
    const users = await companyUsers(id);
    return res.status(status.success).json(successResponse(users));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const addCompanyUser = async (req, res) => {
  const { emails } = req.body;
  const { uid } = req.user;

  try {
    // QA9 FIX-3 BOLA: derive companyId from JWT, never from req.body —
    // any employer could otherwise add users to a different company by
    // supplying a spoofed companyId.
    const callerCompany = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    const userStatus = await Promise.all(
      await emails.map(async (item) => {
        const adding = await addCompanyUserByEmail(item.email, companyId, uid);
        return {
          email: item.email,
          status: adding.status,
          msg: adding.msg,
        };
      })
    );

    return res.status(status.success).json(successResponse({
      companyId,
      emails: userStatus,
    }));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const addCompanyUserByEmail = async (email, companyId, uid) => {
  try {
    const userInFirebase = await checkUserIfExistInFirebase(email);

    if (userInFirebase && userInFirebase.length !== 0) {
      return {
        msg: "Email already a user.",
        status: "failed",
      };
    }

    // Random per-invite password, never shown to the user -- they set their
    // own via the Firebase password-reset link sent below.
    // STITCH/security fix (GH-ACT-004): this used to be the same hardcoded
    // literal (`p@ssw0rd1111`) for every invited user, emailed in cleartext.
    const password = crypto.randomBytes(24).toString("base64");

    const user = {
      email,
      password,
      firstName: "Temp",
      lastName: "User",
      role: 2,
    };

    const userData = await registerNewUserInFirebase(user);

    const dbData = {
      uid: userData.uid,
      email: userData.email,
      password: hashPassword(password),
      firstname: user.firstName,
      lastname: user.lastName,
      role: 2,
    };

    const dbRegister = await registerUserInDB(dbData);

    if (!userData || !dbRegister) {
      return {
        msg: "Failed to Create credentials",
        status: "failed",
      };
    }

    const isVerified = await getVerification(email, user.firstName);

    const assigned = await assignEmployeeToCompany(
      companyId,
      userData.uid,
      uid
    );

    if (!assigned) {
      return {
        msg: "Failed to assign User to a Company",
        status: "failed",
      };
    }

    const companyName = await getCompanyNameByCompanyId(companyId);

    // Send a real Firebase password-reset link instead of a literal
    // password -- the invited user sets their own password before they can
    // log in. STITCH/security fix (GH-ACT-004).
    const resetLink = await getForgetPwLinkInFirebase(email);

    send(email, "add_user", {
      login_url: `${env.app_url}/signin`,
      reset_link: resetLink,
      name: userData.firstname,
      company: companyName,
      email,
    });

    return {
      msg: "Successfully added",
      status: "success",
    };
  } catch (error) {
    console.error('[companiesController] addCompanyUserByEmail error:', error);
    return {
      msg: "Failed to add user",
      status: "failed",
    };
  }
};

const getFeaturedCompanies = async (req, res) => {
  const isFeatured = true;

  try {
    const featured = await companyList(isFeatured);
    const latest = await companyList(!isFeatured);

    return res.status(status.success).json(successResponse(featured.length != 0 ? featured : latest));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getCompanyShareableLink = async (req, res) => {
  const { id } = req.query;

  try {
    const company = await companyDetailsById(id);
    const postLink = `/companies/details?id=${id}`;
    const link = await createDynamicLink(
      company.companyName,
      "View all job posted by visiting this link",
      company.companyLogoUrl,
      postLink
    );
    return res.status(status.success).json(successResponse(link));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getSubscriptionRestrictions = async (req, res) => {
  try {
    // QA10 FIX-11 BOLA: derive companyId from JWT, never from query param —
    // any authenticated employer could read another company's subscription
    // metadata by supplying a different companyId.
    const callerCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const companyId = callerCompany.companyId;

    const dbResponse = await companySubscriptions(companyId);

    if (dbResponse.length == 0) {
      throw "Company is not subscribed to any plan";
    }

    return res.status(status.success).json(successResponse(dbResponse[0]));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getAllCompanies = async (req, res) => {
  const seachrQuery = `SELECT company_id, company_name FROM ${dbSchema}.companies`;
  try {
    const { rows } = await dbQuery.query(seachrQuery, []);
    const dbResponse = rows.map((row) => {
      return {
        companyId: row.company_id,
        companyName: row.companyName,
      };
    });
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getUserCompanyByEmail = async (email) => {
  const searchQuery = `Select company_id from ${dbSchema}.company_employees ce
    left join ${dbSchema}.user_credentials uc
    on ce.employee_uuid=uc.uid where uc.email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);

    if (!rows || rows.length == 0) {
      return null;
    }
    return rows[0].company_id;
  } catch (error) {
    throw error;
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
  createInitialCompany,
  getUserCompany,
  getUserCompanyForRequest,
  getSpecificCompany,
  updateCompany,
  getDashboard,
  getDashboardPipelineOverview,
  removeCompanyUser,
  getAllCompanyUser,
  addCompanyUser,
  // getSetupListCompany,
  getIndustryListCompany,
  getFeaturedCompanies,
  getCompanyShareableLink,
  getSubscriptionRestrictions,
  getAllCompanies,
  getUserCompanyByEmail,
  createCompanyFull,
  createBasicCompany,
};

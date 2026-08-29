import { successResponse, errorResponse, status } from "../helpers/status";
import { getAccessContextForRequest, hasPermission } from "../services/accessControl.service";
import { removeTeamMember as removeTeamMemberById } from "../services/teamAccess.service";
import uploadInStorage, { uploadImageWithOptimization } from "../helpers/uploader";
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
import { insertLogs } from "../services/user.service";
import {
  companyList,
  companyDetailsById,
  companyDetailsBySlug,
  generateSlug,
  generateUniqueSlug,
  assertCompanyNameAvailable,
  DuplicateCompanyNameError,
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

// COMPANY DUPLICATION FIX: matches updateCompany's existing fieldErrors
// response shape (400, feedback.state='validation_error') so the frontend's
// already-built field-error UI (company-details-form.component.ts
// afterError()) handles a duplicate name on CREATE the same way it already
// handles one on UPDATE, with no new frontend branch needed.
const duplicateNameFieldErrorResponse = (res, error) => {
  return res.status(400).json({
    status: 'error',
    error: 'Please review the highlighted fields.',
    fieldErrors: { companyName: error.message },
    feedback: {
      state: 'validation_error',
      title: 'Some details need a quick check',
      body: 'We found fields that need to be fixed before saving.',
      primaryCta: 'Review fields',
    },
  });
};

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
    if (error instanceof DuplicateCompanyNameError) {
      return duplicateNameFieldErrorResponse(res, error);
    }
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
    if (error instanceof DuplicateCompanyNameError) {
      return duplicateNameFieldErrorResponse(res, error);
    }
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const _isValidEmail = function(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const updateCompany = async (req, res) => {
  const updateQuery = `UPDATE ${dbSchema}.companies
  SET company_logo=$1, company_name=$2, company_details=$3, industry_id=$4, work_setup_id=$5, number_of_employee=$6, company_email=$7, company_city=$8, company_contact_number=$9, company_country=$10, company_address=$11,
  company_state=$12, company_mapurl=$13, company_suburb=$14, company_zip=$15, company_address_one=$16, shown_publicly=$17, company_slug=$18
  WHERE company_id=$19 returning *;`;

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
    shownPublicly,
  } = req.body;

  try {
    // BOLA guard: derive authoritative companyId from the JWT, never from
    // the request body. Array.isArray guard: getUserCompany returns [] (not
    // null) when no company row exists, and [] is truthy.
    const userCompany = await getUserCompanyForRequest(req, req.user.uid);
    if (Array.isArray(userCompany) || !userCompany || userCompany.companyId !== companyId) {
      return res.status(403).json({
        status: 'error',
        error: "You don't have permission to update this company profile.",
        code: 'forbidden',
      });
    }

    // Field validation
    var fieldErrors = {};
    var trimmedName  = (companyName && typeof companyName === 'string')  ? companyName.trim()  : '';
    var trimmedEmail = (companyEmail && typeof companyEmail === 'string') ? companyEmail.trim() : '';

    if (!trimmedName) {
      fieldErrors.companyName = 'Company name is required.';
    } else if (trimmedName.length > 200) {
      fieldErrors.companyName = 'Company name must be 200 characters or fewer.';
    }

    if (!trimmedEmail) {
      fieldErrors.companyEmail = 'Contact email is required.';
    } else if (!_isValidEmail(trimmedEmail)) {
      fieldErrors.companyEmail = 'Enter a valid email address.';
    }

    if (companyDetails && typeof companyDetails === 'string' && companyDetails.length > 1000) {
      fieldErrors.companyDetails = 'About section must be 1000 characters or fewer.';
    }

    if (numberOfEmployee !== undefined && numberOfEmployee !== null && numberOfEmployee !== '') {
      var numEmp = parseInt(numberOfEmployee, 10);
      if (isNaN(numEmp) || numEmp < 0 || numEmp > 1000000) {
        fieldErrors.numberOfEmployee = 'Enter a valid number of employees (0 – 1,000,000).';
      }
    }

    // COMPANY DUPLICATION FIX: renaming to a name another company already
    // has was previously unchecked (this is also where every existing
    // duplicate's slug got silently regenerated from an already-colliding
    // name, on every edit). excludeCompanyId=companyId so a company saving
    // its own unchanged name never collides with itself.
    if (trimmedName) {
      try {
        await assertCompanyNameAvailable(trimmedName, companyId);
      } catch (dupErr) {
        if (dupErr instanceof DuplicateCompanyNameError) {
          fieldErrors.companyName = dupErr.message;
        } else {
          throw dupErr;
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Please review the highlighted fields.',
        fieldErrors: fieldErrors,
        feedback: {
          state: 'validation_error',
          title: 'Some details need a quick check',
          body: 'We found fields that need to be fixed before saving.',
          primaryCta: 'Review fields',
        },
      });
    }

    if (companyLogoFile && companyLogoFile != "") {
      rawUrl = await uploadImageWithOptimization(
        "Company-Logo",
        companyId + "-Logo",
        companyLogoFile,
        "company_logo",
        { ownerType: "company", ownerId: companyId, companyId: companyId, createdBy: req.user.uid }
      );
    } else {
      rawUrl = companyLogoUrl;
    }

    const { rows } = await dbQuery.query(updateQuery, [
      rawUrl,
      trimmedName,
      companyDetails,
      industryId,
      workSetupId,
      numberOfEmployee,
      trimmedEmail,
      companyCity,
      companyContactNumber,
      companyCountry,
      companyAddress,
      companyState,
      companyMapUrl,
      companyTown,
      companyZip,
      companyAddressOne,
      shownPublicly === true || shownPublicly === 'true',
      await generateUniqueSlug(trimmedName, companyId),
      companyId,
    ]);

    if (!rows || rows.length === 0) {
      throw new Error("Failed to Update");
    }

    const dbResponse = mappedCompany(rows[0]);
    console.log('[company.update] success | actor=' + (req.user && req.user.uid || 'unknown') + ' | companyId=' + companyId);

    return res.status(status.success).json(Object.assign({}, successResponse(dbResponse), {
      feedback: {
        state: 'success',
        title: 'Company profile updated',
        body: 'Your company details are saved and ready for your hiring workspace.',
        syncNote: 'Changes synced across your recruiter dashboard and company profile.',
        primaryCta: 'Continue editing',
        secondaryCta: 'Back to dashboard',
      },
    }));
  } catch (error) {
    console.error('[company.update] error | companyId=' + companyId + ' |', error);
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
      // Public route (/company/details without ?id) has no verifyAuth middleware.
      // Guard against crash when req.user is absent.
      if (!req.user || !req.user.uid) {
        return res.status(401).json(errorResponse("Authentication required."));
      }
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
  // COMPANY DUPLICATION FIX: reject an exact (case/whitespace-insensitive)
  // name match before creating anything -- previously unrestricted, which
  // is how this app ended up with multiple companies sharing one name/slug.
  await assertCompanyNameAvailable(companyName);

  const companyId = idGenerator(6, "COM");
  const slug = await generateUniqueSlug(companyName);
  const insertQuery = `INSERT INTO ${dbSchema}.companies
  (company_id, company_name, company_email, created_at, created_by, company_slug)
  VALUES($1, $2, $3, $4, $5, $6) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      companyId,
      companyName,
      companyEmail,
      new Date(),
      userId,
      slug,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to create company";
    }

    const dbResponse = mappedCompany(rows[0]);

    // Non-fatal audit trail (reuses the existing gethired.logs table via
    // insertLogs -- no new table/migration). A logging failure must never
    // block company setup, matching the same non-fatal posture as the
    // subscription step below.
    try {
      await insertLogs("Company Setup Completed", userId, dbResponse.companyId);
    } catch (logErr) {
      console.warn('[companiesController] createBasicCompany: setup-completed log skipped:', logErr && logErr.code);
    }

    // Non-fatal: subscription table may not exist yet on this environment.
    // Company creation succeeds regardless; subscription can be applied later.
    try {
      await createCompanySubscription(dbResponse.companyId, 1);
      try {
        await insertLogs("Trial Activated", userId, dbResponse.companyId);
      } catch (logErr) {
        console.warn('[companiesController] createBasicCompany: trial-activated log skipped:', logErr && logErr.code);
      }
    } catch (subErr) {
      console.warn('[companiesController] createBasicCompany: subscription step skipped:', subErr && subErr.code);
    }

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const createCompany = async (company, uid) => {
  // COMPANY DUPLICATION FIX: same guard as createBasicCompany, checked
  // before the logo upload so a rejected duplicate never wastes a storage
  // write.
  await assertCompanyNameAvailable(company && company.companyName);

  let rawUrl = "";
  const companyId = idGenerator(6, "COM");

  const insertQuery = `INSERT INTO ${dbSchema}.companies
  (company_id, company_logo, company_name, company_details, industry_id, work_setup_id, number_of_employee, company_email, company_city, company_contact_number, company_country, company_address, created_at, created_by,
  company_state, company_mapurl, company_suburb, company_zip, company_address_one, company_slug)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) returning *;`;

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
      companyMapUrl,
      companyTown,
      companyZip,
      companyAddressOne,
      await generateUniqueSlug(companyName),
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
    // SECURITY FIX (zero-scope/null-context remediation, same root cause as
    // contactsController.js's list endpoint): contactList's array mixes
    // company-wide unscoped contacts with genuinely job-tied ones
    // (searchQuery2/searchQuery3) -- totalContacts previously reflected the
    // full unscoped count regardless of the caller's own job scope, an
    // aggregate-count leak of the same data-flow issue, not a separate one.
    const accessCtx = await getAccessContextForRequest(req, uid);
    const contact = await contactList(userCompany.companyId, accessCtx);
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

    const accessCtx = await getAccessContextForRequest(req, uid);
    const overview = await pipelineOverview(userCompany.companyId, accessCtx);
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
    shownPublicly: raw.shown_publicly === true,
    slug: raw.company_slug || generateSlug(raw.company_name),
  };
};

// Job-scoped RBAC V3 alignment (2026-08-13): this legacy route had NO
// team.manage permission check and NO last-owner protection -- confirmed
// live during V1 verification that a no_job_access member could remove any
// other member, including the sole Owner, entirely bypassing the new
// Team & Access authorization model. Fixed by delegating the actual removal
// to teamAccess.service.js's removeTeamMember (single source of truth for
// last-owner protection + audit logging), rather than duplicating that
// logic here. Legacy request shape uses employee_uuid ($userId), the new
// service expects employee_id (the company_employees PK) -- resolved below.
const removeCompanyUser = async (req, res) => {
  const { userId, companyId } = req.body;
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

    const accessCtx = await getAccessContextForRequest(req, req.user.uid);
    if (!hasPermission(accessCtx, "team.manage")) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }

    const { rows: memberRows } = await dbQuery.query(
      `SELECT employee_id FROM ${dbSchema}.company_employees WHERE employee_uuid = $1 AND company_id = $2`,
      [userId, companyId]
    );
    if (!memberRows || memberRows.length === 0) {
      return res.status(status.notfound).json(errorResponse("Not found."));
    }

    await removeTeamMemberById(companyId, memberRows[0].employee_id, { uid: req.user.uid, email: req.user.email });

    return res.status(status.success).json(successResponse("Company user has been removed"));
  } catch (error) {
    if (error && error.code === "CANNOT_REMOVE_LAST_OWNER") {
      return res.status(status.bad).json(errorResponse("You can't remove the last remaining Owner."));
    }
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// Job-scoped RBAC V3 alignment (2026-08-13): gated with team.view for
// consistency with the new GET /company/team/members -- this legacy
// endpoint is read-only (no escalation risk) but should not offer a
// permission-check-free path to the same data.
const getAllCompanyUser = async (req, res) => {
  const { uid } = req.user;
  try {
    // BOLA guard: derive authoritative companyId from the JWT, never from req.query
    const callerCompany = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const accessCtx = await getAccessContextForRequest(req, uid);
    if (!hasPermission(accessCtx, "team.view")) {
      return res.status(403).json({ message: "You don't have permission to do that." });
    }
    const users = await companyUsers(callerCompany.companyId);
    return res.status(status.success).json(successResponse(users));
  } catch (error) {
    console.error('[companiesController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

// Job-scoped RBAC V3 alignment (2026-08-13): this legacy route had NO
// team.manage permission check -- any authenticated company member could
// silently create a new member (hardcoded role, no job scope, no invite
// token/expiry/audit trail). Confirmed it has zero live frontend callers
// (see GETHIRED_TEAM_ACCESS_RBAC_V3_GAP_ANALYSIS.md), but is left mounted
// rather than removed in case of an untested integration -- now gated the
// same way as the new invite endpoint. Internal provisioning logic
// (addCompanyUserByEmail) is unchanged.
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
    const accessCtx = await getAccessContextForRequest(req, uid);
    if (!hasPermission(accessCtx, "team.manage")) {
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

const getCompanyBySlug = async (req, res) => {
  const { slug } = req.params;
  if (!slug) {
    return res.status(400).json(errorResponse("Slug is required."));
  }
  try {
    const company = await companyDetailsBySlug(slug);
    if (!company) {
      return res.status(404).json(errorResponse("Company not found."));
    }
    return res.status(status.success).json(successResponse(company));
  } catch (error) {
    console.error('[companiesController] getCompanyBySlug error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getCompanyShareableLink = async (req, res) => {
  const { id } = req.query;

  try {
    const company = await companyDetailsById(id);
    const slug = (company && company.slug) ? company.slug : null;
    const postLink = slug ? `/companies/${slug}` : `/companies/details?id=${id}`;
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
        companyName: row.company_name,
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
  getRequestCache,
  getSpecificCompany,
  getCompanyBySlug,
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

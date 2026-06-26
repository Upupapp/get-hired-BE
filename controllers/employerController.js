import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { getUserCompanyForRequest } from "./companiesController";
import { getUserProfileById } from "../helpers/userDetails";

const dbSchema = env.schema;

const getEmployerCompany = async (req, res) => {
  // Use the authenticated caller's own uid, never a client-supplied query
  // param -- this endpoint has zero frontend consumers today (confirmed),
  // so there is no legitimate "look up someone else" use case being
  // removed. STITCH/security fix (object-level authorization, GH-ACT-006).
  const { uid } = req.user;

  try {
    const userCompany = await getUserCompanyForRequest(req, uid);

    return res.status(status.success).json(successResponse(userCompany));
  } catch (error) {
    console.error('[getEmployerCompany] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getEmployerProfile = async (req, res) => {
  // Same fix as getEmployerCompany above.
  const { uid } = req.user;

  try {
    const user = await getUserProfileById(uid);
    const userCompany = await getUserCompanyForRequest(req, uid);

    const dbResponse = {
      ...user,
      companyName: userCompany.companyName ? userCompany.companyName: null
    };
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[employerController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

export { getEmployerCompany, getEmployerProfile };

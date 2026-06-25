import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { getUserCompany } from "./companiesController";
import { getUserProfileById } from "../helpers/userDetails";

const dbSchema = env.schema;

const getEmployerCompany = async (req, res) => {
  // Use the authenticated caller's own uid, never a client-supplied query
  // param -- this endpoint has zero frontend consumers today (confirmed),
  // so there is no legitimate "look up someone else" use case being
  // removed. STITCH/security fix (object-level authorization, GH-ACT-006).
  const { uid } = req.user;

  try {
    const userCompany = await getUserCompany(uid);

    successMessage.data = userCompany;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[getEmployerCompany] error:', error);
    errorMessage.data = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

const getEmployerProfile = async (req, res) => {
  // Same fix as getEmployerCompany above.
  const { uid } = req.user;

  try {
    const user = await getUserProfileById(uid);
    const userCompany = await getUserCompany(uid);

    const dbResponse = {
      ...user,
      companyName: userCompany.companyName ? userCompany.companyName: null
    };
    successMessage.data = dbResponse;

    return res.status(status.success).send(successMessage);
  } catch (error) {
    console.error('[employerController] error:', error);
    errorMessage.error = "Operation not successful. Please try again.";
    return res.status(status.error).send(errorMessage);
  }
};

export { getEmployerCompany, getEmployerProfile };

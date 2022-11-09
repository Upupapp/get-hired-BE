import dbQuery from "../db/dbQuery";
import { successMessage, errorMessage, status } from "../helpers/status";
import env from "../env";
import idGenerator from "../helpers/randomNumberForId";
import { getUserCompany } from "./companiesController";
import { getUserProfileById } from "../helpers/userDetails";

const dbSchema = env.schema;
const now = new Date();

const getEmployerCompany = async (req, res) => {
  const { id } = req.query;

  try {
    const userCompany = await getUserCompany(id);

    successMessage.data = userCompany;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getEmployerProfile = async (req, res) => {
  const { id } = req.query;

  try {
    const user = await getUserProfileById(id);

    successMessage.data = user;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { getEmployerCompany, getEmployerProfile };

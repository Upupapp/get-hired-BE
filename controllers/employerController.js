import dbQuery from "../dbQuery";
import { successMessage, errorMessage, status } from "../helper/status";
import env from "../env";

const dbSchema = env.schema;

const getEmployerCompany = async (req, res) => {
  const userId = req.query.userId;
  const searchQuery = `
    Select company_id from ${dbSchema}.company_employer ce
    where employer_id = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [userId]);
    const dbResponse = rows[0];

    successMessage.data = dbResponse || "";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.data = "Operation was not successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

export { getEmployerCompany };

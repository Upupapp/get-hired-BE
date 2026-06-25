import dbQuery from "../db/dbQuery";
import { successResponse, errorResponse, status } from "../helpers/status";
import env from "../env";

const dbSchema = env.schema;

const getLevelList = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.job_level;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_level_id,
        name: list.job_level_name,
      };
    });
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[optionsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getTypeList = async (req, res) => {
  const searchQuery = `SELECT job_type_id, job_type_name FROM ${dbSchema}.job_type;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.job_type_id,
        name: list.job_type_name,
      };
    });
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[optionsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getSetupList = async (req, res) => {
  const searchQuery = `SELECT * FROM ${dbSchema}.work_setup;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, []);
    const dbResponse = rows.map((list) => {
      return {
        id: list.work_setup_id,
        name: list.work_setup_name,
      };
    });
    return res.status(status.success).json(successResponse(dbResponse));
  } catch (error) {
    console.error('[optionsController] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

export { getLevelList, getTypeList, getSetupList };

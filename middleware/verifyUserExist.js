import dbQuery from "../db/dbQuery";

import { successMessage, errorMessage, status } from "../helpers/status";

import dotenv from "dotenv";

dotenv.config();

/**
 * Verify User Exist
 * @param {object} req
 * @param {object} res
 * @param {object} next
 * @returns {object|void} response object
 */

const verifyUserExist = async (req, res, next) => {
  const uid = req.body.uid || req.query.uid;

  try {
    const searchQuery = `SELECT uid, role
        FROM gwana.user_credentials where uid = $1;`;

    const { rows } = await dbQuery.query(searchQuery, [uid]);

    if (rows.length != 0) {
      next();
    } else {
      throw Error();
    }
  } catch (error) {
    errorMessage.error = "User not Found";
    return res.status(status.unauthorized).send(errorMessage);
  }
};

export default verifyUserExist;

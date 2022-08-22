import dbQuery from "../db/dbQuery";

import { successMessage, errorMessage, status } from "../helpers/status";

import dotenv from 'dotenv';

dotenv.config();

/**
 * Verify Roles
 * @param {object} req
 * @param {object} res
 * @param {object} next
 * @returns {object|void} response object
 */

const verifyRoles = (allowedRoles) => async(req, res, next) => {
    const uid = req.body.uid || req.query.uid;

    try {
        const searchQuery = `SELECT uid, role
        FROM gwana.user_credentials where uid = $1;`;

        const { rows } = await dbQuery.query(searchQuery, [uid]);

        if(allowedRoles.includes(rows[0].role)) {
            next();
        } else {
            res.status(401).send({ message: 'User not allowed to access this API' });
        }
         
    } catch (error) {
        errorMessage.error = 'Authentication Failed. Role not allowed';
        return res.status(status.unauthorized).send(errorMessage);
    }
}

export default verifyRoles;
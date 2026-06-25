import dbQuery from "../db/dbQuery";

import { errorResponse, status } from "../helpers/status";
import env from '../env';
import dotenv from 'dotenv';

dotenv.config();
const dbSchema = env.schema;

/**
 * Verify Roles
 * @param {object} req
 * @param {object} res
 * @param {object} next
 * @returns {object|void} response object
 */

const verifyRoles = (allowedRoles) => async(req, res, next) => {
    // SEC-07 FIX: derive uid from verified Firebase JWT, never from caller-supplied body/query.
    // verifyAuth middleware must run before verifyRoles on any route that uses both.
    const uid = req.user?.uid;
    if (!uid) {
        return res.status(status.unauthorized).json(errorResponse('Authentication required'));
    }

    try {
        const searchQuery = `SELECT uid, role
        FROM ${dbSchema}.user_credentials where uid = $1;`;

        const { rows } = await dbQuery.query(searchQuery, [uid]);

        if(rows.length && allowedRoles.includes(rows[0].role)) {
            next();
        } else {
            res.status(401).json({ message: 'User not allowed to access this API' });
        }

    } catch (error) {
        return res.status(status.unauthorized).json(errorResponse('Authentication Failed. Role not allowed'));
    }
}

export default verifyRoles;
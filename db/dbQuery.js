import pg from "pg";
import env from "../env";

const Pool = pg.Pool;

const pool = new Pool({
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  user: env.user,
  host: env.host,
  database: env.database,
  password: env.password,
  port: env.db_port,
});

export default {
  /**
   * DB Query
   * @param {object} req
   * @param {object} res
   * @returns {object} object
   */

  query(queryText, params) {
    return new Promise((resolve, reject) => {
      pool
        .query(queryText, params)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          console.error('[dbQuery] query error:', err.message);
          reject(err);
        });
    });
  },
};

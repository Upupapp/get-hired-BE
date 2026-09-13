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

  /**
   * Close the connection pool.
   *
   * The server never calls this -- the pool is meant to live for the process.
   * It exists so integration tests can release their connections and let the
   * runner exit; without it every DB-backed test leaves an open handle and
   * Jest hangs after a green run, which is the kind of friction that gets
   * integration tests quietly deleted. Safe to call more than once.
   */
  close() {
    return pool.end();
  },

  /**
   * Run fn(client) inside ONE transaction on a single pooled connection.
   *
   * COMMIT when fn resolves, ROLLBACK when it throws (the error is rethrown), and the
   * connection is always released. services/teamAccess.service.js calls this from
   * removeTeamMember, updateTeamMember, createCustomRole, updateCustomRole and
   * acceptInvitation, but it was never defined here, so each of those threw
   * "dbQuery.withTransaction is not a function" -- including the routed
   * DELETE /api/company/removecompanyuser.
   */
  async withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[dbQuery] rollback failed:", rollbackErr && rollbackErr.message);
      }
      throw err;
    } finally {
      client.release();
    }
  },
};

import pg from 'pg';
import env from '../../env';
// A dedicated small pool keeps connector transactions independent of billing edits.
const pool = new pg.Pool({max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:5000,
  user:env.user,host:env.host,database:env.database,password:env.password,port:env.db_port});
export default {
  query: (sql,values) => pool.query(sql,values),
  async transaction(work) {
    const client=await pool.connect();
    try { await client.query('BEGIN'); const result=await work(client); await client.query('COMMIT'); return result; }
    catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
};

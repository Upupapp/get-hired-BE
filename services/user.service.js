import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const insertLogs = async (activity, userId) => {
  const insertQuery = `INSERT INTO ${dbSchema}.logs
    (activity_name, user_id)
    VALUES($1, $2) returning *;`;
  try {
    const { rows } = await dbQuery.query(insertQuery, [activity, userId]);
    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

export { insertLogs };

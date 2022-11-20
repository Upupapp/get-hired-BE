import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;
const now = Date.now();

const genericInsert = async (tableName, columnName, value, identifier) => {
  const insertQuery = `INSERT into ${dbSchema}.${tableName}
        (${columnName}, ${identifier.column}, created_at) 
        VALUES ($1, $2, current_timestamp) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      value,
      identifier.value,
    ]);

    if (!rows || rows.length == 0) {
      throw `Failed to insert in ${tableName}`;
    }

    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

export default genericInsert;

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

const updateUserProfile = async (profile) => {
  const {
    firstName,
    lastName,
    address,
    contactNumber,
    city,
    country,
    rawUrlPhoto,
    userId,
  } = profile;

  console.log(rawUrlPhoto);

  const updateQuery = `UPDATE ${dbSchema}.users
  SET firstname=$1, lastname=$2, address=$3, cell_number=$4, city=$5, country=$6, photo_url=$7, is_profile_updated=true
  WHERE uid=$8 returning *;`;

  try {
    const { rows } = await dbQuery.query(updateQuery, [
      firstName,
      lastName,
      address,
      contactNumber,
      city,
      country,
      rawUrlPhoto,
      userId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to update profile";
    }

    const dbResponse = rows[0];

    return {
      firstName: dbResponse.firstname,
      lastName: dbResponse.lastname,
      address: dbResponse.address,
      contactNumber: dbResponse.cell_number,
      city: dbResponse.city,
      country: dbResponse.country,
      photoUrl: dbResponse.photo_url,
      userId: dbResponse.uid,
    };
  } catch (error) {
    throw error;
  }
};

export { insertLogs, updateUserProfile };

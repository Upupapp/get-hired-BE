import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const insertLogs = async (activity, userId, id) => {
  const insertQuery = `INSERT INTO ${dbSchema}.logs
    (activity_name, user_id, activity_id)
    VALUES($1, $2, $3) returning *;`;
  try {
    const { rows } = await dbQuery.query(insertQuery, [activity, userId, id]);
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

    // BUGFIX (Short Bio "not saving"): `!rows && rows.length == 0` is dead
    // code -- pg's rows is always an array, never null/undefined, so !rows
    // is never true and this guard never fires. When the UPDATE matches
    // zero rows (this applicant's uid has no row in gethired.users), rows
    // is [], rows[0] is undefined, and every property read below
    // (dbResponse.firstname, ...) throws a raw TypeError instead of the
    // intended controlled error. That crash reaches
    // updateProfileBasicInfo's caller AFTER the short_bio UPDATE on
    // applicants_profile has already committed -- the bio genuinely saves,
    // but the request still 500s, which is exactly "it's not saving" from
    // the applicant's side. Fixed to the correct || so a real zero-row
    // match throws the clear, already-handled error instead of crashing.
    if (!rows || rows.length == 0) {
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

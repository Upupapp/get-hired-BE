import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

const getUserRoleById = async (uid) => {
  const searchQuery = `Select role from ${dbSchema}.user_credentials where uid = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [uid]);
    return rows[0].role;
  } catch (error) {
    throw Error(error);
  }
};

const getUserRoleByEmail = async (email) => {
  const searchQuery = `Select role from ${dbSchema}.user_credentials where email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);
    return rows[0].role;
  } catch (error) {
    throw Error(error);
  }
};

const getUserProfileById = async (uid) => {
  // BUGFIX: users.email was dropped in a DDL migration (db/user_ddl.sql:
  // "ALTER TABLE gethired.users DROP COLUMN email") -- email lives on
  // user_credentials only, same as every other fixed lookup in this file
  // (see getUserNameByEmail above). This function backs GET /auth/getprofile
  // directly, so its missing join left every profile response (and every
  // page reading from it -- Profile Details' Contact Details card,
  // Settings' Account Settings form) with a permanently blank email field,
  // despite userMap already expecting raw.email.
  const searchQuery = `Select u.*, c.email from ${dbSchema}.users u
    left join ${dbSchema}.user_credentials c on c.uid = u.uid
    where u.uid = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [uid]);
    const dbResponse = userMap(rows[0]);
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const getUserNameByEmail = async (email) => {
  // STITCH QA11 FIX F-01: users.email was dropped; email lives on
  // user_credentials only (same pattern as getUserCredentialsByEmail
  // above and company.service.js's companyUsers()).
  const searchQuery = `Select u.firstname
    from ${dbSchema}.user_credentials c
    left join ${dbSchema}.users u on u.uid = c.uid
    where c.email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);
    const dbResponse = rows[0].firstname;
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const getBasicInfoByEmail = async (email) => {
  const searchQuery = `Select uid, firstname, lastname, cellnumber
  from ${dbSchema}.users where email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);
    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const checkEmailIfExist = async (email) => {
  const searchQuery = `SELECT * from ${dbSchema}.user_credentials where email=$1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);

    if (rows.length != 0) {
      return true;
    }

    return false;
  } catch (error) {
    throw Error(error);
  }
};

const getUserCredentialsByEmail = async (email) => {
  const searchQuery = `
  Select 
    c.uid, c.password, c.role, u.firstname, u.middlename, u.lastname, u.address, 
    u.city, u.zip, u.phone_number, u.cell_number, u.photo_url, u.date_of_birth,
    u.is_profile_updated, u.updated_at, u.gender, u.civil_status, u.state, u.country, c.email
  from ${dbSchema}.user_credentials c
  left join ${dbSchema}.users u 
  on c.uid  = u.uid 
  where c.email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);
    const dbResponse = rows[0];

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const getIdByEmail = async (email) => {
  const searchQuery = `Select uid
  from ${dbSchema}.users where email = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [email]);
    const dbResponse = rows[0];
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const userMap = (raw) => {
  return {
    uid: raw.uid,
    firstName: raw.firstname,
    middleName: raw.middlename,
    lastName: raw.lastname,
    createdDate: raw.createddate,
    dateOfBirth: raw.date_of_birth,
    email: raw.email,
    gender: raw.gender,
    phoneNumber: raw.phone_number,
    cellNumber: raw.cell_number,
    photoUrl: raw.photo_url || null,
    address: raw.address,
    zip: raw.zip,
    city: raw.city,
    isProfileUpdated: raw.is_profile_updated,
    lastUpdate: raw.last_update,
    addressB: raw.address_b,
    roleTitle: raw.role_title || null,
    department: raw.department || null,
    shortBio: raw.short_bio || null,
    linkedinUrl: raw.linkedin_url || null,
    publicProfileEnabled: raw.public_profile_enabled || false,
    showPhotoPublicly: raw.show_photo_publicly || false,
    showTitlePublicly: raw.show_title_publicly || false,
    showBioPublicly: raw.show_bio_publicly || false,
    showLinkedinPublicly: raw.show_linkedin_publicly || false,
    showEmailPublicly: raw.show_email_publicly || false,
    showPhonePublicly: raw.show_phone_publicly || false,
  };
};

export {
  getUserRoleById,
  getUserProfileById,
  checkEmailIfExist,
  getUserRoleByEmail,
  getUserNameByEmail,
  getUserCredentialsByEmail,
  getBasicInfoByEmail,
  getIdByEmail,
  userMap,
};

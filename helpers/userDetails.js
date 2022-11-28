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
  const searchQuery = `Select * from ${dbSchema}.users where uid = $1`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [uid]);
    const dbResponse = userMap(rows[0]);
    return dbResponse;
  } catch (error) {
    throw Error(error);
  }
};

const getUserNameByEmail = async (email) => {
  const searchQuery = `Select firstname
    from ${dbSchema}.users where email = $1`;

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
    photoUrl: raw.photo_url,
    address: raw.address,
    zip: raw.zip,
    city: raw.city,
    isProfileUpdated: raw.is_profile_updated,
    lastUpdate: raw.last_update,
    addressB: raw.address_b,
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
};

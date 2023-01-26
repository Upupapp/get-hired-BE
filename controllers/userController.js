import { status, errorMessage, successMessage } from "../helpers/status";
import {
  hashPassword,
  comparePassword,
  isValidEmail,
  isEmpty,
  validatePassword,
} from "../helpers/validation";

import dbQuery from "../db/dbQuery";
import { send } from "../helpers/mailer";
import {
  getUserRoleByEmail,
  getUserNameByEmail,
  getUserCredentialsByEmail,
  getUserProfileById,
} from "../helpers/userDetails";

import { getUserCompany } from "./companiesController";
import uploadInStorage from "../helpers/uploader";

import {
  revokeTokenInFirebase,
  registerNewUserInFirebase,
  checkUserIfExistInFirebase,
  sendEmailVerificationFirebase,
  signInUserAndGetTokeninFirebase,
  verifyEmailInFirebase,
  getRefreshTokenFirebase,
  verifyPwResetInFirebase,
  getForgetPwLinkInFirebase,
  updateUserProfileInFirebase,
  registerNewUserInFirebaseWithEmail,
  deleteUserAccountInFirebaseById,
} from "../helpers/firebaseFunctions";
import env from "../env";

const dbSchema = env.schema;

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (isEmpty(email) || isEmpty(password)) {
    errorMessage.error = "Email or Password can not be empty";
    return res.status(status.bad).send(errorMessage);
  }

  if (!isValidEmail(email) || !validatePassword(password)) {
    errorMessage.error = "Please enter a valid Email or Password";
    return res.status(status.bad).send(errorMessage);
  }

  try {
    const firebaseAuthentication = await checkUserIfExistInFirebase(email);
    if (firebaseAuthentication.length === 0) {
      errorMessage.error = "User does not exist. Please Register.";
      return res.status(status.notfound).send(errorMessage);
    }

    if (!firebaseAuthentication.emailVerified) {
      errorMessage.error =
        "Please Verify Email with the link sent to your registered email address.";
      return res.status(status.unauthorized).send(errorMessage);
    }

    // user logged in new DB
    const credentials = await loginUserInDBAndFirebase(email, password);
    const userCompany = await getUserCompany(credentials.id);
    successMessage.data = {
      ...credentials,
      withCompany: userCompany && userCompany.length != 0,
      companyName: userCompany.companyName || "",
      companyId: userCompany.companyId || null
    };
    return res.status(status.success).send(successMessage);
  } catch (err) {
    errorMessage.error = "Operation Not Successful. " + err;
    return res.status(status.error).send(errorMessage);
  }
};

const registerUser = async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (isEmpty(email) || isEmpty(password)) {
    errorMessage.error = "Email or Password can not be empty";
    return res.status(status.bad).send(errorMessage);
  }

  if (!isValidEmail(email) || !validatePassword(password)) {
    errorMessage.error = "Please enter a valid Email or Password";
    return res.status(status.bad).send(errorMessage);
  }

  const user = {
    email,
    password,
    firstName,
    lastName,
    role,
  };

  try {
    const userInFirebase = await checkUserIfExistInFirebase(email);

    if (userInFirebase && userInFirebase.length !== 0) {
      errorMessage.error = "User is already Registered. Please login instead.";
      return res.status(status.error).send(errorMessage);
    }

    // Use this if we have different mailer
    const userData = await registerNewUserInFirebase(user);

    // Use this if we need firebase mailer
    // const userData = await registerNewUserInFirebaseWithEmail(user);

    const dbData = {
      uid: userData.uid,
      email: userData.email,
      password: hashPassword(password),
      firstname: user.firstName,
      lastname: user.lastName,
      role,
    };

    const dbRegister = await registerUserInDB(dbData);

    if (!userData || !dbRegister) {
      errorMessage.error = "Operation not Successful.";
      return res.status(status.error).send(errorMessage);
    }
    // const isVerified = await getVerification(email, user.firstName);
    // if (!isVerified) {
    //   return res
    //     .status(status.error)
    //     .send("Failed to generate Verification link");
    // }

    successMessage.data = dbRegister;
    return res.status(status.created).send(successMessage);
  } catch (err) {
    console.log(err);
    return res.status(status.error).send(err);
  }
};

const logout = async (req, res) => {
  const { uid } = req.query;

  try {
    const revoke = await revokeTokenInFirebase(uid);

    successMessage.data = "User has been logout";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "Error: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.query;

  try {
    const firstName = await getUserNameByEmail(email);

    const isVerified = await getVerification(email, firstName);
    if (!isVerified) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    successMessage.data = isVerified;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "Operation Not Successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getVerificationLink = async (req, res) => {
  const { email } = req.query;

  try {
    const verify = await sendEmailVerificationFirebase(email);
    console.log(verify);

    if (!verify) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    successMessage.data = verify;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "Operation Not Successful. " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const verifyEmailFileManually = async (req, res) => {
// try {
// const dbResponse = await ;
// successMessage.data = dbResponse;
// return res.status(status.success).send(successMessage);
// } catch(error) {
// errorMessage.error = 'ERROR: ' + error;
// return res.status(status.error).send(errorMessage);
// }
};

const verifyEmail = async (req, res) => {
  const { oobCode } = req.query;

  try {
    const verify = await verifyEmailInFirebase(oobCode);
    successMessage.data = "Email Successfully verified. You may login.";
    return res.status(status.success).send(successMessage);
  } catch (err) {
    errorMessage.data = "Operation was not successful. " + err;
    return res.status(status.error).send(errorMessage);
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const auth = await getRefreshTokenFirebase();
    successMessage.data = auth;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "" + error;
    return res.status(status.error).send(errorMessage);
  }
};

const passwordResetLink = async (req, res) => {
  const { email } = req.query;
  try {
    const pwRequestLink = await getForgetPwLinkInFirebase(email);
    const name = await getUserNameByEmail(email);
    const userRole = await getUserRoleByEmail(email);

    send(email, "pw_reset", {
      url: pwRequestLink + `&role=${userRole}&email=${email}`,
      first_name: name,
      email,
    });

    successMessage.data = "Link Send to your provided Email";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getUserProfile = async (req, res) => {
  const { uid } = req.user;
  try {
    const user = await getUserProfileById(uid);
    successMessage.data = user;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateUserProfile = async(req, res) => {
  const profile = req.body;

  try {
  const user = await updateProfile({...profile});

  successMessage.data = user;
  return res.status(status.success).send(successMessage);
  } catch(error) {
  errorMessage.error = 'ERROR: ' + error;
  return res.status(status.error).send(errorMessage);
  }
};

const changePw = async (req, res) => {
  const { oobCode, pw, email } = req.body;

  const hashPw = hashPassword(pw);

  try {
    const changePWinFirebase = await verifyPwResetInFirebase(oobCode, pw);
    const changeInDB = await changePWinDB(email, hashPw);

    if (!changeInDB) {
      throw Error("Failed to change password in Database");
    }

    successMessage.data = "Password Successfuly Change";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const getUserCredentials = async (req, res) => {
  const { email } = req.query;
  try {
    const dbCredentials = await getUserCredentialsByEmail(email);

    if (!dbCredentials) {
      throw Error("User does not exist");
    }

    const getToken = await getRefreshTokenFirebase();

    const credentials = {
      id: dbCredentials.uid,
      email: dbCredentials.email,
      firstName: dbCredentials.firstname,
      middleName: dbCredentials.middlename,
      lastName: dbCredentials.lastname,
      role: dbCredentials.role,
      photoUrl: dbCredentials.photourl,
      token: getToken.token,
      refreshToken: getToken.refreshToken,
    };

    successMessage.data = credentials;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const updateProfile = async (user) => {
  let rawUrl = "";

  const {
    uid,
    firstName,
    middleName,
    lastName,
    address,
    city,
    zip,
    phoneNumber,
    cellNumber,
    photoUrl,
    dateOfBirth,
    gender,
    avatar,
  } = user;

  const updateQuery = `UPDATE ${dbSchema}.users
    SET firstname=$1, middlename=$2, lastname=$3, address=$4, city=$5, zip=$6,
    phone_number=$7, cell_number=$8, photo_url=$9, date_of_birth=$10, is_profile_updated=true,
    updated_at = $11, gender=$12
    WHERE uid=$13 returning *`;

  try {
    if (avatar && avatar != "" && !photoUrl) {
      rawUrl = await uploadInStorage("profile", `${uid}-thumb`, avatar);
    }

    const profileInFirebase = await updateUserProfileInFirebase(user);
    const { rows } = await dbQuery.query(updateQuery, [
      firstName,
      middleName,
      lastName,
      address,
      city,
      zip,
      phoneNumber,
      cellNumber,
      rawUrl,
      dateOfBirth,
      new Date(),
      gender,
      uid,
    ]);

    const dbResponse = userMap({ uid, ...rows[0] });
    return dbResponse;
  } catch (error) {
    throw "Failed to update User profile. " + error;
  }
};

const registerUserInDB = async (user) => {
  let roleBaseQuery = "";
  const insertQueryInCredentials = `Insert into ${dbSchema}.user_credentials
  (uid, email, "password", "role", created_date) values ($1, $2, $3, $4, current_timestamp) returning *;`;

  const insertQueryInProfile = `
      Insert into ${dbSchema}.users 
        (uid, email, firstname, lastname) 
      values 
        ($1, $2, $3, $4) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQueryInCredentials, [
      user.uid,
      user.email,
      user.password,
      user.role,
    ]);

    const dbResponse = rows[0];

    const rows_profile = await dbQuery.query(insertQueryInProfile, [
      user.uid,
      user.email,
      user.firstname,
      user.lastname,
    ]);

    const profileResponse = rows_profile.rows[0];

    if (!dbResponse || !profileResponse) {
      throw Error("User not save in DB");
    }

    const credentials = {
      id: profileResponse.uid,
      email: profileResponse.email,
      firstName: profileResponse.firstname,
      lastName: profileResponse.lastname,
      role: dbResponse.role,
      createdDate: dbResponse.created_date,
    };

    return credentials;
  } catch (error) {
    throw error;
  }
};

const loginUserInDBAndFirebase = async (email, password) => {
  try {
    const dbCredentials = await getUserCredentialsByEmail(email);

    if (!dbCredentials) {
      throw Error("User does not exist");
    }

    if (!comparePassword(dbCredentials.password, password)) {
      throw Error("Please enter a valid Password");
    }

    const firebaseUser = await signInUserAndGetTokeninFirebase(email, password);

    const credentials = {
      id: firebaseUser.uid,
      email: dbCredentials.email,
      firstName: dbCredentials.firstname,
      middleName: dbCredentials.middlename,
      lastName: dbCredentials.lastname,
      role: dbCredentials.role,
      photoUrl: dbCredentials.photo_url,
      isProfileUpdated: dbCredentials.is_profile_updated,
      token: firebaseUser.token,
      refreshToken: firebaseUser.refreshToken,
    };

    return credentials;
  } catch (error) {
    throw Error(error);
  }
};

const changePWinDB = async (email, password) => {
  const updateQuery = `UPDATE ${dbSchema}.user_credentials SET password=$1 where email=$2 returning *;`;

  try {
    const { rows } = await dbQuery.query(updateQuery, [password, email]);
    const newPw = rows[0];

    return newPw;
  } catch (error) {
    throw error;
  }
};

const getVerification = async (email) => {
  const verify = await sendEmailVerificationFirebase(email);
  console.log(verify);
  if (!verify) {
    throw Error("Failed Verification");
  }

  const userRole = await getUserRoleByEmail(email);
  const firstName = await getUserNameByEmail(email);

  send(email, "verify_email", {
    verify_url: verify + `&role=${userRole}`,
    first_name: firstName,
    email,
  });

  return "Verification Link Sent";
};

const deleteAccountById = async (req, res) => {
  const { uid } = req.query;

  try {
    const account = await deleteUserAccount(uid);
    successMessage.data = account;
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const deleteUserAccount = async (uid) => {
  const deleteQuery = `DELETE from ${dbSchema}.user_credentials where uid=$1`;

  try {
    const deleteInFirebase = await deleteUserAccountInFirebaseById(uid);
    const { rows } = await dbQuery.query(deleteQuery, [uid]);
    return "User deleted";
  } catch (error) {
    throw error;
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
    age: raw.age,
    email: raw.email,
    gender: raw.gender,
    phoneNumber: raw.phone_number,
    cellNumber: raw.cellnumber,
    photoURL: raw.photourl,
    address: raw.address,
    zip: raw.zip,
    city: raw.city,
    isProfileUpdated: raw.is_profile_updated,
    lastUpdate: raw.last_update,
    addressB: raw.address_b,
  };
};

export {
  loginUser,
  registerUser,
  resendVerification,
  updateProfile,
  logout,
  verifyEmail,
  getRefreshToken,
  passwordResetLink,
  changePw,
  getUserCredentials,
  deleteAccountById,
  getUserProfile,
  updateUserProfile,
  registerUserInDB,
  getVerification,
  getVerificationLink,
  verifyEmailFileManually
};

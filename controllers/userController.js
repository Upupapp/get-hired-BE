import { status, successResponse, errorResponse } from "../helpers/status";
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

import { companySubscriptions } from "./subscriptionController";

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
  let isActive = false;
  const { email, password } = req.body;

  if (isEmpty(email) || isEmpty(password)) {
    return res.status(status.bad).json(errorResponse("Email or Password can not be empty"));
  }

  if (!isValidEmail(email) || !validatePassword(password)) {
    return res.status(status.bad).json(errorResponse("Please enter a valid Email or Password"));
  }

  try {
    const firebaseAuthentication = await checkUserIfExistInFirebase(email);
    if (firebaseAuthentication.length === 0) {
      return res.status(status.notfound).json(errorResponse("User does not exist. Please Register."));
    }

    if (!firebaseAuthentication.emailVerified) {
      return res.status(status.unauthorized).json(errorResponse("Please Verify Email with the link sent to your registered email address."));
    }

    // user logged in new DB
    const credentials = await loginUserInDBAndFirebase(email, password);
    const userCompany = await getUserCompany(credentials.id);

    if(userCompany && userCompany.companyId) {
      const subs = await companySubscriptions(userCompany.companyId);

      if(subs && subs.length > 0) {
        isActive = new Date(subs[0].endAt) > new Date();
      }
    }

    return res.status(status.success).json(successResponse({
      ...credentials,
      withCompany: userCompany && userCompany.length != 0,
      companyName: userCompany.companyName || "",
      companyId: userCompany.companyId || null,
      withActiveSubscription: userCompany.withActiveSubscription
    }));
  } catch (err) {
    console.error('[loginUser] error:', err);
    return res.status(status.error).json(errorResponse("Login failed. Please check your credentials and try again."));
  }
};

const registerUser = async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (isEmpty(email) || isEmpty(password)) {
    return res.status(status.bad).json(errorResponse("Email or Password can not be empty"));
  }

  if (!isValidEmail(email) || !validatePassword(password)) {
    return res.status(status.bad).json(errorResponse("Please enter a valid Email or Password"));
  }

  // Only job seekers (3) and employers (2) may self-register.
  // Role 1 (admin) must never be grantable via the public signup endpoint.
  const ALLOWED_ROLES = [2, 3];
  if (!ALLOWED_ROLES.includes(Number(role))) {
    return res.status(status.bad).json(errorResponse("Invalid role."));
  }

  const user = {
    email,
    password,
    firstName,
    lastName,
    role: Number(role),
  };

  try {
    const userInFirebase = await checkUserIfExistInFirebase(email);

    if (userInFirebase && userInFirebase.length !== 0) {
      return res.status(status.error).json(errorResponse("User is already Registered. Please login instead."));
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
      return res.status(status.error).json(errorResponse("Operation not Successful."));
    }
    const isVerified = await getVerification(email, user.firstName);
    if (!isVerified) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    return res.status(status.created).json(successResponse(dbRegister));
  } catch (err) {
    console.error('[registerUser] error:', err);
    return res.status(status.error).json(errorResponse("Registration failed. Please try again."));
  }
};

const logout = async (req, res) => {
  const { uid } = req.query;

  try {
    const revoke = await revokeTokenInFirebase(uid);

    return res.status(status.success).json(successResponse("User has been logout"));
  } catch (error) {
    console.error('[logout] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.query;

  try {
    // const firstName = await getUserNameByEmail(email);

    const isVerified = await getVerification(email);
    if (!isVerified) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    return res.status(status.success).json(successResponse(isVerified));
  } catch (error) {
    console.error('[resendVerification] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getVerificationLink = async (req, res) => {
  const { email } = req.query;

  try {
    const verify = await sendEmailVerificationFirebase(email);

    if (!verify) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    return res.status(status.success).json(successResponse(verify));
  } catch (error) {
    console.error('[getVerificationLink] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
    return res.status(status.success).json(successResponse("Email Successfully verified. You may login."));
  } catch (err) {
    console.error('[verifyEmail] error:', err);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getRefreshToken = async (req, res) => {
  try {
    const auth = await getRefreshTokenFirebase();
    return res.status(status.success).json(successResponse(auth));
  } catch (error) {
    console.error('[getRefreshToken] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
      name,
      email,
    });

    return res.status(status.success).json(successResponse("Link Send to your provided Email"));
  } catch (error) {
    console.error('[passwordResetLink] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const getUserProfile = async (req, res) => {
  const { uid } = req.user;
  try {
    const user = await getUserProfileById(uid);
    return res.status(status.success).json(successResponse(user));
  } catch (error) {
    console.error('[getUserProfile] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
  }
};

const updateUserProfile = async(req, res) => {
  const profile = req.body;

  try {
  // QA10 FIX-8 BOLA: override any uid in req.body with JWT-derived identity —
  // a caller cannot update another user's profile by supplying a different uid.
  const user = await updateProfile({ ...profile, uid: req.user.uid });

  return res.status(status.success).json(successResponse(user));
  } catch(error) {
  console.error('[updateUserProfile] error:', error);
  return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

    return res.status(status.success).json(successResponse("Password Successfuly Change"));
  } catch (error) {
    console.error('[changePw] error:', error);
    return res.status(status.error).json(errorResponse("Your password reset link may have expired. Please request a new one."));
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

    return res.status(status.success).json(successResponse(credentials));
  } catch (error) {
    console.error('[getUserCredentials] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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
  if (!verify) {
    throw Error("Failed Verification");
  }

  const userRole = await getUserRoleByEmail(email);
  const firstName = await getUserNameByEmail(email);

  send(email, "verify_email", {
    verify_url: verify + `&role=${userRole}`,
    name: firstName,
    email,
  });

  return "Verification Link Sent";
};

const deleteAccountById = async (req, res) => {
  const { userId } = req.query;

  if (userId !== req.user.uid) {
    return res.status(403).json({ message: "You don't have permission to do that." });
  }

  try {
    const account = await deleteUserAccount(userId);
    return res.status(status.success).json(successResponse(account));
  } catch (error) {
    console.error('[deleteAccountById] error:', error);
    return res.status(status.error).json(errorResponse("Operation not successful. Please try again."));
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

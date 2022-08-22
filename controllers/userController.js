import { status, errorMessage, successMessage } from "../helpers/status";
import {
  hashPassword,
  comparePassword,
  isValidEmail,
  isEmpty,
  validatePassword,
} from "../helpers/validation";

import dbQuery from "../db/dbQuery";
import "firebase/compat/auth";
import { send } from "../helpers/mailer";
import {
  checkEmailIfExist,
  getUserRoleByEmail,
  getUserNameByEmail,
  getUserCredentialsByEmail,
} from "../helpers/userDetails";

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

    successMessage.data = credentials;
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

    const userData = await registerNewUserInFirebase(user);

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
    const isVerified = await getVerification(email, user.firstName);
    if (!isVerified) {
      return res
        .status(status.error)
        .send("Failed to generate Verification link");
    }

    return res.status(status.created).send(dbRegister);
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
  const { email, name } = req.body;
  let firstName = name;

  try {
    if (!name || name == "") {
      firstName = await getUserNameByEmail(email);
    }

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

const passwordResetLink = async (req, res) => {
  const { email } = req.query;
  try {
    const pwRequestLink = await getForgetPwLinkInFirebase(email);
    const name = await getUserNameByEmail(email);
    const userRole = await getUserRoleByEmail(email);

    const emailUser = send({ email, name }, "pw_reset", {
      url: pwRequestLink + `&role=${userRole}&email=${email}`,
      name,
      email,
    });

    // console.log(emailUser);
    // if (!emailUser) {
    //   throw Error("Failed to send email");
    // }

    successMessage.data = "Link Send to your provided Email";
    return res.status(status.success).send(successMessage);
  } catch (error) {
    errorMessage.error = "ERROR: " + error;
    return res.status(status.error).send(errorMessage);
  }
};

const createUser = async (user) => {
  const {
    adminCreate,
    email,
    role,
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
    addressB,
    gender,
  } = user;

  try {
    const userCred = {
      email,
      password: "p@ssw0rd",
      firstName,
      lastName,
      role,
    };

    // check user if exist
    const userInFirebase = await checkUserIfExistInFirebase(email);

    if (userInFirebase && userInFirebase.length !== 0) {
      throw "User is already Registered. Please login instead.";
    }

    // Create user in Firebase
    const userData = await registerNewUserInFirebase(userCred);

    const dbData = {
      uid: userData.uid,
      email: userData.email,
      password: hashPassword(userCred.password),
      firstname: user.firstName,
      lastname: user.lastName,
      role,
      adminCreate,
    };

    // Create user in DB
    const dbRegister = await registerUserInDB(dbData);

    if (!userData || !dbRegister) {
      throw "Failed to create in Firecase/Database";
    }

    //get verification Link
    const verify = await sendEmailVerificationFirebase(email);

    // Create profile
    const profile = await updateProfile({
      uid: userData.uid,
      ...user,
    });

    return {
      uid: userData.uid,
      ...dbRegister,
      ...profile,
      verificationLink: verify,
    };
  } catch (error) {
    throw error;
  }
};

export {
  loginUser,
  registerUser,
  resendVerification,
  logout,
  verifyEmail,
  passwordResetLink,
  createUser,
};

import { firebaseAdmin } from "../middleware/firebaseApp";
import {
  getAuth,
  signInWithEmailAndPassword,
  confirmPasswordReset,
  applyActionCode,
  updateProfile,
} from "firebase/auth";

import env from "../env";
import request from "request";

const signInUserAndGetTokeninFirebase = async (email, password) => {
  try {
    const auth = getAuth();

    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (!user.emailVerified) {
      revokeTokenInFirebase(user.uid);
      const errorMessage =
        "Please Verify Email with the link sent to your registered email address.";
      throw Error(errorMessage);
    }

    const token = await auth.currentUser.getIdToken();
    const refreshToken = auth.currentUser.refreshToken;

    const firebaseUser = {
      uid: user.uid,
      token,
      refreshToken,
    };

    return firebaseUser;
  } catch (err) {
    throw err;
  }
};

const getForgetPwLinkInFirebase = async (email) => {
  try {
    const auth = firebaseAdmin.auth();

    const url = await auth.generatePasswordResetLink(email);
    return url;
  } catch (err) {
    // console.log(err);
    throw Error(err);
  }
};

const verifyPwResetInFirebase = async (obcode, newPw) => {
  try {
    const auth = getAuth();

    const resetPw = await confirmPasswordReset(auth, obcode, newPw);
    return resetPw;
  } catch (err) {
    throw Error(err);
  }
};

const registerNewUserInFirebase = async (user) => {
  return firebaseAdmin
    .auth()
    .createUser({ ...user })
    .then(async (userData) => {
      return userData;
    })
    .catch((error) => {
      console.log(error);
      throw error;
    });
};

const sendEmailVerificationFirebase = async (email) => {
  try {
    const link = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email);
    return link;
  } catch (err) {
    throw "Email Error:" + err;
  }
};

const revokeTokenInFirebase = (uid) => {
  return firebaseAdmin.auth().revokeRefreshTokens(uid);
};

const checkUserIfExistInFirebase = async (email) => {
  return firebaseAdmin
    .auth()
    .getUserByEmail(email)
    .then((user) => {
      return user;
    })
    .catch((err) => {
      // if (err.code === "auth/user-not-found") {
      //   errorMessage.error = "User does not Exist";
      //   return res.status(status.notfound).send(errorMessage);
      // }
      return [];
    });
};

const verifyEmailInFirebase = async (oobCode) => {
  try {
    const auth = getAuth();
    const verify = await applyActionCode(auth, oobCode);
    return verify;
  } catch (error) {
    throw error;
  }
};

const getRefreshTokenFirebase = async () => {
  const auth = getAuth();

  const token = await auth.currentUser.getIdToken();
  const refreshToken = auth.currentUser.refreshToken;
  return { token, refreshToken };
};

const updateUserProfileInFirebase = async (user) => {
  const auth = getAuth();

  const update = await updateProfile(auth.currentUser, { ...user });

  return update;
};

const disabledUserInFirebase = async (userId) => {
  try {
    const disabledUser = firebaseAdmin.auth().updateUser(uid, {
      disabled: true,
    });

    return disabledUser;
  } catch (error) {
    throw error;
  }
};

export {
  signInUserAndGetTokeninFirebase,
  getForgetPwLinkInFirebase,
  checkUserIfExistInFirebase,
  verifyPwResetInFirebase,
  revokeTokenInFirebase,
  sendEmailVerificationFirebase,
  registerNewUserInFirebase,
  verifyEmailInFirebase,
  getRefreshTokenFirebase,
  updateUserProfileInFirebase,
  disabledUserInFirebase,
};

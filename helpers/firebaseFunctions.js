import { firebaseAdmin } from "../middleware/firebaseApp";
import {
  getAuth,
  signInWithEmailAndPassword,
  confirmPasswordReset,
  applyActionCode,
  updateProfile,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";

import env from "../env";

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
    console.log(err);
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

const registerNewUserInFirebaseWithEmail = async (creds) => {
  const auth = getAuth();
  const userInFirebase = await createUserWithEmailAndPassword(
    auth,
    creds.email,
    creds.password
  );
  const { user } = await signInWithEmailAndPassword(
    auth,
    creds.email,
    creds.password
  );

  if (userInFirebase && user) {
    sendEmailVerification(auth.currentUser);
    signOut(auth);
    return user;
  }
};

const sendEmailVerificationFirebase = async (email) => {
  try {
    const link = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email);
    return link;
  } catch (err) {
    throw "Email " + err;
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

const verifyFCMToken = async (token) => {
  try {
    const checker = await firebaseAdmin.messaging().send(
      {
        token: token,
      },
      true
    );
    return true;
  } catch (error) {
    return false;
  }
};

const firebaseSendNotif = async (title, body, token, category, id) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
      data: {
        category: category,
        id: id,
      },
    };
    const notif = firebaseAdmin.messaging().send(message);
    return notif;
  } catch (error) {
    throw error;
  }
};

const firebaseSendGroupNotif = async (title, body, token, category, id) => {
  try {
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: token,
      data: {
        category: category,
        id: id,
      },
    };

    const notif = firebaseAdmin.messaging().sendMulticast(message);
    return notif;
  } catch (error) {
    throw error;
  }
};

const deleteUserAccountInFirebaseById = async(uid) => {
  return firebaseAdmin.auth().deleteUser(uid);
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
  verifyFCMToken,
  firebaseSendNotif,
  firebaseSendGroupNotif,
  registerNewUserInFirebaseWithEmail,
  deleteUserAccountInFirebaseById
};

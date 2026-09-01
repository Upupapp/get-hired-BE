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
import axios from 'axios';

import env from "../env";

// SIGNOUT-DOESN'T-WORK-FOR-EMAIL/PASSWORD FIX: this previously used the
// stateful Firebase Client SDK (getAuth(), a module-level SINGLETON Auth
// instance with its own auth.currentUser + background token-refresh timer)
// to sign in -- an SDK designed for a single-user, browser-like context,
// used here on a stateless multi-tenant Node server. Every email/password
// login shared and mutated the SAME process-wide Auth object. Google/
// LinkedIn sign-in (googleAuthController.js's exchangeGoogleTokenForFirebase,
// linkedinAuthController.js's token exchange) never had this problem: both
// already talk to Firebase's Identity Toolkit REST API directly -- a plain,
// stateless HTTP call with no persistent SDK session at all. Rewritten to
// match that same stateless pattern, eliminating the shared-singleton/
// background-refresh risk entirely rather than trying to reason about
// exactly how it interacted with revokeRefreshTokens().
const signInUserAndGetTokeninFirebase = async (email, password) => {
  try {
    const apiKey = env.apiKey;
    // LOCAL DEV ONLY: this REST call previously always hit the real Google
    // Identity Toolkit endpoint, bypassing FIREBASE_AUTH_EMULATOR_HOST
    // entirely -- unlike the Admin SDK (auto-redirects) and the old Client
    // SDK usage this replaced (connectAuthEmulator()). That silently broke
    // email/password login against the local Auth Emulator (real prod
    // EMAIL_NOT_FOUND for emulator-only accounts). Guarded exactly like the
    // Admin SDK / Client SDK emulator branches elsewhere in this codebase:
    // requires the env var AND a non-production NODE_ENV.
    const isProduction = process.env.NODE_ENV === "production";
    const emulatorHost = !isProduction && process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const url = emulatorHost
      ? `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`
      : 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + apiKey;
    const response = await axios.post(url, {
      email,
      password,
      returnSecureToken: true,
    }, { timeout: 10000 });

    const { idToken, refreshToken, localId: uid } = response.data;

    // The REST sign-in response doesn't include emailVerified -- decode it
    // off the token's own claims via Admin SDK, same double-verification
    // pattern already used by the Google/LinkedIn flows.
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);

    if (!decoded.email_verified) {
      await revokeTokenInFirebase(uid);
      const errorMessage =
        "Please Verify Email with the link sent to your registered email address.";
      throw Error(errorMessage);
    }

    return { uid, token: idToken, refreshToken };
  } catch (err) {
    // Firebase's REST API error shape is nested under response.data.error --
    // surface its message (e.g. INVALID_PASSWORD, EMAIL_NOT_FOUND) instead
    // of a generic Axios error object where available. The caller
    // (loginUserInDBAndFirebase) already validates the password against our
    // own DB copy before this ever runs, and the final user-facing message
    // is generic either way (userController.js's loginUser catch block), so
    // exact wording here only matters for server-side error logs.
    if (err && err.response && err.response.data && err.response.data.error) {
      throw Error(err.response.data.error.message || 'Authentication failed.');
    }
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

// GETHIRED_QA_REMEDIATION V1 -- JS-02/EM-10 (P0): generateEmailVerificationLink()
// called with no actionCodeSettings returns a link pointing at Firebase's own
// default hosted handler (https://<project>.firebaseapp.com/__/auth/action),
// never at this app's own /verify route -- even though the frontend
// (account-authentication.component.ts) and this backend's own verifyEmail()
// endpoint already exist specifically to receive mode/oobCode and finish the
// verification themselves. The received email link therefore never lands
// anywhere useful; only manually rebuilding the URL with the same oobCode
// against gethiredonline.app/verify worked (matches the QA finding exactly).
// handleCodeInApp: true makes Firebase append mode/oobCode/lang directly onto
// this app's own URL instead of routing through Firebase's hosted page first.
const sendEmailVerificationFirebase = async (email) => {
  try {
    const actionCodeSettings = {
      url: `${env.app_url}/verify`,
      handleCodeInApp: true,
    };
    const link = await firebaseAdmin
      .auth()
      .generateEmailVerificationLink(email, actionCodeSettings);
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

const updateUserPasswordInFirebase = async (uid, newPassword) => {
  return firebaseAdmin.auth().updateUser(uid, { password: newPassword });
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

const deleteUserAccountInFirebaseById = async (uid) => {
  return firebaseAdmin.auth().deleteUser(uid);
};

const createDynamicLink = async (postTitle, postDesc, postImage, postLink) => {
  const dynamicDomain = `${process.env.DYNAMIC_DOMAIN}`;
  const firebaseLink = `https://firebasedynamiclinks.googleapis.com/v1/shortLinks`;

  try {
    const data = {
      dynamicLinkInfo: {
        domainUriPrefix: `${dynamicDomain}`,
        link: `${process.env.APP_URL}/${postLink}`,
        socialMetaTagInfo: {
          socialTitle: postTitle,
          socialDescription: postDesc,
          socialImageLink: postImage,
        },
      },
      suffix: {
        option: "SHORT",
      },
    };
    const config = {
      method: "post",
      url: `${firebaseLink}?key=${env.apiKey}`,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    const dynamicLink = await axios.request(config);
    const dbResponse = dynamicLink.data;
    return dbResponse;
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
  verifyFCMToken,
  firebaseSendNotif,
  firebaseSendGroupNotif,
  registerNewUserInFirebaseWithEmail,
  deleteUserAccountInFirebaseById,
  createDynamicLink,
  updateUserPasswordInFirebase
};

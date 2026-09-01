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
  userMap,
} from "../helpers/userDetails";

import { getUserCompany } from "./companiesController";
import { verifyRecaptcha } from "../helpers/recaptcha";
import uploadInStorage, { uploadImageWithOptimization } from "../helpers/uploader";

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
  updateUserPasswordInFirebase,
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
  // TEMP DIAGNOSTIC (remove after root-cause capture): unconditional
  // deploy-liveness marker, unrelated to any error branch -- proves
  // whether this specific process restart actually picked up new code.
  if (req.query && req.query.diagPing === '1') {
    return res.status(200).json({ diagDeployMarker: 'a229b04-liveness-check' });
  }

  const { email, password, firstName, lastName, role, recaptchaToken } = req.body;

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

  // SEC-08 FIX: the frontend has rendered a reCAPTCHA widget on signup for
  // a long time, but nothing here ever verified the token -- see
  // helpers/recaptcha.js for the fail-open-until-configured rationale.
  const recaptchaResult = await verifyRecaptcha(recaptchaToken);
  if (!recaptchaResult.success) {
    return res.status(status.bad).json(errorResponse("reCAPTCHA verification failed. Please try again."));
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
    // TEMP DIAGNOSTIC (remove after root-cause capture): tag any error from
    // this specific step so the outer catch can report the sanitized
    // Firebase error CODE only -- never the raw message, stack, or any
    // credential material -- to pin down the production createUser()
    // failure without server log access.
    let userData;
    try {
      userData = await registerNewUserInFirebase(user);
    } catch (firebaseCreateErr) {
      firebaseCreateErr._diagStage = 'firebase_create_user';
      throw firebaseCreateErr;
    }

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
      return res.status(status.error).json(errorResponse("Failed to generate verification link. Please try again."));
    }

    return res.status(status.created).json(successResponse(dbRegister));
  } catch (err) {
    console.error('[registerUser] error:', err);
    // TEMP DIAGNOSTIC (remove after root-cause capture): surface only the
    // Firebase error CODE (a short enum string like "auth/invalid-argument",
    // never a message/stack/credential) when the failure is proven to
    // originate from the createUser() step specifically.
    if (err && err._diagStage === 'firebase_create_user') {
      return res.status(status.error).json({
        ...errorResponse("Registration failed. Please try again."),
        diagFirebaseErrorCode: (err && err.code) ? String(err.code).slice(0, 60) : 'no_code',
      });
    }
    return res.status(status.error).json(errorResponse("Registration failed. Please try again."));
  }
};

const logout = async (req, res) => {
  // SEC-07 FIX: uid from verified Firebase JWT only — never from caller-supplied query param.
  // verifyAuth middleware is now required on this route (userRoute.js).
  const uid = req.user.uid;

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

  if (isEmpty(oobCode)) {
    return res.status(status.bad).json(errorResponse("Missing verification code."));
  }

  try {
    const verify = await verifyEmailInFirebase(oobCode);
    return res.status(status.success).json(successResponse("Email Successfully verified. You may login."));
  } catch (err) {
    // EMAIL VERIFICATION AUDIT FIX: previously every failure (expired,
    // already-used, malformed, disabled account) returned the same 500
    // "Operation not successful" -- a 500 misrepresents an expected,
    // client-facing condition (an old/reused link) as a server error, and
    // gives the user no actionable next step. applyActionCode's own error
    // codes already distinguish these cases; surface them as a real 400
    // with a message that tells the user what to do, without leaking
    // Firebase internals.
    const code = err && err.code;
    console.error('[verifyEmail] error:', code, err && err.message);
    if (code === 'auth/expired-action-code') {
      return res.status(status.bad).json(errorResponse("This verification link has expired. Please request a new one."));
    }
    if (code === 'auth/invalid-action-code') {
      // Firebase returns this same code for both "malformed" and
      // "already used" -- it doesn't distinguish them, so neither can we.
      return res.status(status.bad).json(errorResponse("This verification link is invalid or has already been used. If your email isn't verified yet, request a new link."));
    }
    if (code === 'auth/user-disabled') {
      return res.status(status.bad).json(errorResponse("This account has been disabled."));
    }
    if (code === 'auth/user-not-found') {
      return res.status(status.bad).json(errorResponse("This verification link is no longer valid."));
    }
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

// GETHIRED_QA_REMEDIATION V1 Phase 2 (JS-21/JS-22, P1):
// - JS-21 (enumeration): this used to return status.success (200) with a
//   "sent" message for a known email, but let a thrown error (Firebase
//   throws for an unknown email -- generatePasswordResetLink rejects with
//   auth/user-not-found) fall through to the catch block's status.error
//   (500) with a different body. A known vs unknown email was trivially
//   distinguishable by HTTP status code alone. Now returns the exact same
//   200 + generic message in every case -- known email, unknown email, or
//   any internal failure -- and never leaks which one occurred.
// - JS-22 (delivery): send() was called without await and its result was
//   never checked (send() itself never throws by design -- see mailer.js --
//   so a misconfigured/failing provider was invisible here), meaning
//   "Link Send to your provided Email" was returned regardless of whether
//   the email actually went out. Delivery is now awaited and failures are
//   logged server-side (safe telemetry only, no token/secret values) so a
//   real production delivery problem is at least visible in logs, without
//   changing what the user sees (still the same generic message either way
//   -- see the enumeration fix above for why).
const GENERIC_RESET_MESSAGE = "If an account exists for this email, password reset instructions have been sent.";

const passwordResetLink = async (req, res) => {
  const { email } = req.query;

  if (isEmpty(email) || !isValidEmail(email)) {
    // Still generic -- an obviously malformed value gets the same response
    // as everything else, not a distinct "invalid email" signal.
    return res.status(status.success).json(successResponse(GENERIC_RESET_MESSAGE));
  }

  try {
    const pwRequestLink = await getForgetPwLinkInFirebase(email);
    const name = await getUserNameByEmail(email);
    const userRole = await getUserRoleByEmail(email);

    const mailResult = await send(email, "pw_reset", {
      url: pwRequestLink + `&role=${userRole}&email=${email}`,
      name,
      email,
    });

    if (!mailResult || !mailResult.sent) {
      console.warn('[passwordResetLink] Reset link generated but email delivery failed:', email, mailResult && mailResult.reason);
    }
  } catch (error) {
    // Covers "email not registered" (Firebase auth/user-not-found) and any
    // other internal failure alike -- safe to log in full server-side,
    // never surfaced to the caller.
    console.error('[passwordResetLink] error (not shown to caller):', email, error && error.message);
  }

  return res.status(status.success).json(successResponse(GENERIC_RESET_MESSAGE));
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
    roleTitle,
    department,
    shortBio,
    linkedinUrl,
    publicProfileEnabled,
    showPhotoPublicly,
    showTitlePublicly,
    showBioPublicly,
    showLinkedinPublicly,
    showEmailPublicly,
    showPhonePublicly,
  } = user;

  const updateQuery = `UPDATE ${dbSchema}.users
    SET firstname=$1, middlename=$2, lastname=$3, address=$4, city=$5, zip=$6,
    phone_number=$7, cell_number=$8,
    photo_url=CASE WHEN $9 != '' THEN $9::text ELSE photo_url END,
    date_of_birth=$10, is_profile_updated=true, updated_at=$11, gender=$12,
    role_title=$13, department=$14, short_bio=$15, linkedin_url=$16,
    public_profile_enabled=$17, show_photo_publicly=$18, show_title_publicly=$19,
    show_bio_publicly=$20, show_linkedin_publicly=$21, show_email_publicly=$22,
    show_phone_publicly=$23
    WHERE uid=$24 returning *`;

  try {
    var finalPhotoUrl = (photoUrl && photoUrl !== '') ? photoUrl : '';

    if (avatar && avatar !== '') {
      // role_id 2 = employer/recruiter, 3 = applicant; default to applicant_avatar
      var avatarPurpose = (user.roleId == 2 || user.role_id == 2) ? 'recruiter_avatar' : 'applicant_avatar';
      var rawUrl = await uploadImageWithOptimization('profile', uid + '-thumb', avatar, avatarPurpose, { ownerType: 'user', ownerId: uid, createdBy: uid });
      if (rawUrl) {
        finalPhotoUrl = rawUrl;
      }
    }

    await updateUserProfileInFirebase(user);

    const { rows } = await dbQuery.query(updateQuery, [
      firstName || null,
      middleName || null,
      lastName || null,
      address || null,
      city || null,
      zip || null,
      phoneNumber || null,
      cellNumber || null,
      finalPhotoUrl,
      dateOfBirth || null,
      new Date(),
      gender || null,
      roleTitle || null,
      department || null,
      shortBio || null,
      linkedinUrl || null,
      publicProfileEnabled || false,
      showPhotoPublicly || false,
      showTitlePublicly || false,
      showBioPublicly || false,
      showLinkedinPublicly || false,
      showEmailPublicly || false,
      showPhonePublicly || false,
      uid,
    ]);

    const dbResponse = userMap({ uid: uid, ...rows[0] });
    return dbResponse;
  } catch (error) {
    throw 'Failed to update User profile. ' + error;
  }
};

const registerUserInDB = async (user) => {
  let roleBaseQuery = "";
  const insertQueryInCredentials = `Insert into ${dbSchema}.user_credentials
  (uid, email, "password", "role", created_date) values ($1, $2, $3, $4, current_timestamp) returning *;`;

  // STITCH QA11 FIX F-01: users.email was dropped in a DDL migration --
  // email lives on user_credentials only (see the same fix already applied
  // in interviewController.js and message.service.js). This INSERT was
  // missed at the time; still tried to write into users.email, which no
  // longer exists, crashing registration.
  const insertQueryInProfile = `
      Insert into ${dbSchema}.users
        (uid, firstname, lastname)
      values
        ($1, $2, $3) returning *;`;

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
      user.firstname,
      user.lastname,
    ]);

    const profileResponse = rows_profile.rows[0];

    if (!dbResponse || !profileResponse) {
      throw Error("User not save in DB");
    }

    const credentials = {
      id: profileResponse.uid,
      email: dbResponse.email,
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

  // EMAIL VERIFICATION AUDIT FIX: send() was previously called without
  // await and its result was never checked -- this function always
  // returned "Verification Link Sent" regardless of whether the email
  // actually went out. send() itself never throws (returns
  // {sent, reason} by design, see mailer.js), so this was silently
  // discarding real delivery failures (e.g. an unconfigured/invalid
  // SendGrid key locally -- every local backend boot logs "API key does
  // not start with 'SG.'"). The Firebase verification LINK is still
  // generated correctly regardless (that part doesn't depend on
  // SendGrid) -- only the EMAIL DELIVERY step was failing invisibly.
  const mailResult = await send(email, "verify_email", {
    verify_url: verify + `&role=${userRole}`,
    name: firstName,
    email,
  });

  if (!mailResult || !mailResult.sent) {
    console.warn('[getVerification] Verification link generated but email delivery failed:', email, mailResult && mailResult.reason);
  }

  return { linkGenerated: true, emailSent: !!(mailResult && mailResult.sent) };
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

// userMap is imported from helpers/userDetails.js — the single source of truth
// for the user response shape. The stale local copy was removed (STITCH fix):
// it omitted the 11 new employer-profile fields (roleTitle/department/shortBio/
// linkedinUrl/6 visibility booleans), causing updateProfile to return stale data.

const COMMON_PW_BLOCKLIST = [
  'password', 'password1', 'password12', 'password123', 'password1234',
  'qwerty123456', '123456789012', 'abcdefghijkl', 'letmein123456',
  'welcome12345', 'gethired123456', 'gethiredonline'
];

const changePasswordInSession = async (req, res) => {
  const uid = (req.user && req.user.uid) ? req.user.uid : null;
  if (!uid) {
    return res.status(403).json(errorResponse('Authentication required.'));
  }

  const currentPassword = (req.body && req.body.currentPassword) ? String(req.body.currentPassword) : '';
  const newPassword = (req.body && req.body.newPassword) ? String(req.body.newPassword) : '';
  const signOutOtherSessions = (req.body && req.body.signOutOtherSessions) ? true : false;
  const clientEventId = (req.body && req.body.clientEventId) ? String(req.body.clientEventId).substring(0, 64) : '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'missing_fields', message: 'Current and new password are required.' },
      feedback: { state: 'weak_password', title: 'Missing fields', body: 'Please enter your current and new password.', primaryCta: 'Try again' }
    });
  }

  if (newPassword.length < 12) {
    return res.status(400).json({
      success: false,
      error: { code: 'weak_password', message: 'Use at least 12 characters.' },
      feedback: { state: 'weak_password', title: 'Choose a stronger password', body: 'Use at least 12 characters and avoid common passwords.', primaryCta: 'Review password' }
    });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({
      success: false,
      error: { code: 'weak_password', message: 'Password is too long. Use fewer than 128 characters.' },
      feedback: { state: 'weak_password', title: 'Password is too long', body: 'Please use a password with fewer than 128 characters.', primaryCta: 'Review password' }
    });
  }

  try {
    const credResult = await dbQuery.query(
      'SELECT uc.email, uc.password AS pw_hash, u.firstname FROM ' + dbSchema + '.user_credentials uc LEFT JOIN ' + dbSchema + '.users u ON u.uid = uc.uid WHERE uc.uid = $1',
      [uid]
    );

    if (!credResult || !credResult.rows || !credResult.rows[0]) {
      return res.status(404).json(errorResponse('User not found.'));
    }

    const userRecord = credResult.rows[0];
    const userEmail = userRecord.email || '';
    const storedHash = userRecord.pw_hash || '';
    const firstName = userRecord.firstname || '';

    if (!comparePassword(storedHash, currentPassword)) {
      console.error('[changePasswordInSession] wrong-current-password uid=' + uid.substring(0, 8));
      return res.status(401).json({
        success: false,
        error: { code: 'wrong_current_password', message: "We couldn't confirm your current password. Please check it and try again." },
        feedback: { state: 'wrong_current_password', title: "We couldn't confirm your current password", body: "Please check your current password and try again.", primaryCta: 'Try again', secondaryCta: 'Forgot password?' }
      });
    }

    const lowerNew = newPassword.toLowerCase();
    const isCommon = COMMON_PW_BLOCKLIST.some(function(b) { return lowerNew === b.toLowerCase(); });
    if (isCommon) {
      return res.status(400).json({
        success: false,
        error: { code: 'weak_password', message: 'Choose a password that is harder to guess.' },
        feedback: { state: 'weak_password', title: 'Choose a stronger password', body: 'Use at least 12 characters and avoid common passwords or passwords used on other sites.', primaryCta: 'Review password' }
      });
    }

    const emailLocal = (userEmail.indexOf('@') > 0) ? userEmail.split('@')[0] : '';
    if (emailLocal.length > 3 && lowerNew.indexOf(emailLocal.toLowerCase()) !== -1) {
      return res.status(400).json({
        success: false,
        error: { code: 'weak_password', message: 'Avoid using your email address in your password.' },
        feedback: { state: 'weak_password', title: 'Choose a stronger password', body: 'Avoid using your email address in your password.', primaryCta: 'Review password' }
      });
    }

    if (comparePassword(storedHash, newPassword)) {
      return res.status(400).json({
        success: false,
        error: { code: 'same_as_old', message: 'Your new password must be different from your current password.' },
        feedback: { state: 'same_as_old', title: 'Choose a different password', body: 'Your new password must be different from your current password.', primaryCta: 'Try again' }
      });
    }

    await updateUserPasswordInFirebase(uid, newPassword);

    const newHash = hashPassword(newPassword);
    await dbQuery.query(
      'UPDATE ' + dbSchema + '.user_credentials SET password = $1 WHERE uid = $2',
      [newHash, uid]
    );

    let otherSessionsRevoked = false;
    if (signOutOtherSessions) {
      try {
        await revokeTokenInFirebase(uid);
        otherSessionsRevoked = true;
      } catch (revokeErr) {
        console.error('[changePasswordInSession] token revocation failed uid=' + uid.substring(0, 8));
      }
    }

    let notificationSent = false;
    try {
      const mailResult = await send(userEmail, 'pw_changed', { name: (firstName || 'there'), email: userEmail });
      notificationSent = (mailResult && mailResult.sent) ? true : false;
    } catch (mailErr) {
      console.error('[changePasswordInSession] notification email error uid=' + uid.substring(0, 8));
    }

    console.log('[changePasswordInSession] success uid=' + uid.substring(0, 8) + ' revoked=' + otherSessionsRevoked + ' notified=' + notificationSent + ' eventId=' + clientEventId);

    return res.status(200).json({
      success: true,
      copyKey: 'account.password.change.success',
      feedback: {
        state: 'success',
        title: 'Password updated',
        body: 'Your GetHired password has been changed.',
        primaryCta: 'Done'
      },
      security: {
        notificationQueued: notificationSent,
        otherSessionsRevoked: otherSessionsRevoked
      },
      audit: { requestId: clientEventId }
    });

  } catch (err) {
    const errCode = (err && err.code) ? err.code : '';
    if (errCode === 'auth/id-token-expired' || errCode === 'auth/user-token-expired') {
      return res.status(401).json({
        success: false,
        error: { code: 'reauth_required', message: 'Sign in again before changing your password.' },
        feedback: { state: 'recent_login_required', title: 'Sign in again to change your password', body: 'For your security, please sign in again before changing your password.', primaryCta: 'Sign in again' }
      });
    }
    console.error('[changePasswordInSession] error uid=' + (uid ? uid.substring(0, 8) : 'unknown'));
    return res.status(500).json({
      success: false,
      error: { code: 'server_error', message: 'Please try again in a moment.' },
      feedback: { state: 'server_error', title: "Password wasn't updated", body: 'Your account is safe. Please try again in a moment.', primaryCta: 'Try again' }
    });
  }
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
  verifyEmailFileManually,
  changePasswordInSession
};

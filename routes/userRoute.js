import express from "express";
import {
  loginUser,
  registerUser,
  resendVerification,
  logout,
  verifyEmail,
  passwordResetLink,
  changePw,
  getUserProfile,
  updateUserProfile,
  getVerificationLink,
  verifyEmailFileManually,
  deleteAccountById,
  changePasswordInSession
} from "../controllers/userController";
import verifyAuth from '../middleware/verifyAuth';
import verifyRoles from '../middleware/verifyRoles';

const router = express.Router();

// SIGNOUT STALE-SESSION-CACHE FIX: getprofile is the one endpoint
// UnauthGuard (get-hired-FE src/app/shared/guard/unauth.guard.ts) calls to
// decide whether a browser tab claiming "still logged in" actually is --
// confirmed live that this response had no Cache-Control/Vary headers at
// all, meaning a 200 returned for one Authorization header could be replayed
// by a cache layer (browser/proxy) to a LATER request with a different or
// missing Authorization header, since caches key on URL+method only unless
// told to Vary on a header. That let a genuinely-signed-out session still
// read back as "logged in" and get bounced away from /signin. Same
// reasoning applies to logout's own response. no-store is the strongest
// directive (skips caching entirely, not just revalidation); Vary is
// defense in depth for any layer that ever ignores no-store.
function noStoreAuthResponse(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('Vary', 'Authorization');
  next();
}

router.post("/auth/signin", loginUser);
router.post("/auth/signup", registerUser);
router.post("/auth/resendverificationlink", resendVerification);
router.post("/auth/getverificationlink", getVerificationLink);
router.post("/auth/manualexcelverification", verifyAuth, verifyEmailFileManually);
router.post("/auth/logout", noStoreAuthResponse, verifyAuth, logout);
router.post("/auth/verifyemail", verifyEmail);
router.get("/auth/getpwresetlink", passwordResetLink);
router.post("/auth/changepassword", changePw);
router.get("/auth/getprofile", noStoreAuthResponse, verifyAuth, getUserProfile);
router.put("/auth/updateprofile", verifyAuth, updateUserProfile);
router.put("/auth/archive", verifyAuth, deleteAccountById);
router.post("/auth/account/change-password", verifyAuth, verifyRoles([2, 3]), changePasswordInSession);

export default router;

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
  deleteAccountById
} from "../controllers/userController";
import verifyAuth from '../middleware/verifyAuth';

const router = express.Router();

router.post("/auth/signin", loginUser);
router.post("/auth/signup", registerUser);
router.post("/auth/resendverificationlink", resendVerification);
router.post("/auth/getverificationlink", getVerificationLink);
router.post("/auth/manualexcelverification", verifyEmailFileManually);
router.post("/auth/logout", verifyAuth, logout);
router.post("/auth/verifyemail", verifyEmail);
router.get("/auth/getpwresetlink", passwordResetLink);
router.post("/auth/changepassword", changePw);
router.get("/auth/getprofile", verifyAuth, getUserProfile);
router.put("/auth/updateprofile", verifyAuth, updateUserProfile);
router.put("/auth/archive", verifyAuth, deleteAccountById);

export default router;

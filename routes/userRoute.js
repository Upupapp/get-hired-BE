import express from "express";
import {
  loginUser,
  registerUser,
  resendVerification,
  logout,
  verifyEmail,
  passwordResetLink,
  changePw
} from "../controllers/userController";

import { send } from "../helpers/mailer";

const router = express.Router();

router.post("/auth/signin", loginUser);
router.post("/auth/signup", registerUser);
router.post("/auth/resendverificationlink", resendVerification);
router.post("/auth/logout", logout);
router.post("/auth/verifyemail", verifyEmail);
router.get("/auth/getpwresetlink", passwordResetLink);
router.post("/auth/changepassword", changePw);

export default router;

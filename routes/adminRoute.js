import express from "express";
import verifyAuth from "../middleware/verifyAuth";

import { getUserProfile } from "../controllers/adminController";

const router = express.Router();

router.get("/admin/userprofile", verifyAuth, getUserProfile);

export default router;
import express from "express";
import {
  createApplication,
  updateApplication,
  deleteApplication,
} from "../controllers/applicantsController";

import { send } from "../helpers/mailer";

const router = express.Router();

router.post("/application/create", createApplication);
router.put("/application/updateJobs", updateApplication);
router.delete("/application/delete", deleteApplication);

export default router;

import express from "express";
import {
  createJobs,
  updateJob,
  deleteJob,
  getIndustryList,
  getBadgeList,
  getJobRoleList,
  getSetupList,
  getTypeList,
  getLevelList
} from "../controllers/jobsController";

import { send } from "../helpers/mailer";

const router = express.Router();

router.post("/jobs/create", createJobs);
router.put("/jobs/updateJobs", updateJob);
router.delete("/jobs/delete", deleteJob);

// job
router.get("/job/industries", getIndustryList);
router.get("/job/badges", getBadgeList);
router.get("/job/rolelist", getJobRoleList);
router.get("/job/setuplist", getSetupList);
router.get("/job/type", getTypeList);
router.get("/job/levels", getLevelList);


export default router;

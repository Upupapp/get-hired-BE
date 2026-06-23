import express from "express";
import {
  createJobs,
  updateJob,
  deleteJob,
  getIndustryList,
  getBadgeList,
  getJobRoleList,
  getCategoryList,
  getJobBasicListOfCompany,
  getExpiredJobListOfCompany,
  updateStatusOfJob,
  getAllPublishedJobs,
  getJobDetails,
  getJobShareableLink,
  getAllApplicantOfJob,
  getJobApplicantFitSignals,
  getJobApplicantDetails,
  deleteInterviewQuestion,
  getSubscriptionRestrictions
} from "../controllers/jobsController";

import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

// router.delete("/jobs/delete", deleteJob);

// job
router.post("/job/create", verifyAuth, createJobs);
router.put("/job/updatejobs", verifyAuth, updateJob);
router.get("/job/basiclist", verifyAuth, getJobBasicListOfCompany);
router.get("/job/expiredlist", verifyAuth, getExpiredJobListOfCompany);
router.get("/job/categories", verifyAuth, getCategoryList);
router.get("/job/industries", verifyAuth, getIndustryList);
router.get("/job/badges", verifyAuth, getBadgeList);
router.get("/job/rolelist", verifyAuth, getJobRoleList);
router.put("/job/changestatus", verifyAuth, updateStatusOfJob);
// SECURE fix: had no auth middleware at all -- exposed full applicant PII
// for any job to any caller. Controller now also verifies company ownership.
router.get("/job/applicants", verifyAuth, getAllApplicantOfJob);
// MATCH v5 -- Employer Applicant Fit Signals, additive and separate from
// the route above; auth-protected from creation, ownership check enforced
// inside the service layer (see employerApplicantSignalsService.js).
router.get("/job/applicants/signals", verifyAuth, getJobApplicantFitSignals);
router.get("/job/applicantdetails", verifyAuth, getJobApplicantDetails);
router.delete("/job/deleteinterviewquestion", verifyAuth, deleteInterviewQuestion);
router.get("/job/getsubscriptionrestrictions", verifyAuth, getSubscriptionRestrictions);

// public api
router.get("/job/published", getAllPublishedJobs);
router.get("/job/details", getJobDetails);
router.get("/job/sharelink", getJobShareableLink);



export default router;

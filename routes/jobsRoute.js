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
  getSubscriptionRestrictions,
  toggleSaveJobHandler
} from "../controllers/jobsController";

import verifyAuth from "../middleware/verifyAuth";
import optionalVerifyAuth from "../middleware/optionalVerifyAuth";
import {
  sanitizeJobContent,
  validateJobPublishPayload,
  auditJobChange,
} from "../middleware/jobMiddleware";

const router = express.Router();

// P2 FIX: route un-commented and registered with verifyAuth.
// The previous comment-out left the deleteJob controller dead code — no
// HTTP endpoint existed, meaning the FE fell back to archiving (status 4)
// rather than a true delete. Now registered as DELETE /job/delete with
// mandatory auth middleware; controller enforces ownership via
// getUserCompany(req.user.uid) + AND company_id=$2 in the WHERE clause.
router.delete("/job/delete", verifyAuth, deleteJob);

// job — REVAMP v2: sanitizeJobContent + validateJobPublishPayload + auditJobChange
// added inline. Draft saves skip validateJobPublishPayload (statusId check inside).
// Controller still enforces company ownership via getUserCompanyForRequest (BOLA fix).
router.post("/job/create", verifyAuth, sanitizeJobContent, validateJobPublishPayload, auditJobChange, createJobs);
router.put("/job/updatejobs", verifyAuth, sanitizeJobContent, validateJobPublishPayload, auditJobChange, updateJob);
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
// SEC-02 FIX: optionalVerifyAuth verifies the token if present, passes
// req.user=null for anonymous callers, and returns 401 for invalid tokens.
// Controller derives viewerContext from req.user.uid only — never from uid query.
router.get("/job/details", optionalVerifyAuth, getJobDetails);
router.get("/job/sharelink", optionalVerifyAuth, getJobShareableLink);
// V6: save/unsave a job (authenticated applicants only; controller enforces role)
router.post("/job/save", verifyAuth, toggleSaveJobHandler);

export default router;

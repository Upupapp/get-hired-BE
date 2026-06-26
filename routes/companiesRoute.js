import express from "express";
import {
  createInitialCompany,
  getSpecificCompany,
  //   getSpecificCompany,
  //   getAllCreatedCompanies,
  //   deleteCompany,
  updateCompany,
  //   changeCompanyLogo,
  //   getNumberOfCompanies,
  //   assignCompany,
  //   getAllCompanies,
  getDashboard,
  getDashboardPipelineOverview,
  getAllCompanyUser,
  removeCompanyUser,
  addCompanyUser,
  getIndustryListCompany,
  // getSetupListCompany,
  getFeaturedCompanies,
  getCompanyShareableLink,
  getSubscriptionRestrictions,
  getAllCompanies,
  createCompanyFull
} from "../controllers/companiesController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

router.post("/company/createinitial", verifyAuth, createInitialCompany);
router.post("/company/createcompany", verifyAuth, createCompanyFull);
// SECURE fix: both routes had no auth middleware at all -- updateCompany
// also let any caller mutate any company via a body-supplied companyId,
// removeCompanyUser let any caller remove any user from any company. Both
// controllers now also verify the caller belongs to that company.
router.put("/company/update", verifyAuth, updateCompany);
router.get("/company/dashboard", verifyAuth, getDashboard);
router.get("/company/dashboard/pipeline-overview", verifyAuth, getDashboardPipelineOverview);
router.delete("/company/removecompanyuser", verifyAuth, removeCompanyUser);
router.get("/company/industries", verifyAuth, getIndustryListCompany);
// router.get("/company/setuplist", verifyAuth, getSetupListCompany);

// EDITED
router.post("/company/addcompanyuser", verifyAuth, addCompanyUser);
router.get("/company/getallcompanyuser", verifyAuth, getAllCompanyUser);
router.get("/company/usercompany", verifyAuth, getSpecificCompany);
router.get("/company/getsubscriptionrestrictions", verifyAuth, getSubscriptionRestrictions);

router.get("/company/details", getSpecificCompany);
router.get("/company/featured", getFeaturedCompanies);
router.get("/company/sharelink", getCompanyShareableLink);

router.get("/company/getAllCompanies", verifyAuth, getAllCompanies);

export default router;

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
  getAllCompanyUser,
  removeCompanyUser,
  addCompanyUser,
  getIndustryListCompany,
  getSetupListCompany,
  getFeaturedCompanies,
  getCompanyShareableLink
} from "../controllers/companiesController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

router.post("/company/createcompany", verifyAuth, createInitialCompany);
router.put("/company/update", updateCompany);
router.get("/company/dashboard", verifyAuth, getDashboard);
router.delete("/company/removecompanyuser", removeCompanyUser);
router.get("/company/industries", verifyAuth, getIndustryListCompany);
router.get("/company/setuplist", verifyAuth, getSetupListCompany);

// EDITED
router.post("/company/addcompanyuser", verifyAuth, addCompanyUser);
router.get("/company/getallcompanyuser", verifyAuth, getAllCompanyUser);
router.get("/company/usercompany", verifyAuth, getSpecificCompany);
router.get("/company/details", getSpecificCompany);
router.get("/company/featured", getFeaturedCompanies);
router.get("/company/sharelink", getCompanyShareableLink);


// router.get("/company/numbercompanies", getNumberOfCompanies);
// router.get("/company/allcompanies", getAllCompanies);
// router.post("/company/add", createCompany);
// router.get("/company/usercompanies", getAllCreatedCompanies);
// router.get("/company/:company_id", getSpecificCompany);
// router.delete("/company/delete", deleteCompany);
// router.post("/company/changelogo", changeCompanyLogo);
// router.post("/company/assigncompany", assignCompany);

export default router;

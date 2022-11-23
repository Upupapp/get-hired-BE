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
  assignEmployeeToCompany,
  addCompanyUser,
  getIndustryListCompany,
  getSetupListCompany,
  getFeaturedCompanies
} from "../controllers/companiesController";
import verifyAuth from "../middleware/verifyAuth";

const router = express.Router();

router.post("/company/createcompany", verifyAuth, createInitialCompany);
router.put("/company/update", updateCompany);
router.get("/company/dashboard", verifyAuth, getDashboard);
router.get("/company/getallcompanyuser", getAllCompanyUser);
router.delete("/company/removecompanyuser", removeCompanyUser);
router.post("/company/addcompanyuser", addCompanyUser);
router.post("/company/addcompanyuser", verifyAuth, assignEmployeeToCompany);
router.get("/company/industries", verifyAuth, getIndustryListCompany);
router.get("/company/setuplist", verifyAuth, getSetupListCompany);

// EDITED
router.get("/company/details", getSpecificCompany);
router.get("/company/featured", getFeaturedCompanies);



// router.get("/company/numbercompanies", getNumberOfCompanies);
// router.get("/company/allcompanies", getAllCompanies);
// router.post("/company/add", createCompany);
// router.get("/company/usercompanies", getAllCreatedCompanies);
// router.get("/company/:company_id", getSpecificCompany);
// router.delete("/company/delete", deleteCompany);
// router.post("/company/changelogo", changeCompanyLogo);
// router.post("/company/assigncompany", assignCompany);

export default router;

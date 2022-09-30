import express from "express";
import {
  createCompany,
  getSpecificCompany,
  getAllCreatedCompanies,
  deleteCompany,
  updateCompany,
  changeCompanyLogo,
  getNumberOfCompanies,
  assignCompany,
  getAllCompanies,
} from "../controllers/companiesController";

const router = express.Router();

router.get("/company/numbercompanies", getNumberOfCompanies);
router.get("/company/allcompanies", getAllCompanies);
router.post("/company/add", createCompany);
router.get("/company/usercompanies", getAllCreatedCompanies);
router.get("/company/:company_id", getSpecificCompany);
router.delete("/company/delete", deleteCompany);
router.put("/company/update", updateCompany);
router.post("/company/changelogo", changeCompanyLogo);
router.post("/company/assigncompany", assignCompany);

export default router;

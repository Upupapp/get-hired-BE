// GETHIRED_PUBLIC_COMPANY_PROFILE_REDESIGN_TRUST_JOBS_SEO_FULLSTACK_V3
// Public company routes — no auth required.
// Route order matters: /id/:companyId/resolve must come before /:slug
// to prevent "id" being treated as a slug.

import { Router } from "express";
import {
  getPublicCompanyProfile,
  getPublicCompanyJobs,
  resolveCompanyIdToSlug,
} from "../controllers/publicCompanyController";

const router = Router();

router.get("/public/company/id/:companyId/resolve", resolveCompanyIdToSlug);
router.get("/public/company/:slug/jobs", getPublicCompanyJobs);
router.get("/public/company/:slug", getPublicCompanyProfile);

export default router;

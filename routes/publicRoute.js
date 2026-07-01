// GETHIRED_PUBLIC_COMPANY_PROFILE_REDESIGN_TRUST_JOBS_SEO_FULLSTACK_V3
// V3 ADDENDUM: Follow Company endpoints added.
// Public company routes — no auth required (except follow/unfollow).
// Route order matters: /id/:companyId/resolve must come before /:slug
// to prevent "id" being treated as a slug.

import { Router } from "express";
import { withCache } from "../middleware/simpleCache";
import verifyAuth from "../middleware/verifyAuth";
import {
  getPublicCompaniesList,
  getPublicCompanyProfile,
  getPublicCompanyJobs,
  resolveCompanyIdToSlug,
  getPublicCompanyFollowState,
  followCompany,
  unfollowCompany,
} from "../controllers/publicCompanyController";

const router = Router();

// ─── Company list (no auth) ──────────────────────────────────────────────────
// Must come before /company/:slug to prevent "companies" matching as a slug.
router.get("/public/companies", withCache(180, 'public:companies'), getPublicCompaniesList);

// ─── Company profile & jobs (no auth) ────────────────────────────────────────
router.get("/public/company/id/:companyId/resolve", resolveCompanyIdToSlug);
router.get("/public/company/:slug/jobs", withCache(120, function(req) { return 'public:company:jobs:' + req.params.slug; }), getPublicCompanyJobs);
router.get("/public/company/:slug", withCache(300, function(req) { return 'public:company:' + req.params.slug; }), getPublicCompanyProfile);

// ─── Follow Company ───────────────────────────────────────────────────────────
// follow-state is optional-auth (handled inline; no middleware needed)
router.get("/public/companies/:slug/follow-state", getPublicCompanyFollowState);
// follow/unfollow require a valid Firebase token
router.post("/public/companies/:slug/follow", verifyAuth, followCompany);
router.delete("/public/companies/:slug/follow", verifyAuth, unfollowCompany);

export default router;

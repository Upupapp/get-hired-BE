/**
 * searchRoutes.js
 * Mounted under /api/search in server.js
 * No ?. or ?? — esm/Acorn compat.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { publicSearch, autocomplete, employerSearch, applicantSearch } from '../controllers/searchController';
import verifyAuth from '../middleware/verifyAuth';
import optionalVerifyAuth from '../middleware/optionalVerifyAuth';

var router = express.Router();

// Autocomplete: stricter anonymous rate limit (prevents scraping/abuse)
var autocompleteRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'too_many_requests', message: 'Too many autocomplete requests. Please slow down.' } },
  skip: function(req) {
    // Authenticated users get global limiter — only restrict anonymous
    return !!(req.headers && req.headers['authorization']);
  },
});

// Public search: optionalVerifyAuth (personalises response for logged-in users without blocking anonymous)
router.get('/public', optionalVerifyAuth, publicSearch);

// Autocomplete: optionally auth, but stricter anon rate limit
router.get('/autocomplete', autocompleteRateLimit, optionalVerifyAuth, autocomplete);

// Private search: requires authentication
router.get('/employer', verifyAuth, employerSearch);
router.get('/applicant', verifyAuth, applicantSearch);

export default router;

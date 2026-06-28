/**
 * imageRoutes.js
 * Routes for the unified image upload + optimization pipeline.
 *
 * POST /api/images/upload   — multipart upload, purpose-based optimization
 * GET  /api/images/:id      — metadata stub (Phase 4)
 *
 * No ?. or ?? — esm/Acorn compat.
 */

import express from 'express';
import { imageMulter, uploadImage, getImageById } from '../controllers/imageController';
import verifyToken from '../middleware/verifyAuth';
import rateLimit from 'express-rate-limit';

var router = express.Router();

// Rate limiter: 20 image uploads per 10 minutes per IP
var imageUploadLimiter = rateLimit({
  windowMs:   10 * 60 * 1000,
  max:        20,
  message: {
    success: false,
    error: {
      code:     'rate_limit_exceeded',
      message:  'Too many image uploads. Please wait a few minutes before trying again.',
      copyKey:  'imageUpload.rateLimit.body',
    },
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// POST /api/images/upload
// Auth required. Multipart file in field "file"; purpose in body.
router.post(
  '/upload',
  verifyToken,
  imageUploadLimiter,
  imageMulter.single('file'),
  uploadImage
);

// GET /api/images/:id
// Auth required for metadata lookup
router.get('/:id', verifyToken, getImageById);

export default router;

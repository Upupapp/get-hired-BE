import express from 'express';
import multer from 'multer';
import verifyAuth from '../middleware/verifyAuth';
import { uploadAndExtract, linkAndExtract } from '../controllers/easyJobPostController';

const router = express.Router();

// Memory storage — files are never written to disk.
// 10MB limit enforced both here and in the controller (belt-and-suspenders).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/recruiter/job-post-assistant/upload
// Accepts multipart/form-data with a single file field named "file".
router.post(
  '/recruiter/job-post-assistant/upload',
  verifyAuth,
  upload.single('file'),
  uploadAndExtract
);

// POST /api/recruiter/job-post-assistant/link
// Accepts JSON body { url: "https://..." }
router.post(
  '/recruiter/job-post-assistant/link',
  verifyAuth,
  linkAndExtract
);

export default router;

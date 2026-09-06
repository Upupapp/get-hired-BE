/**
 * fileDownloadRoutes.js
 * GET /api/files/download — proxies a candidate document from Firebase
 * Storage with Content-Disposition: attachment, so the browser always
 * performs a real download regardless of file type. See
 * fileDownloadController.js for why this exists.
 *
 * No ?. or ?? — esm/Acorn compat.
 */

import express from 'express';
import { downloadFile } from '../controllers/fileDownloadController';
import verifyToken from '../middleware/verifyAuth';

var router = express.Router();

router.get('/download', verifyToken, downloadFile);

export default router;

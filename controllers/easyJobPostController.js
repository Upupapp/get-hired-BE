/**
 * Easy Job Post Controller
 * Handles POST /api/recruiter/job-post-assistant/upload
 * and  POST /api/recruiter/job-post-assistant/link
 *
 * SYNTAX CONSTRAINT: NO optional chaining (?.) or nullish coalescing (??)
 * Use &&, ||, ternary only — enforced by esm v3.2.25 / Acorn parser.
 *
 * Security guarantees:
 *   - Company ID always derived from JWT (verifyAuth middleware), never from req.body
 *   - Magic-byte validation on all uploaded files
 *   - SSRF protection on URL imports (DNS + private-IP check in extraction service)
 *   - Files never persisted to disk — memoryStorage only
 *   - Extracted data is never auto-published (returns draft-ready payload only)
 */

import path from 'path';
import {
  validateDocumentMagicBytes,
  extractTextFromBuffer,
  extractTextFromUrl,
  mapTextToJobFields,
} from '../services/easyJobPostExtractionService';
import { getUserCompanyForRequest } from './companiesController';

var ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
var MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// POST /api/recruiter/job-post-assistant/upload
// Requires verifyAuth middleware before this handler.
export async function uploadAndExtract(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    // Verify company ownership (same pattern as jobsController)
    var companyId = await getUserCompanyForRequest(req, uid);
    if (!companyId) {
      return res.status(403).json({ message: 'No company associated with this account.' });
    }

    var file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Extension check
    var ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
      return res.status(422).json({
        message: 'Unsupported file type. Please upload a PDF, DOC, DOCX, TXT, or RTF file.',
      });
    }

    // Size check (multer limit handles this too, but belt-and-suspenders)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(422).json({ message: 'File is too large. Maximum size is 10MB.' });
    }

    // Magic-byte validation
    if (!validateDocumentMagicBytes(file.buffer, ext)) {
      return res.status(422).json({
        message: 'File content does not match its extension. Please upload a valid document.',
      });
    }

    // Extract text
    var rawText;
    try {
      rawText = await extractTextFromBuffer(file.buffer, ext);
    } catch (extractErr) {
      console.error('[EasyJobPost] Text extraction failed:', extractErr && extractErr.message);
      return res.status(422).json({
        message: 'Could not read the file content. Please try a different file format.',
      });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        message: 'The file appears to be empty or contains no readable text.',
      });
    }

    // Map to job fields
    var extractionResult = mapTextToJobFields(rawText);

    return res.status(200).json({
      success: true,
      source: 'upload',
      filename: file.originalname,
      extractedFields: extractionResult,
    });
  } catch (err) {
    console.error('[EasyJobPost] Upload extract error:', err && err.message);
    return res.status(500).json({ message: 'An error occurred while processing the file.' });
  }
}

// POST /api/recruiter/job-post-assistant/link
// Requires verifyAuth middleware before this handler.
export async function linkAndExtract(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    // Verify company ownership
    var companyId = await getUserCompanyForRequest(req, uid);
    if (!companyId) {
      return res.status(403).json({ message: 'No company associated with this account.' });
    }

    var body = req.body || {};
    var urlStr = body.url && typeof body.url === 'string' ? body.url.trim() : null;

    if (!urlStr) {
      return res.status(400).json({ message: 'Please provide a URL.' });
    }

    if (urlStr.length > 2048) {
      return res.status(422).json({ message: 'URL is too long.' });
    }

    // Extract text from URL (SSRF protection is inside extractTextFromUrl)
    var rawText;
    try {
      rawText = await extractTextFromUrl(urlStr);
    } catch (fetchErr) {
      var msg = (fetchErr && fetchErr.message) || 'Could not fetch the URL.';
      // Sanitize internal messages before returning
      if (msg.includes('private network') || msg.includes('resolve')) {
        return res.status(422).json({ message: 'The URL could not be reached or is not allowed.' });
      }
      return res.status(422).json({ message: 'Could not fetch the URL. Please check the link and try again.' });
    }

    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        message: 'The URL did not return any readable job content.',
      });
    }

    var extractionResult = mapTextToJobFields(rawText);

    return res.status(200).json({
      success: true,
      source: 'link',
      url: urlStr,
      extractedFields: extractionResult,
    });
  } catch (err) {
    console.error('[EasyJobPost] Link extract error:', err && err.message);
    return res.status(500).json({ message: 'An error occurred while processing the URL.' });
  }
}

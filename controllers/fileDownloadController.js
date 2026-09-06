/**
 * fileDownloadController.js
 * GET /api/files/download?url=<firebase-storage-url>&filename=<name>
 *
 * Proxies a Firebase Storage file through our own API so the browser can
 * force a real "Save As" download for every file type.
 *
 * BUGFIX (frontend candidate-documents Download button): clicking Download
 * on a PDF/image document silently did nothing -- Firebase Storage serves
 * these objects with Content-Disposition: inline and has no
 * Access-Control-Allow-Origin header on this bucket path, so a client-side
 * fetch/XHR to turn it into a downloadable blob is blocked by CORS, and a
 * plain link just opens a new tab that displays the file instead of saving
 * it (only file types the browser can't render at all, like .docx, ever
 * triggered a real download). Streaming the file through this endpoint
 * instead avoids the CORS restriction entirely (the browser's request goes
 * to our own API origin) and lets us set Content-Disposition: attachment
 * ourselves, so every file type downloads correctly regardless of what the
 * upstream Firebase object declares.
 *
 * SSRF guard: `url` must resolve to our own Firebase Storage bucket -- this
 * is a general-purpose proxy otherwise, and it's important this can't be
 * pointed at arbitrary internal/external hosts.
 *
 * No ?. or ?? -- esm/Acorn compat.
 */

import axios from 'axios';

var ALLOWED_HOST = 'firebasestorage.googleapis.com';
var ALLOWED_BUCKET_PATH = '/v0/b/get-hired-363107.appspot.com/o/';

export async function downloadFile(req, res) {
  try {
    var fileUrl = req.query && req.query.url;
    var filename = (req.query && req.query.filename) || 'download';

    if (!fileUrl || typeof fileUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'missing_url', message: 'A file url is required.' },
      });
    }

    var parsed;
    try {
      parsed = new URL(fileUrl);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: { code: 'invalid_url', message: 'The provided url is not valid.' },
      });
    }

    if (parsed.hostname !== ALLOWED_HOST || parsed.pathname.indexOf(ALLOWED_BUCKET_PATH) !== 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'url_not_allowed', message: 'This file source is not allowed.' },
      });
    }

    var upstream;
    try {
      upstream = await axios.get(fileUrl, { responseType: 'stream' });
    } catch (e) {
      var status = (e.response && e.response.status) || 502;
      return res.status(status >= 400 && status < 600 ? status : 502).json({
        success: false,
        error: { code: 'upstream_fetch_failed', message: "We couldn't retrieve this file." },
      });
    }

    var safeFilename = String(filename).replace(/["\r\n]/g, '');
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeFilename + '"');
    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type']);
    }
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }

    upstream.data.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'server_error', message: 'Something went wrong downloading this file.' },
    });
  }
}

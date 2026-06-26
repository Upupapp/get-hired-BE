# GetHired — File Upload Security Audit (SECURE 3)
**Date:** 2026-06-26

---

## Upload Architecture

GetHired uses a **base64-in-JSON-body** convention for file uploads (not multipart/multer). Files are encoded as data-URLs (`data:<mime>;base64,<data>`) in the request body, then decoded and uploaded to Firebase Storage via the Firebase Web SDK.

Upload path:
```
Client → POST /api/* (JSON body with base64 file) → Controller → uploadInStorage() → firebaseStorage
```

---

## Magic Byte Verification (`helpers/fileSignature.js`)

The `matchesDeclaredType(base64Data, declaredMimeType)` function verifies that the actual file bytes match the declared MIME type before upload.

**Covered types:**
- `application/pdf` — `%PDF` bytes at offset 0
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` — ZIP signature `PK..`
- `image/jpeg` — `ff d8 ff`
- `image/png` — 8-byte PNG signature
- `image/gif` — `GIF8`
- `image/webp` — `RIFF` + `WEBP` at offsets 0 and 8

**Pass-through for unchecked types:** Unknown MIME types pass through unchecked (`return true` when no signature registered). This is the intentional conservative approach — blocks known mismatches, doesn't break unknown legitimate types.

**Not covered:** Video uploads (`withCodecs=1` path in `uploader.js`). This is intentional and documented in `fileSignature.js` header — video container format verification is complex and out of scope.

---

## CV Upload Validation (`services/cvValidationService.js`)

Dedicated validation service for CV uploads:
- Accepted MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Max size: 5MB (enforced via base64 size estimation)
- Magic byte verification: `matchesDeclaredType()` called before accepting
- Specific error codes: `CV_FILE_REQUIRED`, `CV_FILE_TYPE_UNSUPPORTED`, `CV_FILE_TOO_LARGE`

---

## Upload Security Properties

| Property | Status | Evidence |
|---|---|---|
| MIME type allowlisting | PASS | CV: PDF/DOCX only; images: jpeg/png/gif/webp only |
| Magic byte verification | PASS | `fileSignature.js` + `cvValidationService.js` |
| File size limit | PASS | 5MB for CVs; `express.json` body limit: 1MB (base64 files in JSON body limited by this) |
| Auth before upload | PASS | All upload routes have verifyAuth |
| Filename sanitization | PASS | Filename is generated server-side (`${uid}-thumb`, `${jobId}-Banner`) or sanitized in cvBuilderController line 47 |
| Storage bucket path injection | PASS | Folder names are hardcoded strings, not user-derived |
| Content-Type nosniff header | PASS | `X-Content-Type-Options: nosniff` set in server.js middleware |

---

## Potential Issues

### Issue FU-1: Body size limit may not cover large base64 files
`express.json({ limit: '1mb' })` limits the entire JSON body to 1MB. A base64-encoded file at 1MB base64 corresponds to ~750KB raw file. For documents (CVs up to 5MB raw), the encoded data-URL would be ~6.7MB — **this would be rejected by the body parser limit before reaching the upload handler**.

**Impact:** Users cannot upload CVs larger than ~750KB via the current JSON body approach. The 5MB limit in `cvValidationService.js` is unreachable with the current 1MB body limit.

**Recommendation:** Either:
(a) Increase body limit to 10MB for upload endpoints only (apply selectively)
(b) Migrate to multipart/multer for file uploads (multer is installed but not wired)

### Issue FU-2: Video CV upload lacks magic byte verification
The `withCodecs=1` path in `uploader.js` skips magic byte verification. A malicious user could label any binary as a video MIME type. The file is uploaded to Firebase Storage under a known path pattern.

**Severity: LOW** — Firebase Storage rules control public access; file is not executed server-side. Documented limitation.

---

## Summary

| Check | Status |
|---|---|
| Auth before upload | PASS |
| MIME type allowlist | PASS |
| Magic byte verification (docs/images) | PASS |
| Magic byte verification (video) | NOT COVERED — documented |
| File size enforcement | PARTIALLY BROKEN — body limit (1MB) is tighter than stated CV limit (5MB) |
| Filename sanitization | PASS |
| Storage path injection | PASS |
| nosniff header | PASS |

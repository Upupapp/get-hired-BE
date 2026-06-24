// File-signature ("magic bytes") verification -- closes a real gap found
// during a SECURE pass on the upload pipeline: every upload (CVs, video
// CVs, profile/company images) trusted the client-DECLARED MIME type with
// no check against the actual file bytes. A malicious upload could label
// arbitrary content (e.g. HTML/JS) as application/pdf and bypass every
// MIME-based allowlist in the app, which is the classic file-upload-
// spoofing precursor to stored XSS if the storage CDN ever sniffs content
// instead of honoring the declared Content-Type.
//
// Deliberately scoped to the well-defined static-document/image types this
// app actually allowlists (cvValidationService.js, jobsController.js,
// companiesController.js). Video CV uploads use a different, multi-part
// data-URL shape in uploader.js (`withCodecs` path) and are NOT covered
// here -- verifying compressed video container signatures reliably is a
// separate, larger piece of work, not bundled into this fix. Unknown/
// unmapped MIME types are passed through unchecked rather than blocked,
// so this never breaks an upload path we haven't explicitly verified.

// Each signature is a sequence of bytes (as numbers) expected at a given
// byte offset (default 0) in the decoded file.
const SIGNATURES = {
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  // .docx/.xlsx/.pptx are all ZIP containers (OOXML) -- same ZIP signature.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK..
  ],
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/gif": [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
  ],
};

/**
 * Decodes only as many leading bytes as needed to check signatures --
 * never decodes the full file just to verify a header.
 */
const decodeLeadingBytes = (base64Data, byteCount) => {
  // 4 base64 chars decode to 3 bytes; round up generously, then slice.
  const charsNeeded = Math.ceil(byteCount / 3) * 4 + 4;
  const head = base64Data.slice(0, charsNeeded);
  return Buffer.from(head, "base64");
};

/**
 * Returns true if `base64Data`'s actual leading bytes match a known
 * signature for `declaredMimeType`, OR if declaredMimeType has no
 * registered signature (unverifiable types pass through unchanged).
 * Returns false only when the type IS registered and the bytes don't match.
 */
const matchesDeclaredType = (base64Data, declaredMimeType) => {
  const checks = SIGNATURES[declaredMimeType];
  if (!checks || !base64Data) return true;

  const maxOffsetEnd = Math.max(...checks.map((c) => c.offset + c.bytes.length));
  const buf = decodeLeadingBytes(base64Data, maxOffsetEnd);

  return checks.every((check) =>
    check.bytes.every((expected, i) => buf[check.offset + i] === expected)
  );
};

export { matchesDeclaredType, SIGNATURES };

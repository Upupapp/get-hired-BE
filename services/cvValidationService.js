// CVCOACH (v2 Product OS) -- file validation, separated from
// persistence/extraction per the registered architecture's pipeline
// ("file validation" is its own pipeline stage). Genuinely reusable the
// moment the applicant_cvs table exists -- this is not a stub, it's real
// logic that doesn't depend on the missing schema at all.

import { matchesDeclaredType } from "../helpers/fileSignature";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, consistent with typical resume upload limits

// Expects a data-URL string ("data:<mime>;base64,<data>"), matching the
// existing base64-in-JSON-body convention already used by
// saveDocuments/saveVideoCV in applicantsController.js -- kept consistent
// with the rest of this codebase rather than introducing multipart/multer
// (installed in package.json but not actually wired up anywhere).
const validateCvFile = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { valid: false, code: "CV_FILE_REQUIRED", message: "Please choose a CV file to upload." };
  }

  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!mimeMatch) {
    return { valid: false, code: "CV_FILE_TYPE_UNSUPPORTED", message: "That file type isn't supported. Upload a PDF or DOCX." };
  }

  const [, mimeType, base64Data] = mimeMatch;
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, code: "CV_FILE_TYPE_UNSUPPORTED", message: "That file type isn't supported. Upload a PDF or DOCX." };
  }

  // SECURE finding: a client can declare any mimeType in the data-URL
  // prefix regardless of the actual file content. Verify the real bytes
  // match before accepting -- catches a mislabeled file with a clear,
  // specific error here instead of a generic 500 surfacing from the
  // upload step later.
  if (!matchesDeclaredType(base64Data, mimeType)) {
    return { valid: false, code: "CV_FILE_TYPE_UNSUPPORTED", message: "That file doesn't look like a valid PDF or DOCX. Please re-export and try again." };
  }

  // Base64 encodes 3 bytes as 4 characters -- this is a standard, accurate
  // size estimate without needing to actually decode the buffer.
  const approxSizeBytes = Math.floor((base64Data.length * 3) / 4);
  if (approxSizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, code: "CV_FILE_TOO_LARGE", message: "That file is too large. Please upload a file under 5MB." };
  }

  return { valid: true, mimeType, approxSizeBytes };
};

export { validateCvFile, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES };

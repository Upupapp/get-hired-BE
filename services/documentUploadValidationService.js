// SEC-08 FIX (TAB 00/12 finding): applicant document uploads (resume,
// cover letter, government ID, etc. -- POST /applicant/docs, no
// documentType discriminator today, so this covers the whole family) had
// NO enforced size or MIME validation anywhere, frontend or backend --
// only a browser `accept` hint and *display-only* "X MB / 10 MB" text that
// nothing actually checked. Contrast: cvValidationService.js (the newer
// CV Builder upload path) already does this correctly; this mirrors that
// same shape/rigor for the broader, older document-upload path instead of
// leaving it unvalidated.

import { matchesDeclaredType } from "../helpers/fileSignature";

// Broader than cvValidationService's PDF/DOCX-only set because this path
// also carries non-resume documents (e.g. a government ID photo) -- all
// four image types already have registered signatures in fileSignature.js.
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// Matches the limit the upload UI has always displayed to users
// (file-upload-document.component.html's "X MB / 10 MB" text) -- that
// number was previously decorative only; this makes it real.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Expects a data-URL string ("data:<mime>;base64,<data>"), matching the
// existing base64-in-JSON-body convention this endpoint already uses.
const validateDocumentFile = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { valid: false, code: "DOCUMENT_FILE_REQUIRED", message: "Please choose a file to upload." };
  }

  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!mimeMatch) {
    return { valid: false, code: "DOCUMENT_FILE_TYPE_UNSUPPORTED", message: "That file type isn't supported. Upload a PDF, DOCX, JPG, PNG, GIF, or WEBP file." };
  }

  const [, mimeType, base64Data] = mimeMatch;
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, code: "DOCUMENT_FILE_TYPE_UNSUPPORTED", message: "That file type isn't supported. Upload a PDF, DOCX, JPG, PNG, GIF, or WEBP file." };
  }

  // A client can declare any mimeType in the data-URL prefix regardless of
  // the actual file content -- verify the real bytes match before accepting.
  if (!matchesDeclaredType(base64Data, mimeType)) {
    return { valid: false, code: "DOCUMENT_FILE_TYPE_UNSUPPORTED", message: "That file doesn't look like a valid file of the type it claims to be. Please re-export and try again." };
  }

  // Base64 encodes 3 bytes as 4 characters -- accurate size estimate
  // without decoding the full buffer.
  const approxSizeBytes = Math.floor((base64Data.length * 3) / 4);
  if (approxSizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, code: "DOCUMENT_FILE_TOO_LARGE", message: "That file is too large. Please upload a file under 10MB." };
  }

  return { valid: true, mimeType, approxSizeBytes };
};

export { validateDocumentFile, ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES };

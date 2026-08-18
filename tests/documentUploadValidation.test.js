/**
 * Document upload validation tests — SEC-08 fix (2026-08-18)
 *
 * Regression coverage for services/documentUploadValidationService.js: the
 * applicant document upload path (POST /applicant/docs) previously had no
 * enforced size or MIME validation at all, frontend or backend.
 *
 * Fixtures below are real, minimal, valid files of each type (not just
 * correctly-labeled garbage) so the magic-byte check is genuinely
 * exercised, not bypassed.
 *
 * Same convention as tests/sitemap.test.js and tests/auth-middleware.test.js:
 * the BE has no Jest config or test runner in package.json yet. These are
 * written as executable Jest tests and serve as an accurate, runnable spec
 * once test infra is added (see those files for the exact setup steps).
 */

const { validateDocumentFile, MAX_FILE_SIZE_BYTES } = require('../services/documentUploadValidationService.js');

// A real, valid 1x1 transparent PNG (matches image/png's registered magic bytes).
const TINY_VALID_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('validateDocumentFile (SEC-08)', () => {
  it('rejects a missing/empty file', () => {
    expect(validateDocumentFile('').valid).toBe(false);
    expect(validateDocumentFile(undefined).valid).toBe(false);
    expect(validateDocumentFile(null).code).toBe('DOCUMENT_FILE_REQUIRED');
  });

  it('rejects a value that is not a data-URL at all', () => {
    const result = validateDocumentFile('not-a-data-url');
    expect(result.valid).toBe(false);
    expect(result.code).toBe('DOCUMENT_FILE_TYPE_UNSUPPORTED');
  });

  it('accepts a real, correctly-typed PNG', () => {
    const result = validateDocumentFile(TINY_VALID_PNG);
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects a disallowed MIME type (e.g. text/csv) even if well-formed', () => {
    const csv = 'data:text/csv;base64,YSxiLGMK';
    const result = validateDocumentFile(csv);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('DOCUMENT_FILE_TYPE_UNSUPPORTED');
  });

  it('rejects a file whose declared MIME type does not match its real bytes', () => {
    // Real PNG bytes, falsely declared as a PDF.
    const mislabeled = TINY_VALID_PNG.replace('image/png', 'application/pdf');
    const result = validateDocumentFile(mislabeled);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('DOCUMENT_FILE_TYPE_UNSUPPORTED');
  });

  it('rejects a correctly-typed file over the size limit', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n');
    const padding = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024 - pdfHeader.length);
    const oversized = Buffer.concat([pdfHeader, padding]).toString('base64');
    const result = validateDocumentFile('data:application/pdf;base64,' + oversized);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('DOCUMENT_FILE_TOO_LARGE');
  });

  it('accepts a correctly-typed file comfortably under the size limit', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n%%EOF');
    const result = validateDocumentFile('data:application/pdf;base64,' + pdfHeader.toString('base64'));
    expect(result.valid).toBe(true);
    expect(result.approxSizeBytes).toBeLessThan(MAX_FILE_SIZE_BYTES);
  });
});

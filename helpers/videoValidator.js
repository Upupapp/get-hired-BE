// SEC-03: Video CV magic-byte and file-signature validation.
// Called from uploader.js for the withCodecs=1 (Video CV) upload path.
//
// Never throws: always returns { valid, code, message, container }.
// Checks actual file bytes against known-good video container signatures
// and known-bad non-video signatures, independent of the client-declared
// MIME type, file extension, RecordRTC Blob MIME, or Firebase metadata.
//
// Supported containers: WebM (EBML), MP4/M4V (ISO BMFF), QuickTime MOV.
// Rejected on sight:   PE/EXE, PDF, PNG, JPEG, GIF, ZIP, RAR.

const VIDEO_CV_MAX_BYTES = 100 * 1024 * 1024;

const DISALLOWED = [
  { name: 'PE/EXE', check: (b) => b[0] === 0x4D && b[1] === 0x5A },
  { name: 'PDF', check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { name: 'PNG', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  { name: 'JPEG', check: (b) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { name: 'GIF', check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  { name: 'ZIP', check: (b) => b[0] === 0x50 && b[1] === 0x4B },
  { name: 'RAR', check: (b) => b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21 },
];

const REJECTION_MESSAGES = {
  VIDEO_EMPTY: 'The video appears to be empty or incomplete. Please try recording again.',
  VIDEO_DISALLOWED: 'This file is not a supported video. Please record or upload an MP4, MOV, or WebM video.',
  VIDEO_SIGNATURE_MISMATCH: 'This file does not appear to be a valid video. Please record or upload an MP4, MOV, or WebM video.',
  VIDEO_TOO_LARGE: 'This video is too large (max 100 MB). Please record a shorter video.',
};

// Self-tests — positive and negative fixtures run once at module load.
// Catches regressions if signature byte arrays are accidentally mutated.
const _selfTest = () => {
  const webmHeader = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const mp4Header  = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]);
  const movHeader  = Buffer.from([0x00, 0x00, 0x00, 0x08, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]);
  const pdfHeader  = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);
  const exeHeader  = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);

  const ok = (label, cond) => {
    if (!cond) throw new Error('[videoValidator] self-test FAIL: ' + label);
  };

  ok('webm detected',        detectVideoContainer(webmHeader).container === 'webm');
  ok('mp4 detected',         detectVideoContainer(mp4Header).container  === 'mp4');
  ok('mov detected',         detectVideoContainer(movHeader).container  === 'mov');
  ok('pdf rejected',         detectVideoContainer(pdfHeader).code       === 'VIDEO_DISALLOWED');
  ok('exe rejected',         detectVideoContainer(exeHeader).code       === 'VIDEO_DISALLOWED');
  ok('empty rejected',       detectVideoContainer(Buffer.alloc(0)).code  === 'VIDEO_EMPTY');
  ok('webm valid overall',   validateVideoUpload(webmHeader.toString('base64')).valid === true);
  ok('pdf invalid overall',  validateVideoUpload(pdfHeader.toString('base64')).valid  === false);

  // Oversized fixture: valid WebM header padded past VIDEO_CV_MAX_BYTES.
  const oversized = Buffer.concat([webmHeader, Buffer.alloc(VIDEO_CV_MAX_BYTES)]);
  const oversizedResult = validateVideoUpload(oversized.toString('base64'));
  ok('oversized rejected',   oversizedResult.valid === false && oversizedResult.code === 'VIDEO_TOO_LARGE');
};

/**
 * Inspect leading bytes of a decoded video buffer and return the detected
 * container type, or a rejection code if the content is disallowed/unknown.
 */
const detectVideoContainer = (buffer) => {
  if (!buffer || buffer.length < 4) {
    return { container: 'empty', code: 'VIDEO_EMPTY' };
  }

  for (let i = 0; i < DISALLOWED.length; i++) {
    if (DISALLOWED[i].check(buffer)) {
      return { container: 'disallowed', code: 'VIDEO_DISALLOWED', detected: DISALLOWED[i].name };
    }
  }

  // WebM: EBML element ID 0x1A45DFA3 at offset 0
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { container: 'webm', code: null };
  }

  // ISO Base Media File Format: 'ftyp' box type at offset 4
  if (buffer.length >= 8 &&
      buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    if (buffer.length >= 12) {
      const brand = buffer.toString('ascii', 8, 12);
      if (brand === 'qt  ') {
        return { container: 'mov', code: null };
      }
    }
    return { container: 'mp4', code: null };
  }

  return { container: 'unknown', code: 'VIDEO_SIGNATURE_MISMATCH' };
};

/**
 * Validate a raw base64-encoded video (the `img` string extracted in
 * uploader.js withCodecs path, after stripping the data-URL prefix).
 *
 * @param {string} base64 Raw base64 with no "data:..." prefix.
 * @returns {{ valid: boolean, code: string|null, message: string|null, container: string }}
 */
const validateVideoUpload = (base64) => {
  try {
    if (!base64 || typeof base64 !== 'string' || base64.length === 0) {
      return { valid: false, code: 'VIDEO_EMPTY', message: REJECTION_MESSAGES.VIDEO_EMPTY, container: 'empty' };
    }

    // P0 FIX (TAB 10): VIDEO_CV_MAX_BYTES and REJECTION_MESSAGES.VIDEO_TOO_LARGE
    // were both defined but never actually checked anywhere -- interview-answer
    // and Video CV uploads had real container-signature validation but no
    // enforced size limit at all. Base64 encodes 3 bytes as 4 characters --
    // accurate size estimate without decoding the full buffer.
    const approxSizeBytes = Math.floor((base64.length * 3) / 4);
    if (approxSizeBytes > VIDEO_CV_MAX_BYTES) {
      return { valid: false, code: 'VIDEO_TOO_LARGE', message: REJECTION_MESSAGES.VIDEO_TOO_LARGE, container: 'unknown' };
    }

    // Decode only the first ~4 KB — sufficient for any container header
    const charsNeeded = Math.ceil(4096 / 3) * 4 + 4;
    const head = base64.slice(0, charsNeeded);
    const buffer = Buffer.from(head, 'base64');

    const result = detectVideoContainer(buffer);

    if (result.code) {
      const msg = REJECTION_MESSAGES[result.code] || REJECTION_MESSAGES.VIDEO_SIGNATURE_MISMATCH;
      return { valid: false, code: result.code, message: msg, container: result.container };
    }

    return { valid: true, code: null, message: null, container: result.container };
  } catch (err) {
    const safeMsg = (err && err.message && err.message.substring(0, 120)) || 'unknown';
    console.error('[videoValidator] Unexpected validation error:', safeMsg);
    return { valid: false, code: 'VIDEO_SIGNATURE_MISMATCH', message: REJECTION_MESSAGES.VIDEO_SIGNATURE_MISMATCH, container: 'unknown' };
  }
};

_selfTest();

export { validateVideoUpload, detectVideoContainer, VIDEO_CV_MAX_BYTES, REJECTION_MESSAGES };

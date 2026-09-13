/**
 * mediaSize.js — authoritative, server-measured byte size for uploaded media.
 *
 * WHY THIS EXISTS
 * Both document-upload paths (services/applicant.service.js and
 * services/application.service.js) previously destructured `size` straight off
 * the caller-supplied attachment object and wrote it to `documents."size"`.
 * The services hold the actual bytes and never measured them, so the stored
 * size was whatever the client claimed. An applicant reporting `size: 1` for a
 * 200 MB video under-counted that employer's Recruitment Storage meter
 * permanently, and no later reconciliation could detect it -- under the
 * per-employer billing ruling, storage totals are recomputed from link rows,
 * never from the object store, so a wrong size is never contradicted by
 * anything. Any storage metering or billing built on a client-supplied number
 * is forgeable by construction.
 *
 * Uploads arrive as data URLs ("data:<mime>;base64,<payload>", and a
 * codec-bearing variant for video -- see helpers/uploader.js). The decoded
 * length is computed arithmetically from the base64 payload rather than by
 * allocating a Buffer: a 150 MB video would otherwise be copied a second time
 * in memory purely to read its length.
 *
 * Node 14 / esm@3.2.25 safe: no ?. or ?? in this file.
 */

/**
 * Decoded byte length of a base64 payload, without decoding it.
 * base64 encodes 3 bytes as 4 characters; '=' padding marks the remainder.
 */
export function decodedByteLength(base64) {
  if (typeof base64 !== 'string' || base64.length === 0) return null;

  // Tolerate whitespace/newlines, which some clients insert into long payloads.
  var clean = base64.replace(/\s/g, '');
  if (clean.length === 0) return null;

  // A valid base64 body is a multiple of 4 characters. If it is not, the
  // payload is malformed or truncated -- report unknown rather than guess.
  if (clean.length % 4 !== 0) return null;

  var padding = 0;
  if (clean.charAt(clean.length - 1) === '=') padding++;
  if (clean.charAt(clean.length - 2) === '=') padding++;

  return (clean.length / 4) * 3 - padding;
}

/**
 * Measure a data-URL upload. Returns the byte count, or null when the input is
 * not a measurable data URL (an existing https:// URL being re-attached, an
 * empty field, a malformed payload).
 *
 * null means "unknown", never "zero" -- callers must not treat an unmeasurable
 * upload as costing no storage.
 */
export function measureDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length === 0) return null;

  var commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return null;

  var header = dataUrl.slice(0, commaIndex);
  // Only base64 data URLs are measurable this way. A percent-encoded data URL
  // would need decoding to measure and is not a shape this codebase produces.
  if (header.indexOf('base64') === -1) return null;

  return decodedByteLength(dataUrl.slice(commaIndex + 1));
}

/**
 * Resolve the size to persist for an attachment.
 *
 * Server measurement always wins. The caller-supplied value is used only when
 * there are no bytes to measure (the re-attach path, where an already-stored
 * file is linked to a new application) and is logged when it is relied upon,
 * so the remaining trust surface is visible in production rather than implied.
 *
 * @param {string} file        data URL of the upload, if any
 * @param {*}      claimedSize size supplied by the caller
 * @param {string} context     short label for the log line
 * @returns {number|null} bytes, or null if genuinely unknown
 */
export function resolveMediaSizeBytes(file, claimedSize, context) {
  var measured = measureDataUrlBytes(file);

  if (measured !== null) {
    var claimed = Number(claimedSize);
    // A mismatch is not an error -- clients legitimately report the pre-encode
    // size -- but a large discrepancy is worth surfacing, because it is also
    // what deliberate under-reporting looks like.
    if (isFinite(claimed) && claimed > 0 && Math.abs(claimed - measured) > measured * 0.25) {
      console.warn(
        '[mediaSize] claimed size differs materially from measured',
        { context: context, claimedBytes: claimed, measuredBytes: measured }
      );
    }
    return measured;
  }

  var fallback = Number(claimedSize);
  if (isFinite(fallback) && fallback >= 0) {
    console.log('[mediaSize] no bytes to measure; using caller-supplied size', {
      context: context, sizeBytes: fallback,
    });
    return fallback;
  }

  return null;
}

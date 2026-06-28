/**
 * imageProcessingService.js
 * Sharp-based image processing: auto-rotate, strip EXIF, resize, generate
 * responsive variants, apply quality presets, preserve transparency for logos.
 *
 * Node.js v20 on Linode — Sharp 0.33.x is safe.
 * No optional chaining (?.) or nullish coalescing (??) — esm/Acorn compat.
 */

import sharp from 'sharp';
import { getPolicyForPurpose, ALLOWED_INPUT_MIMES } from './imageUploadPolicyService';

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_PIXEL_COUNT = 25000000;   // 25 MP hard limit
const MAX_DIMENSION   = 8000;       // 8000px either side hard limit
const QUALITY_FLOOR   = 72;        // never go below this for any format

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate and decode a Buffer or base64 string as a real image.
 * Returns { width, height, format, hasAlpha, channels } or throws.
 */
export async function decodeAndValidateImage(input, maxBytes) {
  var buf = toBuffer(input);

  if (maxBytes && buf.length > maxBytes) {
    var err = new Error('IMAGE_TOO_LARGE');
    err.code = 'image_too_large';
    throw err;
  }

  var metadata;
  try {
    metadata = await sharp(buf).metadata();
  } catch (e) {
    var err2 = new Error('INVALID_IMAGE');
    err2.code = 'invalid_image_type';
    throw err2;
  }

  if (!metadata || !metadata.format) {
    var err3 = new Error('UNSUPPORTED_FORMAT');
    err3.code = 'unsupported_image_format';
    throw err3;
  }

  // Reject animated GIF / animated WebP
  if (metadata.pages && metadata.pages > 1) {
    var err4 = new Error('ANIMATED_NOT_SUPPORTED');
    err4.code = 'unsupported_image_format';
    throw err4;
  }

  var pixelCount = (metadata.width || 0) * (metadata.height || 0);
  if (pixelCount > MAX_PIXEL_COUNT) {
    var err5 = new Error('IMAGE_PIXEL_COUNT_TOO_LARGE');
    err5.code = 'image_dimensions_too_large';
    throw err5;
  }

  if ((metadata.width || 0) > MAX_DIMENSION || (metadata.height || 0) > MAX_DIMENSION) {
    var err6 = new Error('IMAGE_DIMENSION_TOO_LARGE');
    err6.code = 'image_dimensions_too_large';
    throw err6;
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha || false,
    channels: metadata.channels || 3,
    sizeBytes: buf.length,
  };
}

/**
 * Generate all responsive variants for a given purpose.
 * Returns an array of: { key, buffer, width, height, format, sizeBytes }
 * Never upscales beyond original dimensions.
 * Strips EXIF/GPS metadata from every output.
 */
export async function generateVariants(input, purpose) {
  var policy = getPolicyForPurpose(purpose);
  var buf = toBuffer(input);

  // Auto-rotate using EXIF orientation, then strip all metadata
  var rotated = await sharp(buf).rotate().toBuffer();

  var meta = await sharp(rotated).metadata();
  var srcWidth  = meta.width  || 0;
  var srcHeight = meta.height || 0;
  var hasAlpha  = meta.hasAlpha || false;

  var results = [];

  for (var i = 0; i < policy.variants.length; i++) {
    var variant = policy.variants[i];
    try {
      var variantResult = await _processVariant(
        rotated, variant, policy, srcWidth, srcHeight, hasAlpha
      );
      results.push(variantResult);
    } catch (ve) {
      // Non-fatal: log and skip this variant rather than aborting all
      console.error('[imageProcessingService] variant error', variant.key, ve.message);
    }
  }

  return results;
}

/**
 * Quick-optimize a single image without generating multiple variants.
 * Used for the transparent passthrough path when variant storage is not yet wired.
 * Returns { buffer, width, height, format, sizeBytes }
 */
export async function optimizeSingle(input, purpose) {
  var policy = getPolicyForPurpose(purpose);
  var buf = toBuffer(input);

  // Rotate + strip metadata
  var pipeline = sharp(buf).rotate().withMetadata(false);

  var meta = await sharp(buf).rotate().metadata();
  var srcWidth  = meta.width  || 0;
  var srcHeight = meta.height || 0;
  var hasAlpha  = meta.hasAlpha || false;

  // Find the "primary" variant definition
  var primaryDef = null;
  for (var i = 0; i < policy.variants.length; i++) {
    if (policy.variants[i].key === policy.primaryVariantKey) {
      primaryDef = policy.variants[i];
      break;
    }
  }

  if (!primaryDef) {
    // Fall back to first variant
    primaryDef = policy.variants[0];
  }

  // Apply resize
  var targetW = primaryDef.width;
  var targetH = primaryDef.height || null;
  var fit = primaryDef.fit || 'inside';

  // Never upscale
  if (targetW && targetW > srcWidth) { targetW = srcWidth; }
  if (targetH && targetH > srcHeight) { targetH = srcHeight; }

  var resizeOpts = { fit: fit, withoutEnlargement: true };
  if (targetW) { resizeOpts.width  = targetW; }
  if (targetH) { resizeOpts.height = targetH; }

  // Contain mode: use transparent background for alpha-supporting outputs
  if (fit === 'contain' && hasAlpha) {
    resizeOpts.background = { r: 0, g: 0, b: 0, alpha: 0 };
  } else if (fit === 'contain' && !hasAlpha) {
    resizeOpts.background = { r: 255, g: 255, b: 255, alpha: 1 };
  }

  pipeline = pipeline.resize(resizeOpts);

  // Format + quality
  var useFormat = _pickFormat(policy, hasAlpha);
  var quality = Math.max(QUALITY_FLOOR, policy.qualityWebP || 82);

  var outputBuffer;
  if (useFormat === 'webp') {
    outputBuffer = await pipeline.webp({ quality: quality, effort: 4 }).toBuffer();
  } else if (useFormat === 'png') {
    outputBuffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
  } else {
    var jpegQ = Math.max(QUALITY_FLOOR, policy.qualityJPEG || 82);
    outputBuffer = await pipeline.jpeg({ quality: jpegQ, progressive: true }).toBuffer();
  }

  var outMeta = await sharp(outputBuffer).metadata();

  return {
    key: policy.primaryVariantKey || 'optimized',
    buffer: outputBuffer,
    width: outMeta.width || targetW || srcWidth,
    height: outMeta.height || targetH || srcHeight,
    format: useFormat,
    sizeBytes: outputBuffer.length,
    mimeType: 'image/' + useFormat,
  };
}

// ── Private helpers ──────────────────────────────────────────────────────────

async function _processVariant(rotatedBuf, variantDef, policy, srcWidth, srcHeight, hasAlpha) {
  var pipeline = sharp(rotatedBuf).withMetadata(false);

  var targetW = variantDef.width  || null;
  var targetH = variantDef.height || null;
  var fit     = variantDef.fit    || 'inside';

  // Never upscale: if target > source, clamp to source
  if (targetW && targetW > srcWidth)  { targetW = srcWidth; }
  if (targetH && targetH > srcHeight) { targetH = srcHeight; }

  var resizeOpts = { fit: fit, withoutEnlargement: true };
  if (targetW) { resizeOpts.width  = targetW; }
  if (targetH) { resizeOpts.height = targetH; }

  if (fit === 'contain') {
    if (hasAlpha && policy.preserveAlpha) {
      resizeOpts.background = { r: 0, g: 0, b: 0, alpha: 0 };
    } else {
      resizeOpts.background = { r: 255, g: 255, b: 255, alpha: 1 };
    }
  }

  if (fit === 'cover') {
    resizeOpts.position = 'centre';
  }

  pipeline = pipeline.resize(resizeOpts);

  // Pick output format
  var useFormat = _pickFormat(policy, hasAlpha);
  var outBuf;

  if (useFormat === 'webp') {
    var quality = Math.max(QUALITY_FLOOR, policy.qualityWebP || 82);
    // Logos use lossless-like quality; clamp to 95 max
    if (quality > 95) { quality = 95; }
    outBuf = await pipeline.webp({ quality: quality, effort: 4 }).toBuffer();
  } else if (useFormat === 'png') {
    outBuf = await pipeline.png({ compressionLevel: 8 }).toBuffer();
  } else {
    var jpegQ = Math.max(QUALITY_FLOOR, policy.qualityJPEG || 82);
    outBuf = await pipeline.jpeg({ quality: jpegQ, progressive: true }).toBuffer();
  }

  var outMeta = await sharp(outBuf).metadata();

  return {
    key:      variantDef.key,
    buffer:   outBuf,
    width:    outMeta.width  || targetW  || srcWidth,
    height:   outMeta.height || targetH  || srcHeight,
    format:   useFormat,
    sizeBytes: outBuf.length,
    mimeType: 'image/' + useFormat,
  };
}

function _pickFormat(policy, hasAlpha) {
  // Logos/avatars: WebP with alpha support
  if (policy.preserveAlpha && hasAlpha) { return 'webp'; }
  // All other: WebP is primary output format
  if (policy.outputFormats && policy.outputFormats.indexOf('webp') !== -1) { return 'webp'; }
  if (policy.outputFormats && policy.outputFormats.indexOf('jpeg') !== -1) { return 'jpeg'; }
  return 'webp';
}

function toBuffer(input) {
  if (Buffer.isBuffer(input)) { return input; }
  if (typeof input === 'string') {
    // data-URL or raw base64
    var commaIdx = input.indexOf(',');
    var b64 = commaIdx !== -1 ? input.slice(commaIdx + 1) : input;
    return Buffer.from(b64, 'base64');
  }
  throw new Error('INVALID_INPUT_TYPE');
}

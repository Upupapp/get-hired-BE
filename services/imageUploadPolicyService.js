/**
 * imageUploadPolicyService.js
 * Defines allowed purposes, size limits, variant presets, quality settings,
 * and validation rules for every image type in GetHired.
 *
 * No optional chaining (?.) or nullish coalescing (??) — esm/Acorn compat.
 */

// ── Purposes ────────────────────────────────────────────────────────────────

export const IMAGE_PURPOSES = {
  COMPANY_LOGO: 'company_logo',
  COMPANY_BANNER: 'company_banner',
  JOB_BANNER: 'job_banner',
  JOB_SOCIAL_IMAGE: 'job_social_image',
  RECRUITER_AVATAR: 'recruiter_avatar',
  APPLICANT_AVATAR: 'applicant_avatar',
};

// ── Allowed input formats ───────────────────────────────────────────────────

export const ALLOWED_INPUT_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// SVG: disallowed by default — unsafe without sanitisation.
// GIF: disallowed — animated GIFs are not supported.
// HEIC/HEIF: disallowed — Sharp support inconsistent across distros.

// ── Per-purpose policy ──────────────────────────────────────────────────────

const POLICIES = {
  company_logo: {
    purpose: 'company_logo',
    maxUploadBytes: 5 * 1024 * 1024,           // 5 MB
    maxPixelCount: 25000000,                    // 25 MP
    maxDimension: 8000,
    minDimension: 64,
    allowedMimes: ALLOWED_INPUT_MIMES,
    outputFormats: ['webp'],
    qualityWebP: 92,
    qualityJPEG: null,
    variants: [
      { key: 'logo_64',  width: 64,  height: 64,  fit: 'contain' },
      { key: 'logo_128', width: 128, height: 128, fit: 'contain' },
      { key: 'logo_256', width: 256, height: 256, fit: 'contain' },
      { key: 'logo_512', width: 512, height: 512, fit: 'contain' },
    ],
    primaryVariantKey: 'logo_512',
    preserveAlpha: true,
    fitMode: 'contain',
    targetSizes: { 64: 15000, 128: 30000, 256: 70000, 512: 150000 },
  },

  company_banner: {
    purpose: 'company_banner',
    maxUploadBytes: 10 * 1024 * 1024,          // 10 MB
    maxPixelCount: 25000000,
    maxDimension: 8000,
    minDimension: 200,
    allowedMimes: ALLOWED_INPUT_MIMES,
    outputFormats: ['webp', 'jpeg'],
    qualityWebP: 82,
    qualityJPEG: 82,
    variants: [
      { key: 'banner_480',  width: 480,  height: null, fit: 'inside' },
      { key: 'banner_768',  width: 768,  height: null, fit: 'inside' },
      { key: 'banner_1200', width: 1200, height: null, fit: 'inside' },
      { key: 'banner_1600', width: 1600, height: null, fit: 'inside' },
      { key: 'banner_1920', width: 1920, height: null, fit: 'inside' },
    ],
    primaryVariantKey: 'banner_1200',
    preserveAlpha: false,
    fitMode: 'inside',
    targetSizes: { 480: 90000, 768: 150000, 1200: 250000, 1600: 350000, 1920: 500000 },
  },

  job_banner: {
    purpose: 'job_banner',
    maxUploadBytes: 10 * 1024 * 1024,
    maxPixelCount: 25000000,
    maxDimension: 8000,
    minDimension: 200,
    allowedMimes: ALLOWED_INPUT_MIMES,
    outputFormats: ['webp', 'jpeg'],
    qualityWebP: 82,
    qualityJPEG: 82,
    variants: [
      { key: 'job_banner_480',  width: 480,  height: null, fit: 'inside' },
      { key: 'job_banner_768',  width: 768,  height: null, fit: 'inside' },
      { key: 'job_banner_1200', width: 1200, height: null, fit: 'inside' },
      { key: 'job_banner_1600', width: 1600, height: null, fit: 'inside' },
      { key: 'job_social',      width: 1200, height: 630,  fit: 'cover'  },
    ],
    primaryVariantKey: 'job_banner_1200',
    preserveAlpha: false,
    fitMode: 'inside',
    targetSizes: { 480: 90000, 768: 150000, 1200: 260000, 1600: 400000, social: 300000 },
  },

  recruiter_avatar: {
    purpose: 'recruiter_avatar',
    maxUploadBytes: 5 * 1024 * 1024,
    maxPixelCount: 25000000,
    maxDimension: 8000,
    minDimension: 32,
    allowedMimes: ALLOWED_INPUT_MIMES,
    outputFormats: ['webp'],
    qualityWebP: 90,
    qualityJPEG: null,
    variants: [
      { key: 'avatar_64',  width: 64,  height: 64,  fit: 'cover' },
      { key: 'avatar_128', width: 128, height: 128, fit: 'cover' },
      { key: 'avatar_256', width: 256, height: 256, fit: 'cover' },
    ],
    primaryVariantKey: 'avatar_256',
    preserveAlpha: false,
    fitMode: 'cover',
    targetSizes: { 64: 12000, 128: 25000, 256: 60000 },
  },

  applicant_avatar: {
    purpose: 'applicant_avatar',
    maxUploadBytes: 5 * 1024 * 1024,
    maxPixelCount: 25000000,
    maxDimension: 8000,
    minDimension: 32,
    allowedMimes: ALLOWED_INPUT_MIMES,
    outputFormats: ['webp'],
    qualityWebP: 90,
    qualityJPEG: null,
    variants: [
      { key: 'avatar_64',  width: 64,  height: 64,  fit: 'cover' },
      { key: 'avatar_128', width: 128, height: 128, fit: 'cover' },
      { key: 'avatar_256', width: 256, height: 256, fit: 'cover' },
    ],
    primaryVariantKey: 'avatar_256',
    preserveAlpha: false,
    fitMode: 'cover',
    targetSizes: { 64: 12000, 128: 25000, 256: 60000 },
  },
};

export function getPolicyForPurpose(purpose) {
  var policy = POLICIES[purpose];
  if (!policy) {
    throw new Error('UNKNOWN_IMAGE_PURPOSE:' + purpose);
  }
  return policy;
}

export function isValidPurpose(purpose) {
  return !!POLICIES[purpose];
}

export function isAllowedMime(mime) {
  return ALLOWED_INPUT_MIMES.indexOf(mime) !== -1;
}

export default POLICIES;

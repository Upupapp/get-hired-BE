/**
 * imageController.js
 * Unified image upload endpoint: POST /api/images/upload
 * Accepts multipart/form-data (multer memoryStorage) for efficiency.
 *
 * Middleware chain (applied in imageRoutes.js):
 *   verifyAuth → uploadRateLimit → multer.single('file') → this handler
 *
 * No ?. or ?? — esm/Acorn compat.
 */

import multer from 'multer';
import { matchesDeclaredType } from '../helpers/fileSignature';
import {
  decodeAndValidateImage,
  generateVariants,
} from '../services/imageProcessingService';
import { getPolicyForPurpose, isValidPurpose, isAllowedMime } from '../services/imageUploadPolicyService';
import { saveImageVariantRecord } from '../services/imageMetadataRepository';
import firebase from 'firebase/compat';
import { firebaseConfig } from '../middleware/firebaseApp';

// ── Multer: memory storage (files as Buffer in req.file.buffer) ──────────────

export const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB multipart limit
});

// ── Firebase compat upload helper (shared with uploader.js pattern) ──────────

let _compatApp2;
function getApp() {
  if (!_compatApp2) {
    _compatApp2 = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);
  }
  return _compatApp2;
}

function uploadBufferToFirebase(storagePath, buffer, mimeType) {
  return new Promise(function(resolve, reject) {
    var b64 = buffer.toString('base64');
    var app = getApp();
    var uploadTask = app.storage().ref(storagePath).putString(b64, 'base64', { contentType: mimeType });

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      null,
      function(err) { reject(err); },
      function() {
        uploadTask.snapshot.ref.getDownloadURL().then(resolve).catch(reject);
      }
    );
  });
}

// ── Purpose → Firebase folder mapping ───────────────────────────────────────

var PURPOSE_FOLDERS = {
  company_logo:      'Company-Logo-Optimized',
  company_banner:    'Company-Banner-Optimized',
  job_banner:        'Job-Banner-Optimized',
  job_social_image:  'Job-Social-Optimized',
  recruiter_avatar:  'Profile-Optimized',
  applicant_avatar:  'Applicant-Profile-Optimized',
};

// ── Controller ────────────────────────────────────────────────────────────────

export async function uploadImage(req, res) {
  try {
    // 1. Validate purpose field
    var purpose = (req.body && req.body.purpose) ? req.body.purpose : '';
    if (!purpose || !isValidPurpose(purpose)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'invalid_image_purpose',
          message: 'A valid image purpose is required.',
          copyKey: 'imageUpload.error.invalidPurpose',
        },
      });
    }

    // 2. File must be present (multer puts it in req.file)
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'invalid_image_type',
          message: 'No image file was received.',
          copyKey: 'imageUpload.error.noFile',
        },
      });
    }

    var policy = getPolicyForPurpose(purpose);
    var file   = req.file;
    var mime   = file.mimetype || '';

    // 3. MIME allowlist
    if (!isAllowedMime(mime)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'unsupported_image_format',
          message: 'Please use JPG, PNG, or WebP.',
          copyKey: 'imageUpload.unsupported.body',
        },
      });
    }

    // 4. File size
    if (file.size > policy.maxUploadBytes) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'image_too_large',
          message: 'This image is too large to upload.',
          copyKey: 'imageUpload.tooLarge.body',
        },
        limits: {
          maxUploadMb: Math.round(policy.maxUploadBytes / (1024 * 1024)),
          recommended: 'Use a JPG, PNG, or WebP image under ' + Math.round(policy.maxUploadBytes / (1024 * 1024)) + 'MB.',
        },
      });
    }

    // 5. Magic-byte validation (buffer-based: convert to base64 to reuse existing helper)
    var b64forValidation = file.buffer.toString('base64');
    if (!matchesDeclaredType(b64forValidation, mime)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'unsafe_image_rejected',
          message: 'For security, please upload a standard JPG, PNG, or WebP image.',
          copyKey: 'imageUpload.unsafe.body',
        },
      });
    }

    // 6. Server-side decode + dimension validation
    var imageInfo;
    try {
      imageInfo = await decodeAndValidateImage(file.buffer, policy.maxUploadBytes);
    } catch (validErr) {
      var errCode = validErr.code || 'invalid_image_type';
      return res.status(422).json({
        success: false,
        error: {
          code: errCode,
          message: 'We could not read this image. Please try a different JPG, PNG, or WebP file.',
          copyKey: 'imageUpload.processingFailed.body',
        },
      });
    }

    if (imageInfo.width < policy.minDimension || imageInfo.height < policy.minDimension) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'image_dimensions_too_small',
          message: 'Image is too small. Minimum ' + policy.minDimension + 'px.',
          copyKey: 'imageUpload.error.tooSmall',
        },
        limits: { minDimension: policy.minDimension },
      });
    }

    // 7. Generate all variants
    var variants;
    try {
      variants = await generateVariants(file.buffer, purpose);
    } catch (procErr) {
      console.error('[imageController] variant generation failed:', procErr.message);
      return res.status(500).json({
        success: false,
        error: {
          code: 'image_processing_failed',
          message: "We couldn't optimize this image.",
          copyKey: 'imageUpload.processingFailed.title',
        },
        feedback: {
          state: 'error',
          title: "Image wasn't processed",
          body: 'Please try a different JPG, PNG, or WebP image.',
          primaryCta: 'Try again',
        },
      });
    }

    // 8. Upload all variants to Firebase Storage
    var folder = PURPOSE_FOLDERS[purpose] || 'Optimized-Images';
    var ownerPrefix = (req.user && req.user.uid) ? req.user.uid : 'unknown';
    var ts = Date.now();

    var uploadedVariants = [];
    var primaryUrl = null;

    for (var vi = 0; vi < variants.length; vi++) {
      var v = variants[vi];
      var storagePath = folder + '/' + ownerPrefix + '_' + ts + '_' + v.key + '.' + v.format;
      try {
        var varUrl = await uploadBufferToFirebase(storagePath, v.buffer, v.mimeType);
        var varRecord = {
          key:      v.key,
          width:    v.width,
          height:   v.height,
          format:   v.format,
          sizeBytes: v.sizeBytes,
          url:      varUrl,
        };
        uploadedVariants.push(varRecord);
        if (v.key === policy.primaryVariantKey) {
          primaryUrl = varUrl;
        }
      } catch (uploadErr) {
        console.error('[imageController] variant upload failed:', v.key, uploadErr.message);
        // Non-fatal: skip variant, continue
      }
    }

    if (uploadedVariants.length === 0) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'storage_failed',
          message: 'Image upload failed. Please try again.',
          copyKey: 'imageUpload.processingFailed.body',
        },
      });
    }

    // Use first available if primary variant upload failed
    if (!primaryUrl && uploadedVariants.length > 0) {
      primaryUrl = uploadedVariants[uploadedVariants.length - 1].url;
    }

    // 9. Save metadata (non-fatal)
    var uid = (req.user && req.user.uid) ? req.user.uid : null;
    var totalOptimizedBytes = uploadedVariants.reduce(function(acc, v2) { return acc + v2.sizeBytes; }, 0);
    var savingsBytes = file.size - (uploadedVariants[0] ? uploadedVariants[0].sizeBytes : file.size);
    var savingsPct   = file.size > 0 ? parseFloat(((savingsBytes / file.size) * 100).toFixed(1)) : 0;

    var imageId = await saveImageVariantRecord({
      ownerType:       'unknown', // caller may enrich later via update
      ownerId:         uid || '',
      purpose:         purpose,
      originalSizeBytes: file.size,
      originalWidth:   imageInfo.width,
      originalHeight:  imageInfo.height,
      originalMime:    mime,
      variants:        uploadedVariants,
      primaryVariantKey: policy.primaryVariantKey,
      primaryUrl:      primaryUrl,
      savingsBytes:    Math.max(0, savingsBytes),
      savingsPercent:  Math.max(0, savingsPct),
      createdBy:       uid,
    });

    // 10. Build srcset string
    var srcsetParts = uploadedVariants
      .filter(function(v3) { return v3.width; })
      .map(function(v3) { return v3.url + ' ' + v3.width + 'w'; });
    var srcset = srcsetParts.join(', ');

    // 11. Success response
    return res.status(200).json({
      success: true,
      image: {
        id:      imageId || null,
        purpose: purpose,
        status:  'processed',
        original: {
          width:     imageInfo.width,
          height:    imageInfo.height,
          sizeBytes: file.size,
          mime:      mime,
        },
        optimized: {
          totalSizeBytes:  uploadedVariants[0] ? uploadedVariants[0].sizeBytes : 0,
          savingsPercent:  savingsPct,
          qualityMode:     purpose + '_quality',
        },
        variants:    uploadedVariants,
        srcset:      srcset || null,
        fallbackUrl: primaryUrl,
        primaryUrl:  primaryUrl,
      },
      feedback: {
        state:      'success',
        title:      'Image optimized',
        body:       'Your image is ready and optimized for fast, high-quality display.',
        primaryCta: 'Done',
      },
    });

  } catch (err) {
    console.error('[imageController] unhandled error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'unknown_error',
        message: 'An unexpected error occurred. Please try again.',
        copyKey: 'imageUpload.processingFailed.body',
      },
    });
  }
}

/**
 * GET /api/images/:imageId — return display-safe metadata
 */
export async function getImageById(req, res) {
  // Stub: metadata lookup from image_variants by id
  return res.status(200).json({ success: true, message: 'Image metadata lookup — coming in Phase 4.' });
}

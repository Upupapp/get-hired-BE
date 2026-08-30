import firebase from "firebase/compat";
import { firebaseConfig } from "../middleware/firebaseApp";
import { matchesDeclaredType } from "./fileSignature";
import { validateVideoUpload } from "./videoValidator";
import { optimizeSingle, generateVariants, decodeAndValidateImage } from "../services/imageProcessingService";
import { getPolicyForPurpose, isAllowedMime } from "../services/imageUploadPolicyService";
import { saveImageVariantRecord } from "../services/imageMetadataRepository";

// Initialise (or reuse) the compat Firebase app exactly once so that
// repeated calls to uploadInStorage do not throw "Firebase App named
// '[DEFAULT]' already exists".
let _compatApp;
function getCompatApp() {
  if (!_compatApp) {
    // firebase.apps is the compat SDK's app registry.
    _compatApp = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);
  }
  return _compatApp;
}

const uploadInStorage = (folder, fileName, uploadedFile, withCodecs = 0) =>
  new Promise((resolve, reject) => {
    let img = "";
    let imgType = uploadedFile.slice(
      uploadedFile.indexOf(":") + 1,
      uploadedFile.indexOf(";")
    );

    if (withCodecs == 0) {
      console.log("Uploading image ...");

      img = uploadedFile.slice(uploadedFile.indexOf(",") + 1);

      // SECURE finding: verify the actual file bytes match the declared
      // MIME type before ever uploading to Storage -- only for the
      // statically-checkable document/image types we have signatures for
      // (video's withCodecs path below is a different data-URL shape and
      // isn't covered, see helpers/fileSignature.js header comment).
      if (!matchesDeclaredType(img, imgType)) {
        reject(new Error("FILE_CONTENT_MISMATCH"));
        return;
      }
    } else {
      console.log("Uploading video ...");
      let result = uploadedFile.substring(uploadedFile.indexOf(";") + 1);
      let result2 = result.substring(result.indexOf(";") + 1);
      img = result2.slice(result2.indexOf(",") + 1);

      // SEC-03: validate actual video container bytes before uploading to Storage.
      // Never trust declared MIME, file extension, or RecordRTC Blob MIME alone.
      const videoValidation = validateVideoUpload(img);
      if (!videoValidation.valid) {
        const validationErr = new Error(videoValidation.message || "Video validation failed");
        validationErr.code = videoValidation.code || "VIDEO_SIGNATURE_MISMATCH";
        reject(validationErr);
        return;
      }
      console.log("Video validated:", videoValidation.container);
    }

    const app = getCompatApp();

    const uploadTask = app
      .storage()
      .ref(folder)
      .child(fileName)
      .putString(img, "base64", { contentType: imgType });

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.log(error);
        // An error occurred so inform the caller
        reject(error);
      },
      async () => {
        const imgURL = await uploadTask.snapshot.ref.getDownloadURL();
        console.log("uploaded image: " + imgURL);

        // We 'awaited' the imgURL, now resolve this Promise
        resolve(imgURL);
      }
    );
  });

export default uploadInStorage;

// Best-effort Storage cleanup for a file we're replacing (e.g. CV Builder's
// "replace CV" -- see cvBuilderController.js's uploadCv()). Accepts the same
// public download URL getDownloadURL() (above) returns; refFromURL() handles
// that format directly, no manual path parsing needed. Never throws -- a
// failure here must never block or fail the caller's actual request (the DB
// row is already deleted by the time this runs; a stray orphaned blob in
// Storage is a cheap, non-urgent cleanup miss, not a correctness problem).
export async function deleteFromStorageByUrl(fileUrl) {
  if (!fileUrl) return;
  try {
    const app = getCompatApp();
    await app.storage().refFromURL(fileUrl).delete();
  } catch (err) {
    console.error('[uploader] deleteFromStorageByUrl failed (non-blocking):', err && err.message);
  }
}

// ── Firebase admin bucket helper ─────────────────────────────────────────────

function getAdminBucket() {
  try {
    var adminSdk = require('firebase-admin');
    return adminSdk.storage().bucket();
  } catch (e) {
    return null;
  }
}

/**
 * Upload a raw Buffer to Firebase Storage via the Admin SDK.
 * Returns the public download URL.
 */
async function uploadBufferToStorage(folder, fileName, buffer, mimeType) {
  return new Promise(function(resolve, reject) {
    var app = getCompatApp();
    var ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] || 'webp';
    var fullPath = folder + '/' + fileName + '.' + ext;

    var ref = app.storage().ref(fullPath);
    ref.put(buffer, { contentType: mimeType }).then(function(snapshot) {
      return snapshot.ref.getDownloadURL();
    }).then(function(url) {
      resolve(url);
    }).catch(function(err) {
      reject(err);
    });
  });
}

/**
 * uploadImageWithOptimization
 * Drop-in replacement for uploadInStorage for image uploads.
 * - Validates magic bytes (existing behaviour)
 * - Optimizes via Sharp: strips EXIF, generates responsive variants
 * - Uploads primary optimized variant to Firebase Storage
 * - Saves metadata to image_variants table (non-fatal on failure)
 * - Returns primary display URL (same contract as uploadInStorage)
 *
 * Falls back gracefully to raw uploadInStorage if Sharp processing fails.
 *
 * @param {string} folder       - Firebase Storage folder
 * @param {string} fileName     - base filename (no extension)
 * @param {string} dataUrl      - base64 data-URL from client
 * @param {string} purpose      - imageUploadPolicyService purpose key
 * @param {object} metaContext  - { ownerType, ownerId, companyId, jobId, createdBy }
 */
export async function uploadImageWithOptimization(folder, fileName, dataUrl, purpose, metaContext) {
  // 1. Magic-byte validation (existing security layer)
  var imgType = dataUrl.slice(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
  var b64     = dataUrl.slice(dataUrl.indexOf(',') + 1);

  if (!matchesDeclaredType(b64, imgType)) {
    throw new Error('FILE_CONTENT_MISMATCH');
  }

  // 2. Try Sharp optimization
  var optimized;
  try {
    optimized = await optimizeSingle(dataUrl, purpose);
  } catch (sharpErr) {
    // Graceful fallback: upload original without optimization
    console.warn('[uploader] Sharp processing failed, falling back to raw upload:', sharpErr.message);
    return uploadInStorage(folder, fileName, dataUrl);
  }

  // 3. Upload optimized buffer to Firebase Storage
  var primaryUrl;
  try {
    primaryUrl = await _uploadBufferViaCompat(folder, fileName, optimized.buffer, optimized.mimeType);
  } catch (uploadErr) {
    // If optimized upload fails, try raw path as last resort
    console.warn('[uploader] Optimized upload failed, falling back to raw upload:', uploadErr.message);
    return uploadInStorage(folder, fileName, dataUrl);
  }

  // 4. Save variant metadata — non-fatal
  var ctx = metaContext || {};
  var originalBuf = Buffer.from(b64, 'base64');
  var savingsBytes = originalBuf.length - optimized.sizeBytes;
  var savingsPct   = originalBuf.length > 0 ? ((savingsBytes / originalBuf.length) * 100) : 0;

  saveImageVariantRecord({
    ownerType:       ctx.ownerType || 'unknown',
    ownerId:         ctx.ownerId   || '',
    companyId:       ctx.companyId || null,
    jobId:           ctx.jobId     || null,
    purpose:         purpose,
    originalSizeBytes: originalBuf.length,
    originalMime:    imgType,
    variants:        [{ key: optimized.key, url: primaryUrl, width: optimized.width, height: optimized.height, sizeBytes: optimized.sizeBytes, format: optimized.format }],
    primaryVariantKey: optimized.key,
    primaryUrl:      primaryUrl,
    savingsBytes:    savingsBytes,
    savingsPercent:  parseFloat(savingsPct.toFixed(2)),
    createdBy:       ctx.createdBy || null,
  }).catch(function() { /* already handled inside */ });

  console.log('[uploader] Optimized upload complete:', folder + '/' + fileName, 'savings:', Math.round(savingsPct) + '%', 'original:', originalBuf.length, '-> output:', optimized.sizeBytes);

  return primaryUrl;
}

/**
 * Upload a Buffer via the Firebase compat SDK (same auth session as uploadInStorage).
 */
function _uploadBufferViaCompat(folder, fileName, buffer, mimeType) {
  return new Promise(function(resolve, reject) {
    var ext      = mimeType === 'image/jpeg' ? 'jpg' : (mimeType.split('/')[1] || 'webp');
    var fullPath = folder + '/' + fileName + '_opt.' + ext;
    var app      = getCompatApp();
    var b64str   = buffer.toString('base64');

    var uploadTask = app
      .storage()
      .ref(fullPath)
      .putString(b64str, 'base64', { contentType: mimeType });

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      null,
      function(err) { reject(err); },
      function() {
        uploadTask.snapshot.ref.getDownloadURL().then(function(url) {
          resolve(url);
        }).catch(function(err) {
          reject(err);
        });
      }
    );
  });
}

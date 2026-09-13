/**
 * storedMediaService — Recruitment Storage accounting.
 *
 * Storage is metered PER EMPLOYER WORKSPACE (owner ruling, 2026-09-13). The
 * billable unit is a row in gethired.stored_media: one file's presence in one
 * employer's workspace. A 100 MB CV sent to ten employers is ten rows and bills
 * 1 GB, against 100 MB actually held in the object store.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DO NOT RECONCILE THESE TOTALS AGAINST ACTUAL OBJECT-STORE USAGE.
 * Metered bytes are SUPPOSED to exceed stored bytes, by design and by ruling.
 * The bucket holds one copy; this table bills every employer that received it.
 * "Correcting the drift" against real cloud usage silently under-bills everyone.
 * The authoritative recomputation is recalculateEmployerStorageUsage() below,
 * which sums link rows and nothing else.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Node 14 / esm@3.2.25 safe: no ?. or ?? in this file.
 */

import dbQuery from "../db/dbQuery";
import env from "../env";

const dbSchema = env.schema;

// Storage warning thresholds, centralised here so the frontend never
// re-implements them (brief: "Centralize thresholds in backend/config").
var STORAGE_THRESHOLDS = [
  { atLeastPercent: 100, status: 'full' },
  { atLeastPercent: 90,  status: 'critical' },
  { atLeastPercent: 80,  status: 'warning' },
  { atLeastPercent: 70,  status: 'notice' },
  { atLeastPercent: 0,   status: 'normal' },
];

var MEDIA_TYPES = [
  'candidate_video',
  'candidate_cv',
  'candidate_document',
  'candidate_portfolio',
  'other_application_media',
];

/**
 * Normalised storage status. Returned ALONGSIDE the existing V4 `warningLevel`
 * rather than replacing it -- the frontend is mid-integration against the older
 * four-state scale (none/near_70/near_90/at_limit), which has no 80% tier, so
 * redefining that field would break a live consumer.
 *
 * A null/absent limit means unlimited (Enterprise custom) -> always 'normal'.
 */
export function getStorageStatus(usedBytes, limitBytes) {
  if (typeof limitBytes !== 'number' || limitBytes === null) return 'normal';
  if (limitBytes <= 0) return 'full';

  var percent = (usedBytes / limitBytes) * 100;
  var i;
  for (i = 0; i < STORAGE_THRESHOLDS.length; i++) {
    if (percent >= STORAGE_THRESHOLDS[i].atLeastPercent) {
      return STORAGE_THRESHOLDS[i].status;
    }
  }
  return 'normal';
}

export function isValidMediaType(mediaType) {
  return MEDIA_TYPES.indexOf(mediaType) !== -1;
}

export function getMediaTypes() {
  return MEDIA_TYPES.slice();
}

/**
 * Record one file's presence in one employer's workspace.
 *
 * `objectKey` identifies the PHYSICAL object and repeats across employers --
 * that repetition is the billing model, not a duplicate. A unique partial index
 * stops the same employer being billed twice for the same object, so a repeat
 * link for an employer that already holds the file is a no-op, not an error.
 */
export async function recordMedia(media) {
  if (!media || !media.companyId) throw new Error('recordMedia: companyId is required');
  if (!isValidMediaType(media.mediaType)) {
    throw new Error('recordMedia: unknown mediaType ' + media.mediaType);
  }
  if (typeof media.sizeBytes !== 'number' || !isFinite(media.sizeBytes) || media.sizeBytes < 0) {
    // null size means "unmeasured", which must never silently bill as zero.
    throw new Error('recordMedia: sizeBytes must be a non-negative number');
  }

  var insertQuery = `INSERT INTO ${dbSchema}.stored_media
      (company_id, applicant_id, application_id, job_id, user_id,
       media_type, storage_provider, bucket, object_key, checksum,
       original_filename, mime_type, size_bytes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT DO NOTHING
    RETURNING *;`;

  var { rows } = await dbQuery.query(insertQuery, [
    media.companyId,
    media.applicantId || null,
    media.applicationId || null,
    media.jobId || null,
    media.userId || null,
    media.mediaType,
    media.storageProvider || 'firebase',
    media.bucket || null,
    media.objectKey,
    media.checksum || null,
    media.originalFilename || null,
    media.mimeType || null,
    media.sizeBytes,
  ]);

  // No row returned = this employer already holds this object. Not an error.
  if (!rows || rows.length === 0) return { created: false, row: null };
  return { created: true, row: rows[0] };
}

/**
 * Authoritative usage for one employer. Sums ACTIVE link rows only.
 * See the file header on why this must never consult the object store.
 */
export async function recalculateEmployerStorageUsage(companyId) {
  var usageQuery = `SELECT media_type, COUNT(*)::bigint AS file_count,
      COALESCE(SUM(size_bytes), 0)::bigint AS bytes
    FROM ${dbSchema}.stored_media
    WHERE company_id = $1 AND status = 'active'
    GROUP BY media_type;`;

  var { rows } = await dbQuery.query(usageQuery, [companyId]);

  var breakdown = { videoBytes: 0, cvBytes: 0, documentBytes: 0, otherBytes: 0 };
  var totalUsedBytes = 0;
  var fileCount = 0;
  var i, r, bytes;

  for (i = 0; i < rows.length; i++) {
    r = rows[i];
    bytes = parseInt(r.bytes, 10) || 0;
    totalUsedBytes += bytes;
    fileCount += parseInt(r.file_count, 10) || 0;

    if (r.media_type === 'candidate_video') breakdown.videoBytes += bytes;
    else if (r.media_type === 'candidate_cv') breakdown.cvBytes += bytes;
    else if (r.media_type === 'candidate_document') breakdown.documentBytes += bytes;
    else breakdown.otherBytes += bytes;
  }

  return { totalUsedBytes: totalUsedBytes, fileCount: fileCount, breakdown: breakdown };
}

/**
 * Usage shaped for GET /api/employer/storage/usage.
 * `limitBytes` is the EFFECTIVE limit (plan + add-ons + contractual override),
 * resolved by the caller; null means unlimited.
 */
export async function getEmployerStorageUsage(companyId, limitBytes) {
  var usage = await recalculateEmployerStorageUsage(companyId);
  var hasLimit = (typeof limitBytes === 'number' && limitBytes !== null);

  return {
    usedBytes: usage.totalUsedBytes,
    limitBytes: hasLimit ? limitBytes : null,
    availableBytes: hasLimit ? Math.max(0, limitBytes - usage.totalUsedBytes) : null,
    percentage: (hasLimit && limitBytes > 0)
      ? parseFloat(((usage.totalUsedBytes / limitBytes) * 100).toFixed(2))
      : null,
    status: getStorageStatus(usage.totalUsedBytes, hasLimit ? limitBytes : null),
    fileCount: usage.fileCount,
    breakdown: usage.breakdown,
  };
}

/**
 * Bytes billed to one employer, in the { count, source, confidence } shape shared by
 * the subscription usage meters (subscriptionUsageServiceV4.buildEntitlementUsage).
 *
 * Never throws. Deploys do not run migrations, so this code can be live before
 * stored_media exists; the employer summary must then report the count as
 * unavailable, not fail and not report a confident zero.
 */
export async function getRecruitmentStorageUsed(companyId) {
  try {
    var usage = await recalculateEmployerStorageUsage(companyId);
    return { count: usage.totalUsedBytes, source: 'stored_media.active', confidence: 'confirmed' };
  } catch (err) {
    console.error('[storedMedia] recruitment storage usage unavailable:', err && err.message);
    return { count: 0, source: 'stored_media.active', confidence: 'unavailable' };
  }
}

/**
 * How many employers still hold this physical object.
 *
 * The physical file may only be deleted from the object store when this reaches
 * zero. Unlinking one employer frees THEIR meter; it does not entitle anyone to
 * remove bytes that nine other employers are still paying for.
 */
export async function countActiveReferences(objectKey) {
  var { rows } = await dbQuery.query(
    `SELECT COUNT(*)::int AS refs FROM ${dbSchema}.stored_media
      WHERE object_key = $1 AND status = 'active';`,
    [objectKey]
  );
  return (rows && rows[0]) ? rows[0].refs : 0;
}

/**
 * Remove media from ONE employer's workspace.
 *
 * Returns the bytes freed from that workspace's meter and whether the physical
 * object is now unreferenced. It deliberately does NOT delete from the object
 * store -- the caller decides, and only when safeToDeleteObject is true.
 * Scoped by company_id so one employer can never unlink another's media.
 */
export async function unlinkMedia(companyId, mediaId) {
  var { rows } = await dbQuery.query(
    `UPDATE ${dbSchema}.stored_media
        SET status = 'deleted', deleted_at = now()
      WHERE id = $1 AND company_id = $2 AND status = 'active'
      RETURNING size_bytes, object_key;`,
    [mediaId, companyId]
  );

  if (!rows || rows.length === 0) {
    return { deleted: false, freedBytes: 0, safeToDeleteObject: false };
  }

  var freedBytes = parseInt(rows[0].size_bytes, 10) || 0;
  var remaining = await countActiveReferences(rows[0].object_key);

  return {
    deleted: true,
    freedBytes: freedBytes,
    objectKey: rows[0].object_key,
    remainingReferences: remaining,
    safeToDeleteObject: remaining === 0,
  };
}

/**
 * Resolve the employer that owns a job.
 *
 * Deliberately a local query rather than importing job.service: application.service
 * does not import job.service today, and introducing that edge would create an
 * import cycle (job.service -> applicant.service -> ...). One indexed lookup by
 * primary key is cheaper than the coupling.
 *
 * Returns null when the job is unknown -- callers must treat that as "cannot
 * attribute", never as "no storage used".
 */
export async function resolveCompanyIdForJob(jobId) {
  if (!jobId) return null;
  var { rows } = await dbQuery.query(
    `SELECT company_id FROM ${dbSchema}.jobs WHERE job_id = $1 LIMIT 1;`,
    [jobId]
  );
  if (!rows || rows.length === 0) return null;
  return rows[0].company_id || null;
}

// Which media bucket each application-attachment table belongs to. The storage
// breakdown groups on this, so an unmapped table would silently land in
// "other" rather than fail -- hence the explicit map and the null default.
var TABLE_MEDIA_TYPES = {
  applicant_resume: 'candidate_cv',
  applicant_covered_letter: 'candidate_document',
  applicant_government_files: 'candidate_document',
  documents: 'candidate_document',
};

export function mediaTypeForTable(tableName) {
  return TABLE_MEDIA_TYPES[tableName] || 'other_application_media';
}

/**
 * Record an application attachment against the employer that owns the job.
 *
 * NON-BLOCKING BY DESIGN. A metering failure must never fail a candidate's job
 * application -- the application is the product, the meter is bookkeeping. When
 * enforcement lands it belongs in the upload-preflight gate, which runs BEFORE
 * the applicant records anything, not in this write-behind path. Failures are
 * logged loudly so under-counting is visible rather than silent.
 */
export async function recordApplicationMedia(opts) {
  try {
    if (!opts || !opts.objectKey) return { recorded: false, reason: 'no-object-key' };
    if (typeof opts.sizeBytes !== 'number' || !isFinite(opts.sizeBytes)) {
      console.warn('[storedMedia] skipping unmeasured upload', {
        jobId: opts.jobId, table: opts.tableName,
      });
      return { recorded: false, reason: 'unmeasured' };
    }

    var companyId = await resolveCompanyIdForJob(opts.jobId);
    if (!companyId) {
      console.warn('[storedMedia] could not attribute media to an employer', {
        jobId: opts.jobId, table: opts.tableName,
      });
      return { recorded: false, reason: 'no-company' };
    }

    var result = await recordMedia({
      companyId: companyId,
      applicantId: opts.applicantId || null,
      applicationId: opts.applicationId || null,
      jobId: opts.jobId,
      mediaType: mediaTypeForTable(opts.tableName),
      objectKey: opts.objectKey,
      originalFilename: opts.originalFilename || null,
      mimeType: opts.mimeType || null,
      sizeBytes: opts.sizeBytes,
    });

    return { recorded: result.created, companyId: companyId };
  } catch (err) {
    console.error('[storedMedia] recordApplicationMedia failed (non-blocking):',
      err && err.message, { jobId: opts && opts.jobId });
    return { recorded: false, reason: 'error' };
  }
}

export { STORAGE_THRESHOLDS };

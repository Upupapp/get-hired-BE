/**
 * imageMetadataRepository.js
 * Persists image variant metadata to gethired.image_variants.
 * Non-fatal: a DB write failure must never abort the upload flow.
 *
 * No ?. or ?? — esm/Acorn compat.
 */

import dbQuery from '../db/dbQuery';

/**
 * Save image variant metadata after successful upload.
 * Returns the inserted row's id or null if the write fails.
 */
export async function saveImageVariantRecord(params) {
  var ownerType        = params.ownerType        || 'unknown';
  var ownerId          = params.ownerId          || '';
  var companyId        = params.companyId        || null;
  var jobId            = params.jobId            || null;
  var purpose          = params.purpose          || 'unknown';
  var originalSize     = params.originalSizeBytes || null;
  var originalWidth    = params.originalWidth    || null;
  var originalHeight   = params.originalHeight   || null;
  var originalMime     = params.originalMime     || null;
  var variantJson      = params.variants         ? JSON.stringify(params.variants) : null;
  var primaryKey       = params.primaryVariantKey || null;
  var primaryUrl       = params.primaryUrl        || null;
  var savingsBytes     = params.savingsBytes      || null;
  var savingsPct       = params.savingsPercent    || null;
  var createdBy        = params.createdBy         || null;

  var sql = `
    INSERT INTO gethired.image_variants (
      owner_type, owner_id, company_id, job_id, purpose,
      original_size_bytes, original_width, original_height, original_mime,
      processed_status, variant_json, primary_variant_key, primary_url,
      savings_bytes, savings_percent, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,
      'processed',$10,$11,$12,
      $13,$14,$15
    ) RETURNING id
  `;

  var vals = [
    ownerType, ownerId, companyId, jobId, purpose,
    originalSize, originalWidth, originalHeight, originalMime,
    variantJson, primaryKey, primaryUrl,
    savingsBytes, savingsPct, createdBy,
  ];

  try {
    var result = await dbQuery.query(sql, vals);
    return (result && result.rows && result.rows[0]) ? result.rows[0].id : null;
  } catch (e) {
    // Non-fatal: log but do not propagate — variant metadata loss is acceptable;
    // the upload URL is already saved in the primary domain table.
    console.error('[imageMetadataRepository] DB write failed (non-fatal):', e.message);
    return null;
  }
}

/**
 * Fetch variant metadata for a given owner.
 */
export async function getImageVariants(ownerType, ownerId, purpose) {
  var sql = `
    SELECT * FROM gethired.image_variants
    WHERE owner_type=$1 AND owner_id=$2 AND purpose=$3
    ORDER BY created_at DESC
    LIMIT 10
  `;
  try {
    var result = await dbQuery.query(sql, [ownerType, ownerId, purpose]);
    return (result && result.rows) ? result.rows : [];
  } catch (e) {
    console.error('[imageMetadataRepository] getImageVariants error (non-fatal):', e.message);
    return [];
  }
}

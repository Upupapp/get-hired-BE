import dbQuery from "../db/dbQuery";
import env from "../env";
import { validateCvFile } from "../services/cvValidationService";
import { appplicantProfile, uploadAndSaveAttachment } from "../services/applicant.service";
import { deleteFromStorageByUrl } from "../helpers/uploader";

const dbSchema = env.schema;

// CVCOACH (re-run after Applicant Data Foundation v2).
//
// The `documents` table this controller used to call "not available yet"
// now exists (restored by the Applicant Data Foundation v2 migration).
// What's genuinely real now: validate -> upload to Firebase Storage ->
// save a documents row, reusing applicant.service.js's existing
// uploadAndSaveAttachment() rather than writing a second upload path.
//
// What's still honestly not real: CV text extraction, CV Health Score,
// Surgical Review, Match Explorer -- none of those have a schema or a
// parser, and this controller does not pretend otherwise. Storing the
// file is a real, complete step on its own; analysis is a separate,
// still-unbuilt step.
//
// CV Builder foundation (Increment 2): `documents` had no way to identify
// "the candidate's current CV" among possibly-several uploaded documents
// (cover letters, certificates share the same table). Added a minimal
// `is_cv` boolean flag (db/20260819_documents_is_cv_flag.sql) rather than a
// full versioning schema -- Versions/History is a later command's scope.
// At most one row per applicant should carry is_cv=true: clear any
// previous flag in the same request before inserting the new one.
const uploadCv = async (req, res) => {
  const { file, filename } = req.body;
  const { uid } = req.user;

  const validation = validateCvFile(file);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      code: validation.code,
      fieldErrors: [],
    });
  }

  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      // Real, honest blocker -- distinct from the old, broader
      // "feature unavailable" response. A CV must attach to a profile
      // (documents.applicant_id FKs to applicants_profile), and creating
      // one on the applicant's behalf here would be a silent side effect
      // outside this endpoint's job.
      return res.status(409).json({
        success: false,
        message: "Create your profile before uploading a CV.",
        code: "CV_PROFILE_REQUIRED",
        fieldErrors: [],
      });
    }

    const safeFilename = filename && typeof filename === "string" && filename.trim()
      ? filename.trim()
      : (validation.mimeType === "application/pdf" ? "resume.pdf" : "resume.docx");

    // CV VERSIONING (Phase B, 20260831c_cv_versioning.sql): an earlier fix
    // hard-deleted the previous is_cv=true row here to stop it leaking into
    // the generic "Profile Documents" list as an ordinary file (it was only
    // being flagged is_cv=false, with nothing else marking it as
    // CV-related). That closed the leak but destroyed all CV history in the
    // process -- no way to see or restore a prior CV.
    //
    // Now: demote the old row (is_cv=false) instead of deleting it, and
    // leave its ALREADY-true is_cv_version flag alone -- getApplicantArrayDetails()'s
    // generic-documents-list exclusion was updated (applicant.service.js's
    // mappedProfile(), applicantsController.js's saveDocuments) to key off
    // is_cv_version instead of is_cv, so the demoted row stays correctly
    // hidden from that list while remaining visible in Versions/History.
    // Storage blob is kept too (no deleteFromStorageByUrl call) -- it's
    // still a real, restorable version, not garbage.
    await dbQuery.query(
      `UPDATE ${dbSchema}.documents SET is_cv = false WHERE applicant_id = $1 AND is_cv = true`,
      [profile.applicantProfileId]
    );

    const saved = await uploadAndSaveAttachment(
      { file, filename: safeFilename, size: validation.approxSizeBytes, type: validation.mimeType },
      profile.applicantProfileId,
      "documents",
      "applicant_id",
      0,
      { is_cv: true, is_cv_version: true }
    );

    return res.status(200).json({
      success: true,
      data: saved,
      message: "CV uploaded.",
    });
  } catch (error) {
    // Never leak the raw storage/SQL error -- same rule this controller
    // already followed for the old "unavailable" response.
    return res.status(500).json({
      success: false,
      message: "We couldn't upload your CV right now. Please try again.",
      code: "CV_UPLOAD_FAILED",
      fieldErrors: [],
    });
  }
};

// CV Builder foundation (Increment 2): dedicated, lightweight read for "what
// is my current CV" -- the workspace's Overview/Upload CV sections use this
// directly rather than depending on a full profile refetch (which also
// pulls Skills/Experience/Education/Certifications the CV Builder doesn't
// need just to answer this one question). Ownership is derived from the
// caller's own JWT-resolved profile, never a client-supplied id.
const getCurrentCv = async (req, res) => {
  const { uid } = req.user;
  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      return res.status(200).json({ success: true, data: null });
    }

    const { rows } = await dbQuery.query(
      `SELECT id, fileurl, filename, "size", "type", created_at, is_cv
       FROM ${dbSchema}.documents
       WHERE applicant_id = $1 AND is_cv = true
       ORDER BY created_at DESC LIMIT 1`,
      [profile.applicantProfileId]
    );

    return res.status(200).json({ success: true, data: rows[0] || null });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "We couldn't load your CV right now. Please try again.",
      code: "CV_FETCH_FAILED",
    });
  }
};

// CV VERSIONING (Phase B): lists every kept CV version for the caller
// (is_cv_version=true rows -- the active one plus any prior versions kept
// on replace, see uploadCv() above), newest first. Ownership derived from
// the caller's own JWT-resolved profile, same as every other function
// here -- never a client-supplied id.
const getCvVersions = async (req, res) => {
  const { uid } = req.user;
  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      return res.status(200).json({ success: true, data: [] });
    }

    const { rows } = await dbQuery.query(
      `SELECT id, fileurl, filename, "size", "type", created_at, is_cv
       FROM ${dbSchema}.documents
       WHERE applicant_id = $1 AND is_cv_version = true
       ORDER BY created_at DESC`,
      [profile.applicantProfileId]
    );

    return res.status(200).json({
      success: true,
      data: rows.map((row) => ({ ...row, isActive: row.is_cv === true })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "We couldn't load your CV versions right now. Please try again.",
      code: "CV_VERSIONS_FETCH_FAILED",
    });
  }
};

// CV VERSIONING (Phase B): makes a prior version the active CV again,
// without deleting the currently-active one -- it simply becomes an
// inactive version in turn, exactly like a fresh upload demotes the
// previous active row. Ownership check is folded into the UPDATE's WHERE
// clause (applicant_id=$2) rather than a separate SELECT pre-check --
// zero rows affected means either the id doesn't exist or belongs to a
// different applicant; both are indistinguishable 404s to the caller, so
// this can't be used to probe another applicant's document ids.
const activateCvVersion = async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      return res.status(409).json({
        success: false,
        message: "Create your profile before managing CV versions.",
        code: "CV_PROFILE_REQUIRED",
      });
    }

    const { rows: targetRows } = await dbQuery.query(
      `SELECT id FROM ${dbSchema}.documents
       WHERE id = $1 AND applicant_id = $2 AND is_cv_version = true`,
      [id, profile.applicantProfileId]
    );
    if (!targetRows[0]) {
      return res.status(404).json({
        success: false,
        message: "That CV version could not be found.",
        code: "CV_VERSION_NOT_FOUND",
      });
    }

    await dbQuery.query(
      `UPDATE ${dbSchema}.documents SET is_cv = false
       WHERE applicant_id = $1 AND is_cv = true`,
      [profile.applicantProfileId]
    );
    await dbQuery.query(
      `UPDATE ${dbSchema}.documents SET is_cv = true WHERE id = $1`,
      [id]
    );

    return res.status(200).json({ success: true, message: "CV version activated." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "We couldn't switch your active CV right now. Please try again.",
      code: "CV_VERSION_ACTIVATE_FAILED",
    });
  }
};

// CV VERSIONING (Phase B): permanently deletes a kept-for-history version
// -- real deletion, not a soft flag, matching Tab 09's rule that a delete
// control must only ever be shown/wired when the backend genuinely
// supports it. Refuses to delete the currently active version (is_cv=true)
// -- the applicant must activate a different version first, so there is
// never a moment with zero active CV as a side effect of this endpoint.
const deleteCvVersion = async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  try {
    const profile = await appplicantProfile(uid);
    if (!profile) {
      return res.status(409).json({
        success: false,
        message: "Create your profile before managing CV versions.",
        code: "CV_PROFILE_REQUIRED",
      });
    }

    const { rows } = await dbQuery.query(
      `DELETE FROM ${dbSchema}.documents
       WHERE id = $1 AND applicant_id = $2 AND is_cv_version = true AND is_cv = false
       RETURNING fileurl`,
      [id, profile.applicantProfileId]
    );

    if (!rows[0]) {
      // Zero rows: not found, belongs to someone else, or IS the active
      // version (deliberately excluded above) -- all one indistinguishable
      // response so this can't be used to probe another applicant's ids,
      // and the active-version case gets an explicit, actionable reason.
      const { rows: activeCheck } = await dbQuery.query(
        `SELECT 1 FROM ${dbSchema}.documents WHERE id = $1 AND applicant_id = $2 AND is_cv = true`,
        [id, profile.applicantProfileId]
      );
      if (activeCheck[0]) {
        return res.status(409).json({
          success: false,
          message: "You can't delete your active CV. Activate a different version first.",
          code: "CV_VERSION_IS_ACTIVE",
        });
      }
      return res.status(404).json({
        success: false,
        message: "That CV version could not be found.",
        code: "CV_VERSION_NOT_FOUND",
      });
    }

    deleteFromStorageByUrl(rows[0].fileurl).catch(() => {});

    return res.status(200).json({ success: true, message: "CV version deleted." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "We couldn't delete that CV version right now. Please try again.",
      code: "CV_VERSION_DELETE_FAILED",
    });
  }
};

export { uploadCv, getCurrentCv, getCvVersions, activateCvVersion, deleteCvVersion };

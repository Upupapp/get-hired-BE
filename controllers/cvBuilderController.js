import dbQuery from "../db/dbQuery";
import env from "../env";
import { validateCvFile } from "../services/cvValidationService";
import { appplicantProfile, uploadAndSaveAttachment } from "../services/applicant.service";

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

    // Clear any previously-flagged CV BEFORE the new upload attempt starts,
    // not after it succeeds -- if the upload/insert below fails, the
    // candidate is left with no is_cv=true row rather than two, which is
    // the safer failure mode (an honest "no CV yet" beats a silently wrong
    // "old CV is still current" once uploadCv has already told the caller
    // the new one is being processed... but since we don't respond success
    // until the insert below actually completes, either row set the caller
    // observes -- old-cleared-only or old-cleared-plus-new -- is truthful
    // for the request's actual outcome).
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
      { is_cv: true }
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

export { uploadCv, getCurrentCv };

const FIREBASE_USER_NOT_FOUND = new Set([
  "auth/user-not-found",
  "auth/user-not-exist",
]);

export function buildAccountDeletionService(dependencies) {
  const db = dependencies.db;
  const dbSchema = dependencies.dbSchema;
  const deleteFirebaseUser = dependencies.deleteFirebaseUser;
  const deleteStorageUrl = dependencies.deleteStorageUrl || (async () => {});

  return async function deleteAccount(uid) {
    if (!uid) throw new Error("deleteAccount: uid is required");

    const result = await db.withTransaction(async (client) => {
      const profileResult = await client.query(
        `SELECT applicant_profile_id FROM ${dbSchema}.applicants_profile WHERE user_id = $1`,
        [uid]
      );
      const applicantIds = profileResult.rows.map((row) => row.applicant_profile_id);

      const companyResult = await client.query(
        `SELECT DISTINCT company_id FROM (
           SELECT company_id FROM ${dbSchema}.companies WHERE created_by = $1
           UNION
           SELECT company_id FROM ${dbSchema}.company_employees WHERE employee_uuid = $1
         ) owned_companies WHERE company_id IS NOT NULL`,
        [uid]
      );
      const companyIds = companyResult.rows.map((row) => row.company_id);

      const jobResult = companyIds.length
        ? await client.query(
            `SELECT job_id FROM ${dbSchema}.jobs WHERE company_id = ANY($1)`,
            [companyIds]
          )
        : { rows: [] };
      const jobIds = jobResult.rows.map((row) => row.job_id);
      let mediaUrls = [];

      if (applicantIds.length) {
        const mediaResult = await client.query(
          `SELECT fileurl AS url FROM ${dbSchema}.documents WHERE applicant_id = ANY($1)
           UNION SELECT fileurl FROM ${dbSchema}.applicant_covered_letter WHERE applicant_id = ANY($1)
           UNION SELECT fileurl FROM ${dbSchema}.applicant_resume WHERE applicant_id = ANY($1)
           UNION SELECT fileurl FROM ${dbSchema}.applicant_government_files WHERE applicant_id = ANY($1)
           UNION SELECT answer_url FROM ${dbSchema}.interview_answers WHERE applicant_id = ANY($1)`,
          [applicantIds]
        );
        mediaUrls = mediaUrls.concat(mediaResult.rows.map((row) => row.url).filter(Boolean));
        for (const table of [
          "interview_answers",
          "documents",
          "applicant_covered_letter",
          "applicant_resume",
          "applicant_government_files",
          "applicant_skills",
          "applicant_educational_background",
          "applicant_certificates",
          "applicant_work_experience",
        ]) {
          await client.query(
            `DELETE FROM ${dbSchema}.${table} WHERE applicant_id = ANY($1)`,
            [applicantIds]
          );
        }
        await client.query(
          `DELETE FROM ${dbSchema}.applicants_profile WHERE applicant_profile_id = ANY($1)`,
          [applicantIds]
        );
      }

      if (companyIds.length) {
        const storedMediaResult = await client.query(
          `SELECT object_key AS url FROM ${dbSchema}.stored_media
           WHERE company_id = ANY($1) OR user_id = $2`,
          [companyIds, uid]
        );
        mediaUrls = mediaUrls.concat(storedMediaResult.rows.map((row) => row.url).filter(Boolean));
      }

      for (const table of [
        "application_snapshots",
        "application_completeness_snapshots",
        "match_snapshots",
      ]) {
        await client.query(
          `DELETE FROM ${dbSchema}.${table}
           WHERE applicant_id = $1
              OR job_id = ANY($2)
              OR company_id = ANY($3)`,
          [uid, jobIds, companyIds]
        );
      }

      if (jobIds.length) {
        await client.query(`DELETE FROM ${dbSchema}.jobs WHERE job_id = ANY($1)`, [jobIds]);
      }

      if (companyIds.length) {
        await client.query(
          `DELETE FROM ${dbSchema}.companies_subscription WHERE company_id = ANY($1)`,
          [companyIds]
        );
        await client.query(`DELETE FROM ${dbSchema}.companies WHERE company_id = ANY($1)`, [companyIds]);
      }

      await client.query(
        `DELETE FROM ${dbSchema}.logs
         WHERE user_id = $1
            OR activity_id = $1
            OR activity_id = ANY($2)
            OR activity_id = ANY($3)`,
        [uid, jobIds, companyIds]
      );

      const deleted = await client.query(
        `DELETE FROM ${dbSchema}.user_credentials WHERE uid = $1 RETURNING uid`,
        [uid]
      );

      return {
        deleted: deleted.rowCount > 0,
        applicantProfiles: applicantIds.length,
        companies: companyIds.length,
        jobs: jobIds.length,
        mediaUrls: Array.from(new Set(mediaUrls)),
      };
    });

    await Promise.allSettled(result.mediaUrls.map((url) => deleteStorageUrl(url)));

    // Delete the external identity last. The database transaction removes every
    // foreign-key dependency first, so a user is never locked out while their
    // application data remains stranded. A retry after an earlier partial delete
    // is idempotent when Firebase already reports that the identity is gone.
    try {
      await deleteFirebaseUser(uid);
    } catch (error) {
      if (!FIREBASE_USER_NOT_FOUND.has(error && error.code)) throw error;
    }

    const { mediaUrls, ...summary } = result;
    return { ...summary, storedFiles: mediaUrls.length };
  };
}

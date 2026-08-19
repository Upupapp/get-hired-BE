import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";
import uploadInStorage from "../helpers/uploader";
import genericInsert from "../helpers/genericInsert";

import { updateUserProfile } from "./user.service";

const dbSchema = env.schema;

const candidateListByJobId = async (jobId) => {
  const searchQuery = `SELECT job_application_id, job_id, date_applied, updated_at, candidate_id, application_status_id, is_archived,
  u.firstname, u.lastname,
    FROM ${dbSchema}.job_applicants j 
    LEFT JOIN user u
    on u.uid = j.candidate_id
    WHERE job_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [jobId]);
    const dbResponse = rows;
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedCandidate = (raw) => {
  return {
    jobId: raw.jobId,
    fullName: raw.firstname + " " + raw.lastname,
    dateApplied: raw.date_applied,
  };
};

const createApplicationProfile = async (applicant) => {
  let rawUrlPhoto = "";

  const {
    userId,
    jobTitle,
    shortBio,
    servicesProvided,
    jobTypeId,
    jobLevelId,
    workSetupId,
    salaryMinimum,
    salaryMaximum,
    salaryCurrency,
    profileImage,
    firstName,
    lastName,
    address,
    contactNumber,
    city,
    country,
    isProfileReady,
  } = applicant;

  const applicantProfileId = idGenerator(6, "AP");

  try {
    if (profileImage && profileImage != "") {
      rawUrlPhoto = await uploadInStorage(
        "Applicant-Profile-Photo",
        `${applicantProfileId}-ProfilePhoto`,
        profileImage
      );
    }

    const insertQuery = `INSERT INTO ${dbSchema}.applicants_profile
      (applicant_profile_id, user_id, photo_url, job_title, short_bio, services_provided, job_type_id, job_level_id, work_setup_id, salary_minimum, salary_maximum, is_profile_ready, created_at, salary_currency)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning *;`;

    const { rows } = await dbQuery.query(insertQuery, [
      applicantProfileId,
      userId,
      rawUrlPhoto,
      jobTitle,
      shortBio,
      servicesProvided,
      jobTypeId,
      jobLevelId,
      workSetupId,
      salaryMinimum,
      salaryMaximum,
      isProfileReady,
      new Date(),
      salaryCurrency,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to create profile";
    }

    const profile = await updateUserProfile({
      firstName,
      lastName,
      address,
      contactNumber,
      city,
      country,
      rawUrlPhoto,
      userId,
    });

    if (!profile && profile.length == 0) {
      throw "Failed to update basic info";
    }

    const dbResponse = mappedBasicProfile({
      ...profile,
      ...rows[0],
    });

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

// const createApplicationProfile = async (applicant) => {
//   let rawUrl = "";

//   const {
//     userId,
//     jobTitle,
//     shortBio,
//     servicesProvided,
//     jobTypeId,
//     jobLevelId,
//     workSetupId,
//     salaryMinimum,
//     salaryMaximum,
//     salaryCurrency,
//     videoCVFile,
//     profileImage,
//     isProfileReady,
//     firstName,
//     lastName,
//     address,
//     contactNumber,
//     city,
//     country,
//     skills,
//     workExperience,
//     educationalBackground,
//     certifications,
//     documents,
//   } = applicant;

//   const applicantProfileId = idGenerator(6, "AP");

//   try {
//     if (videoCVFile && videoCVFile != "") {
//       rawUrl = await uploadInStorage(
//         "Applicant-CVs",
//         `${applicantProfileId}-CV`,
//         videoCVFile
//       );
//     }

//     if (profileImage && profileImage != "") {
//       rawUrlPhoto = await uploadInStorage(
//         "Applicant-Profile-Photo",
//         `${applicantProfileId}-ProfilePhoto`,
//         profileImage
//       );
//     }

//     const insertQuery = `INSERT INTO ${dbSchema}.applicants_profile
//       (applicant_profile_id, user_id, photo_url, job_title, short_bio, services_provided, job_type_id, job_level_id, work_setup_id, salary_minimum, salary_maximum,
//       video_cv_url, is_profile_ready, created_at, salary_currency)
//       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning *;`;

//     const { rows } = await dbQuery.query(insertQuery, [
//       applicantProfileId,
//       userId,
//       rawUrlPhoto,
//       jobTitle,
//       shortBio,
//       servicesProvided,
//       jobTypeId,
//       jobLevelId,
//       workSetupId,
//       salaryMinimum,
//       salaryMaximum,
//       rawUrl,
//       isProfileReady,
//       new Date(),
//       salaryCurrency,
//     ]);

//     if (!rows && rows.length == 0) {
//       throw "Failed to create profile";
//     }

//     const profile = await updateUserProfile({
//       firstName,
//       lastName,
//       address,
//       contactNumber,
//       city,
//       country,
//       rawUrlPhoto,
//       userId,
//     });

//     if (!profile && profile.length == 0) {
//       throw "Failed to update basic info";
//     }

//     if (documents && documents.length != 0) {
//       const output = await Promise.all(
//         documents.map(async (document, index) => {
//           return await uploadAndSaveAttachment(
//             document,
//             rows[0].applicant_profile_id,
//             "documents",
//             "application_id",
//             index
//           );
//         })
//       );
//     }

//     if (skills && skills.length != 0) {
//       const skillList = await saveApplicantDetailsList(
//         skills,
//         "applicant_skills",
//         "skills",
//         rows[0].applicant_profile_id
//       );
//     }

//     if (workExperience && workExperience.length != 0) {
//       const work = workExperience.map(
//         async (exp) =>
//           await saveApplicantWorkExperience(exp, rows[0].applicant_profile_id)
//       );
//     }

//     if (educationalBackground && educationalBackground.length != 0) {
//       const educBG = educationalBackground.map(
//         async (educ) =>
//           await saveApplicantEducationalBackground(
//             educ,
//             rows[0].applicant_profile_id
//           )
//       );
//     }

//     if (certifications && certifications.length != 0) {
//       const certf = certifications.map(
//         async (cert) =>
//           await saveCertifications(cert, rows[0].applicant_profile_id)
//       );
//     }

//     const dbResponse = mappedProfile({
//       ...profile,
//       ...rows[0],
//     });

//     return dbResponse;
//   } catch (error) {
//     throw error;
//   }
// };

const updateProfileBasicInfo = async (applicant) => {
  let rawUrl = "";
  let rawUrlPhoto = "";

  const {
    applicantProfileId,
    userId,
    jobTitle,
    shortBio,
    servicesProvided,
    jobTypeId,
    jobLevelId,
    workSetupId,
    salaryMinimum,
    salaryMaximum,
    salaryCurrency,
    profileImage,
    photoUrl,
    isProfileReady,
    firstName,
    lastName,
    address,
    contactNumber,
    city,
    country,
  } = applicant;

  try {
    if (profileImage && profileImage != "") {
      rawUrlPhoto = await uploadInStorage(
        "Applicant-Profile-Photo",
        `${applicantProfileId}-ProfilePhoto`,
        profileImage
      );
    } else {
      rawUrlPhoto = photoUrl;
    }

    const updateQuery = `UPDATE ${dbSchema}.applicants_profile
      SET photo_url=$1, job_title=$2, short_bio=$3, services_provided=$4, 
      job_type_id=$5, job_level_id=$6, work_setup_id=$7, salary_minimum=$8,
      salary_maximum=$9, updated_at=$10, is_profile_ready=$11, salary_currency=$12
      WHERE user_id=$13 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      rawUrlPhoto,
      jobTitle,
      shortBio,
      servicesProvided,
      jobTypeId,
      jobLevelId,
      workSetupId,
      salaryMinimum,
      salaryMaximum,
      new Date(),
      isProfileReady,
      salaryCurrency,
      userId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to update profile";
    }

    const profile = await updateUserProfile({
      firstName,
      lastName,
      address,
      contactNumber,
      city,
      country,
      rawUrlPhoto,
      userId,
    });

    if (!profile && profile.length == 0) {
      throw "Failed to update basic info";
    }

    const dbResponse = mappedBasicProfile({
      ...profile,
      ...rows[0],
    });

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const updateApplicationProfile = async (applicant) => {
  let rawUrl = "";
  let rawUrlPhoto = "";

  const {
    applicantProfileId,
    userId,
    jobTitle,
    shortBio,
    servicesProvided,
    jobTypeId,
    jobLevelId,
    workSetupId,
    salaryMinimum,
    salaryMaximum,
    videoCVFile,
    videoCVUrl,
    profileImage,
    photoUrl,
    isProfileReady,
    firstName,
    lastName,
    address,
    contactNumber,
    city,
    country,
    skills,
    workExperience,
    educationalBackground,
    certifications,
    documents,
    salaryCurrency,
  } = applicant;

  try {
    if (videoCVFile && videoCVFile != "") {
      rawUrl = await uploadInStorage(
        "Applicant-CVs",
        `${applicantProfileId}-CV`,
        videoCVFile,
        1
      );
    } else {
      rawUrl = videoCVUrl;
    }

    if (profileImage && profileImage != "") {
      rawUrlPhoto = await uploadInStorage(
        "Applicant-Profile-Photo",
        `${applicantProfileId}-ProfilePhoto`,
        profileImage
      );
    } else {
      rawUrlPhoto = photoUrl;
    }

    const updateQuery = `UPDATE ${dbSchema}.applicants_profile
    SET photo_url=$1, job_title=$2, short_bio=$3, services_provided=$4, 
    job_type_id=$5, job_level_id=$6, work_setup_id=$7, salary_minimum=$8,
    salary_maximum=$9, video_cv_url=$10,  updated_at=$11, is_profile_ready=$12, salary_currency=$13
    WHERE user_id=$14 returning *;`;

    const { rows } = await dbQuery.query(updateQuery, [
      rawUrlPhoto,
      jobTitle,
      shortBio,
      servicesProvided,
      jobTypeId,
      jobLevelId,
      workSetupId,
      salaryMinimum,
      salaryMaximum,
      rawUrl,
      new Date(),
      isProfileReady,
      salaryCurrency,
      userId,
    ]);

    if (!rows && rows.length == 0) {
      throw "Failed to update profile";
    }

    const profile = await updateUserProfile({
      firstName,
      lastName,
      address,
      contactNumber,
      city,
      country,
      rawUrlPhoto,
      userId,
    });

    if (!profile && profile.length == 0) {
      throw "Failed to update basic info";
    }

    const deleted = await deleteArrayApplicantEntry(
      applicantProfileId,
      "documents",
      "applicant_id"
    );

    if (documents && documents.length != 0) {
      const output = await Promise.all(
        documents.map(async (document, index) => {
          return await uploadAndSaveAttachment(
            document,
            applicantProfileId,
            "documents",
            "applicant_id",
            index
          );
        })
      );
    }

    if (skills && skills.length != 0) {
      const deleted = await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_skills",
        "applicant_id"
      );

      const skillList = await saveApplicantDetailsList(
        skills,
        "applicant_skills",
        "skills",
        applicantProfileId
      );
    }

    if (workExperience && workExperience.length != 0) {
      const deleteWorkExp = await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_work_experience",
        "applicant_id"
      );

      const work = workExperience.map(
        async (exp) =>
          await saveApplicantWorkExperience(exp, applicantProfileId)
      );
    }

    if (educationalBackground && educationalBackground.length != 0) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_educational_background",
        "applicant_id"
      );
      const educBG = educationalBackground.map(
        async (educ) =>
          await saveApplicantEducationalBackground(educ, applicantProfileId)
      );
    }

    if (certifications && certifications.length != 0) {
      await deleteArrayApplicantEntry(
        applicantProfileId,
        "applicant_certificates",
        "applicant_id"
      );
      const certf = certifications.map(
        async (cert) => await saveCertifications(cert, applicantProfileId)
      );
    }

    const dbResponse = mappedProfile({
      ...profile,
      ...rows[0],
    });

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const updateProfileSaveVideoCV = async (video, applicantProfileId, userId) => {
  const { videoCVFile, videoCVUrl } = video;
  let rawUrl = null;

  const updateQuery = `UPDATE ${dbSchema}.applicants_profile
    SET video_cv_url=$1, updated_at=$2 WHERE user_id=$3 returning *;`;

  try {
    if (videoCVFile && videoCVFile != "") {
      rawUrl = await uploadInStorage(
        "Applicant-CVs",
        `${applicantProfileId}-CV`,
        videoCVFile,
        1
      );
    } else {
      rawUrl = videoCVUrl;
    }

    const { rows } = await dbQuery.query(updateQuery, [rawUrl, now, userId]);

    if (!rows || rows.length == 0) {
      // QA9 FIX-2b: was `throw error` — `error` is not defined inside the try
      // block; would cause a ReferenceError on the error path. Use a safe static
      // message instead.
      throw new Error('Failed to save video CV');
    }
    const dbResponse = rows.map((row) => {
      return {
        videoCVUrl: row.video_cv_url,
        updatedAt: row.updated_at,
      };
    });
    return dbResponse[0];
  } catch (error) {
    throw error;
  }
};

const saveApplicantWorkExperience = async (workExperience, applicantId) => {
  const {
    jobTitle,
    companyName,
    location,
    jobTypeId,
    startMonth,
    startYear,
    endMonth,
    endYear,
    isCurrentJob,
    details,
  } = workExperience;

  const insertQuery = `INSERT INTO ${dbSchema}.applicant_work_experience
  (job_title, company_name, "location", job_type_id, start_month, start_year, end_month, end_year, is_current_job, details, created_at, applicant_id)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      jobTitle,
      companyName,
      location,
      jobTypeId,
      startMonth,
      startYear,
      endMonth,
      endYear,
      isCurrentJob,
      details,
      new Date(),
      applicantId,
    ]);
    const dbResponse = mappedWorkExperience(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedWorkExperience = (raw) => {
  return {
    applicantId: raw.applicant_id,
    jobTitle: raw.job_title,
    companyName: raw.company_name,
    location: raw.location,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    startMonth: raw.start_month,
    startYear: raw.start_year,
    endMonth: raw.end_month,
    endYear: raw.end_year,
    isCurrentJob: raw.is_current_job,
    details: raw.details,
    createdAt: raw.created_at,
  };
};

const saveApplicantEducationalBackground = async (
  educBackground,
  applicantId
) => {
  const {
    educLevelId,
    educLevelName,
    fieldOfStudy,
    school,
    schoolAddress,
    startMonth,
    startYear,
    endMonth,
    endYear,
    levelOfEducation,
  } = educBackground;

  const insertQuery = `INSERT INTO ${dbSchema}.applicant_educational_background
  (applicant_id, created_at, educ_level_name, field_of_study, school, school_address, start_month, start_year, end_month, end_year)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      applicantId,
      new Date(),
      levelOfEducation,
      fieldOfStudy,
      school,
      schoolAddress,
      startMonth,
      startYear,
      endMonth,
      endYear,
    ]);
    const dbResponse = mappedEducationalBackground(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedEducationalBackground = (raw) => {
  return {
    applicantId: raw.applicant_id,
    startMonth: raw.start_month,
    startYear: raw.start_year,
    endMonth: raw.end_month,
    endYear: raw.end_year,
    createdAt: raw.created_at,
    levelOfEducation: raw.educ_level_name,
    educLevelName: raw.educ_level_name,
    fieldOfStudy: raw.field_of_study,
    school: raw.school,
    schoolAddress: raw.school_address,
  };
};

const saveCertifications = async (certifications, applicantId) => {
  const {
    certTitle,
    noExpiry,
    details,
    startMonth,
    startYear,
    endMonth,
    endYear,
  } = certifications;

  const insertQuery = `INSERT INTO ${dbSchema}.applicant_certificates
      (cert_title, no_expiry, start_month, start_year, 
      end_month, end_year, details, created_at, applicant_id)
  VALUES($1, $2, $3, $4,$5, $6, $7, $8, $9) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      certTitle,
      noExpiry,
      startMonth,
      startYear,
      endMonth,
      endYear,
      details,
      new Date(),
      applicantId,
    ]);
    const dbResponse = mappedCertifications(rows[0]);
    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const mappedCertifications = (raw) => {
  return {
    applicantId: raw.applicant_id,
    startMonth: raw.start_month,
    startYear: raw.start_year,
    endMonth: raw.end_month,
    endYear: raw.end_year,
    createdAt: raw.created_at,
    certTitle: raw.cert_title,
    noExpiry: raw.no_expiry,
    detail: raw.details,
  };
};

const deleteArrayApplicantEntry = async (
  applicantId,
  tableName,
  columnName
) => {
  const deleteQuery = `DELETE FROM ${dbSchema}.${tableName} WHERE ${columnName} = $1 returning *;`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, [applicantId]);

    if (!rows || rows.length == 0) {
      return false;
    }

    return true;
  } catch (error) {
    throw error;
  }
};

const saveApplicantDetailsList = async (
  list,
  tableName,
  columnName,
  applicantId
) => {
  const insertQuery = `INSERT INTO ${dbSchema}.applicant_skills
  (skills, applicant_id, created_at)
  VALUES($1, $2, $3) returning *;`;
  try {
    const insertedList = await Promise.all(
      list.map(
        async (item) =>
          await dbQuery.query(insertQuery, [item, applicantId, now])
      )
    );
    return insertedList;
  } catch (error) {
    throw error;
  }
};

const appplicantProfile = async (userId) => {
  const searchQuery = `SELECT ap.*, u.*,
    jt.job_type_name, jl.job_level_name, ws.work_setup_name
    FROM ${dbSchema}.applicants_profile ap
    left join ${dbSchema}.users u
    on u.uid = ap.user_id
    left join ${dbSchema}.work_setup ws
    on ws.work_setup_id  = ap.work_setup_id
    left join ${dbSchema}.job_type jt
    on jt.job_type_id = ap.job_type_id
    left join ${dbSchema}.job_level jl
    on jl.job_level_id = ap.job_level_id
    WHERE ap.user_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [userId]);
    if (rows && rows.length != 0) {
      return await mappedProfile(rows[0]);
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

const getApplicantArrayDetails = async (
  applicantId,
  tableName,
  joinQuery = ""
) => {
  let join = `left join `;
  const searchQuery = `SELECT *
      FROM ${dbSchema}.${tableName} t
      ${joinQuery}
      WHERE applicant_id = $1;`;

  try {
    const { rows } = await dbQuery.query(searchQuery, [applicantId]);
    if (rows && rows.length != 0) {
      return [...rows];
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const appSkills = async (applicationId) => {
  const mappedSkip = await getApplicantArrayDetails(
    applicationId,
    "applicant_skills"
  );

  const skills = await Promise.all(mappedSkip.map(async (raw) => raw.skills));
  return skills;
};

const getcert = async (applicantId) => {
  const certs = await getApplicantArrayDetails(
    applicantId,
    "applicant_certificates"
  );

  if (certs.length > 0) {
    return await Promise.all(
      certs.map(async (cert) => mappedCertifications(cert))
    );
  } else {
    return [];
  }
};
const getWorkExperience = async (applicantId) => {
  const we = await getApplicantArrayDetails(
    applicantId,
    "applicant_work_experience",
    `left join ${dbSchema}.job_type jt on jt.job_type_id = t.job_type_id`
  );
  if (we.length > 0) {
    return await Promise.all(we.map(async (w) => mappedWorkExperience(w)));
  } else {
    return [];
  }
};

const getEducBgDetails = async (applicantId) => {
  const educBs = await getApplicantArrayDetails(
    applicantId,
    "applicant_educational_background"
  );
  if (educBs.length > 0) {
    return await Promise.all(
      educBs.map(async (educB) => mappedEducationalBackground(educB))
    );
  } else {
    return [];
  }
};

const uploadAndSaveAttachment = async (
  attachment,
  applicantId,
  tableName,
  column,
  index = 0,
  extraColumns = null
) => {
  let rawUrl = "";
  let generalQuery = "";
  let dbResponse = {};

  const { id, file, fileUrl, size, type, filename } = attachment;
  try {
    if (file && file != "") {
      // Scoped storage path prevents path collisions and confines each document
      // to its owner's prefix so Firebase Storage security rules can restrict
      // by path (applicants/{uid}/...). Never use the original filename as the
      // storage path — it is untrusted caller input and collides across users.
      var rawExt = (filename && filename.indexOf('.') !== -1)
        ? filename.split('.').pop().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10)
        : '';
      var safeExt = rawExt || 'bin';
      var docId = idGenerator(8, 'DOC');
      var storageFolder = 'applicants/' + applicantId + '/documents/' + docId;
      var safeFileName = 'original.' + safeExt;
      rawUrl = await uploadInStorage(storageFolder, safeFileName, file);
    }

    // CV Builder foundation: optional extra columns (currently just
    // `is_cv`) for callers that need to write beyond the base
    // fileurl/filename/size/type/<owner column> shape every other caller of
    // this function uses. Backward compatible -- when omitted, the INSERT
    // is byte-identical to before this change.
    const extraKeys = extraColumns ? Object.keys(extraColumns) : [];
    const extraColumnSql = extraKeys.map((key) => `, "${key}"`).join("");
    const extraPlaceholderSql = extraKeys.map((_, i) => `, $${6 + i}`).join("");
    const extraValues = extraKeys.map((key) => extraColumns[key]);

    generalQuery = `INSERT INTO ${dbSchema}.${tableName}
      (fileurl, filename, "size", "type", ${column}${extraColumnSql})
      VALUES($1, $2, $3, $4, $5${extraPlaceholderSql}) returning *;`;

    const { rows } = await dbQuery.query(generalQuery, [
      rawUrl,
      filename,
      size,
      type,
      applicantId,
      ...extraValues,
    ]);

    if (rows && rows.length == 0) {
      throw "Failed to save Url in DB";
    }
    dbResponse = rows[0];

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const listOfJobAppliedByApplicant = async (uid) => {
  const selectQuery = `select * from ${dbSchema}.job_applicants where candidate_id = $1`;
  try {
    const { rows } = await dbQuery.query(selectQuery, [uid]);

    const dbResponse = rows.map((row) => {
      return {
        jobApplicationId: row.job_application_id,
        jobId: row.job_id,
        dateApplied: row.date_applied,
        candidateId: row.candidate_id,
        applicationStatusId: row.application_status_id,
      };
    });

    return dbResponse;
  } catch (error) {
    throw error;
  }
};

const listOfAllUniqueApplicantsByCompany = async (companyId) => {
  const seachrQuery = `SELECT 
      distinct(ja.candidate_id) as candidate_id, uc.email 
        from ${dbSchema}.job_applicants ja
          left join ${dbSchema}.jobs j
          on ja.job_id = j.job_id
          left join ${dbSchema}.user_credentials uc 
          on ja.candidate_id = uc.uid 
          where j.company_id = $1 and ja.is_archived = false`;

  try {
    const { rows } = await dbQuery.query(seachrQuery, [companyId]);
    if (rows && rows.length != 0) {
      return await Promise.all(
        rows.map(async (row) => {
          return {
            id: row.candidate_id,
            email: row.email,
          };
        })
      );
    } else {
      return [];
    }
  } catch (error) {
    throw error;
  }
};

const mappedBasicProfile = async (raw) => {
  return {
    applicantProfileId: raw.applicant_profile_id,
    userId: raw.userId,
    firstName: raw.firstName ? raw.firstName : raw.firstname,
    lastName: raw.lastName ? raw.lastName : raw.lastname,
    photoUrl: raw.photoUrl ? raw.photoUrl : raw.photo_url,
    jobTitle: raw.job_title,
    rating: raw.applicant_rating,
    workSetupId: raw.work_setup_id,
    workSetupName: raw.work_setup_name,
    email: raw.email,
    address: raw.address,
    city: raw.city,
    country: raw.country,
    contactNumber: raw.contactNumber ? raw.contactNumber : raw.cell_number,
    shortBio: raw.short_bio,
    servicesProvided: raw.services_provided,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    jobLevelId: raw.job_level_id,
    jobLevelName: raw.job_level_name,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    salaryCurrency: raw.salary_currency,
  };
};

const mappedProfile = async (raw) => {
  return {
    applicantProfileId: raw.applicant_profile_id,
    userId: raw.userId,
    firstName: raw.firstName ? raw.firstName : raw.firstname,
    lastName: raw.lastName ? raw.lastName : raw.lastname,
    photoUrl: raw.photoUrl ? raw.photoUrl : raw.photo_url,
    videoCVUrl: raw.video_cv_url,
    jobTitle: raw.job_title,
    rating: raw.applicant_rating,
    workSetupId: raw.work_setup_id,
    workSetupName: raw.work_setup_name,
    email: raw.email,
    address: raw.address,
    city: raw.city,
    country: raw.country,
    contactNumber: raw.contactNumber ? raw.contactNumber : raw.cell_number,
    shortBio: raw.short_bio,
    servicesProvided: raw.services_provided,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    jobLevelId: raw.job_level_id,
    jobLevelName: raw.job_level_name,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    salaryCurrency: raw.salary_currency,
    workExperience: await getWorkExperience(raw.applicant_profile_id),
    educationalBackground: await getEducBgDetails(raw.applicant_profile_id),
    skills: await appSkills(raw.applicant_profile_id),
    certifications: await getcert(raw.applicant_profile_id),
    documents: await getApplicantArrayDetails(
      raw.applicant_profile_id,
      "documents"
    ),
  };
};

export {
  candidateListByJobId,
  appplicantProfile,
  createApplicationProfile,
  updateApplicationProfile,
  uploadAndSaveAttachment,
  listOfJobAppliedByApplicant,
  deleteArrayApplicantEntry,
  saveApplicantWorkExperience,
  saveApplicantEducationalBackground,
  saveCertifications,
  saveApplicantDetailsList,
  updateProfileBasicInfo,
  updateProfileSaveVideoCV,
  listOfAllUniqueApplicantsByCompany,
  // Applicant Data Foundation v2 -- newly exported, not new logic. These
  // already existed and already worked; the MATCH readiness bridge
  // composes them rather than re-querying applicant_skills/
  // applicant_certificates/applicant_work_experience/
  // applicant_educational_background directly.
  appSkills,
  getcert,
  getWorkExperience,
  getEducBgDetails,
};

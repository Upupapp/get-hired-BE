import idGenerator from "../helpers/randomNumberForId";
import dbQuery from "../db/dbQuery";
import env from "../env";
import uploadInStorage from "../helpers/uploader";
import genericInsert from "../helpers/genericInsert";

import { updateUserProfile } from "./user.service";

const dbSchema = env.schema;
const now = new Date();

const candidateListByJobId = async (jobId) => {
  const searchQuery = `SELECT job_applicant_id, job_id, date_applied, updated_at, candidate_id, application_status_id, is_archived,
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
  let rawUrl = "";
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
    videoCVFile,
    profileImage,
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
  } = applicant;

  const applicantProfileId = idGenerator(6, "AP");

  try {
    if (videoCVFile && videoCVFile != "") {
      rawUrl = await uploadInStorage(
        "Applicant-CVs",
        `${applicantProfileId}-CV`,
        videoCVFile
      );
    }

    if (profileImage && profileImage != "") {
      rawUrlPhoto = await uploadInStorage(
        "Applicant-Profile-Photo",
        `${applicantProfileId}-ProfilePhoto`,
        profileImage
      );
    }

    const insertQuery = `INSERT INTO ${dbSchema}.applicants_profile
      (applicant_profile_id, user_id, photo_url, job_title, short_bio, services_provided, job_type_id, job_level_id, work_setup_id, salary_minimum, salary_maximum, 
      video_cv_url, is_profile_ready)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning *;`;

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
      rawUrl,
      isProfileReady,
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

    if (skills && skills.length != 0) {
      const skillList = await saveApplicantDetailsList(
        skills,
        "applicant_skills",
        "skills",
        rows[0].applicant_profile_id
      );
    }

    if (workExperience && workExperience.length != 0) {
      const work = workExperience.map(
        async (exp) => await saveApplicantWorkExperience(exp)
      );
    }

    if (educationalBackground && educationalBackground.length != 0) {
      saveApplicantEducationalBackground;
      const educBG = educationalBackground.map(
        async (educ) => await saveApplicantEducationalBackground(educ)
      );
    }

    if (certifications && certifications.length != 0) {
      const certf = certifications.map(
        async (cert) => await saveCertifications(cert)
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

  const insertQuery = ``;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      applicantId,
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
  } = educBackground;

  const insertQuery = `INSERT INTO ${dbSchema}.applicant_educational_background
  (applicant_id, created_at, educ_level_id, educ_level_name, field_of_study, school, school_address, start_month, start_year, end_month, end_year)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning *;`;

  try {
    const { rows } = await dbQuery.query(insertQuery, [
      applicantId,
      now,
      educLevelId,
      educLevelName,
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
    educLevelId: raw.educ_level_id,
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
      now,
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

const deleteArrayApplicantEntry = async (jobId, tableName, columnName) => {
  const deleteQuery = `DELETE FROM ${dbSchema}.${tableName} WHERE ${columnName} = $1;`;
  try {
    const { rows } = await dbQuery.query(deleteQuery, [jobId]);
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
  try {
    const insertedList = list.map(
      async (item) =>
        await genericInsert(tableName, columnName, item, {
          column: "job_id",
          value: applicantId,
        })
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

const mappedProfile = async (raw) => {
  return {
    applicantProfileId: raw.applicant_id,
    userId: raw.userId,
    firstName: raw.firstname,
    lastName: raw.lastname,
    photoUrl: raw.photo_url,
    videoCVUrl: raw.video_cv_url,
    jobTitle: raw.job_title,
    rating: raw.applicant_rating,
    workSetupId: raw.work_setup_id,
    workSetupName: raw.work_setup_name,
    email: raw.email,
    address: raw.address,
    city: raw.city,
    country: raw.country,
    contactNumber: raw.cell_number,
    shortBio: raw.short_bio,
    servicesProvided: raw.services_provided,
    jobTypeId: raw.job_type_id,
    jobTypeName: raw.job_type_name,
    jobLevelId: raw.job_level_id,
    jobLevelName: raw.job_level_name,
    salaryMinimum: raw.salary_minimum,
    salaryMaximum: raw.salary_maximum,
    workExperience: [],
    educationalBackground: [],
    certifications: [],
    skills: [],
    documents: [],
  };
};

export { candidateListByJobId, appplicantProfile, createApplicationProfile };

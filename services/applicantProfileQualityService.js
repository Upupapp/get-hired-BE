/**
 * PROFILE (re-run after Applicant Data Foundation v2) -- backend profile
 * completeness scoring.
 *
 * Ported deliberately, not redesigned, from the existing frontend-only
 * src/app/public/services/profile-quality.service.ts -- same weights,
 * same field checks, same labels. That service was built when no backend
 * applicant data existed at all; now that applicants_profile and its
 * supporting tables are real, this is the backend-equivalent so MATCH's
 * employer-side signals and any future server-rendered surface can read
 * the same completeness number without duplicating the scoring logic in
 * a second, possibly-drifting implementation.
 *
 * Input shape: exactly what services/applicant.service.js's
 * appplicantProfile(uid) already returns (jobTitle, shortBio,
 * contactNumber, city, country, workSetupId, jobTypeId, jobLevelId,
 * salaryMinimum, salaryMaximum, workExperience[], educationalBackground[],
 * skills[], photoUrl, videoCVUrl) -- no new query, this is a pure
 * function over data that's already fetched elsewhere.
 */

const WEIGHTS = {
  basicInfo: 20,
  workSetupPrefs: 10,
  salaryPrefs: 10,
  workExperience: 20,
  education: 15,
  skills: 15,
  photoOrVideo: 10,
};

const labelFor = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 30) return "Needs Work";
  return "Just Started";
};

const evaluateProfileCompleteness = (profile) => {
  if (!profile) {
    return {
      score: 0,
      label: "Just Started",
      missingFields: ["Create your profile to get started."],
      suggestions: ["Create your free profile to unlock match grades."],
    };
  }

  let score = 0;
  const missingFields = [];
  const suggestions = [];

  if (profile.jobTitle && profile.shortBio && profile.contactNumber && profile.city && profile.country) {
    score += WEIGHTS.basicInfo;
  } else {
    missingFields.push("Basic profile info (title, bio, contact, location)");
    suggestions.push("Complete your basic profile info.");
  }

  if (profile.workSetupId && profile.jobTypeId && profile.jobLevelId) {
    score += WEIGHTS.workSetupPrefs;
  } else {
    missingFields.push("Work preferences (setup, job type, level)");
    suggestions.push("Add your preferred work setup and job level.");
  }

  if (profile.salaryMinimum && profile.salaryMaximum) {
    score += WEIGHTS.salaryPrefs;
  } else {
    missingFields.push("Salary expectations");
    suggestions.push("Add your expected salary range.");
  }

  if ((profile.workExperience || []).length > 0) {
    score += WEIGHTS.workExperience;
  } else {
    missingFields.push("Work experience");
    suggestions.push("Add at least one work experience entry.");
  }

  if ((profile.educationalBackground || []).length > 0) {
    score += WEIGHTS.education;
  } else {
    missingFields.push("Education");
    suggestions.push("Add your educational background.");
  }

  if ((profile.skills || []).length > 0) {
    score += WEIGHTS.skills;
  } else {
    missingFields.push("Skills");
    suggestions.push("Add skills to improve your match.");
  }

  if (profile.photoUrl || profile.videoCVUrl) {
    score += WEIGHTS.photoOrVideo;
  } else {
    missingFields.push("Profile photo or video CV");
    suggestions.push("Add a profile photo or short video introduction.");
  }

  return { score, label: labelFor(score), missingFields, suggestions };
};

export { evaluateProfileCompleteness };

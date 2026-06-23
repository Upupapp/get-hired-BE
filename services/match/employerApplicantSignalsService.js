import { getApplicantEvidenceBundle, getEmployerJobApplicantsForMatch } from "./matchReadinessBridgeService";

/**
 * MATCH v5 -- Employer Applicant Fit Signals, backend implementation.
 *
 * Closes the single largest gap from GETHIRED_MATCH_V5_RELEASE_GATE.md
 * (Gate F, "no employer-side applicant-signals surface exists at all") and
 * the matching gap in GETHIRED_APPLICANT_DATA_FOUNDATION_V2_MATCH_READINESS_BRIDGE.md
 * ("building the actual employer-facing UI/scoring is MATCH's own scope,
 * not done this pass"). Now that real applicant data exists (see the
 * Applicant Data Foundation v2 migration), this is buildable for the first
 * time this session.
 *
 * Deliberately backend, not frontend -- MATCH v5's own registered rule
 * ("employer-side scoring should prefer backend due to company-scoped
 * data") and this data is now genuinely company-scoped (the bridge's
 * ownership check), unlike the applicant-side score which has always been
 * safe to compute client-side against the applicant's own data.
 *
 * Decision-support only, per every MATCH command's standing rule: returns
 * signals (matched/missing/evidence), never a hire/reject recommendation,
 * never hides an applicant, never auto-filters.
 */

const REQUIRED_SKILLS_WEIGHT = 60;
const APPLICATION_COMPLETENESS_WEIGHT = 40;

const normalize = (value) => (value || "").toLowerCase().trim();

const skillsEqual = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

/**
 * One applicant's fit signals against one job. Disclaimer text is the
 * exact registered string -- callers must always render it alongside any
 * score/label, never show one without the other.
 */
const getApplicantFitSignals = async (firebaseUid, jobId) => {
  const bundle = await getApplicantEvidenceBundle(firebaseUid, jobId);

  if (!bundle.applicantProfile) {
    return {
      label: "Limited Data",
      matchedRequiredSkills: [],
      missingRequiredSkills: bundle.job ? (bundle.job.skills || []) : [],
      hasCv: false,
      applicationCompleteness: 0,
      dataUsed: [],
      dataNotUsed: bundle.dataNotUsed,
      disclaimer: DISCLAIMER,
    };
  }

  const jobRequiredSkills = (bundle.job && bundle.job.skills) || [];
  const applicantSkills = bundle.applicantProfile.skills || [];

  const matchedRequiredSkills = jobRequiredSkills.filter((jobSkill) =>
    applicantSkills.some((applicantSkill) => skillsEqual(applicantSkill, jobSkill))
  );
  const missingRequiredSkills = jobRequiredSkills.filter(
    (jobSkill) => !matchedRequiredSkills.includes(jobSkill)
  );

  const skillScore = jobRequiredSkills.length > 0
    ? (matchedRequiredSkills.length / jobRequiredSkills.length) * REQUIRED_SKILLS_WEIGHT
    : 0;
  // Application completeness has no real signal yet (no completeness
  // score exists on job_applicants -- see
  // GETHIRED_APPLICANT_DATA_FOUNDATION_V2_DATA_QUALITY_SPEC.md). Using
  // "has a CV/document on file" as the only available proxy rather than
  // inventing a fake completeness number.
  const completenessScore = bundle.applicantProfile.hasCv ? APPLICATION_COMPLETENESS_WEIGHT : 0;

  const totalScore = Math.round(skillScore + completenessScore);

  return {
    label: labelFor(totalScore, jobRequiredSkills.length),
    matchedRequiredSkills,
    missingRequiredSkills,
    hasCv: bundle.applicantProfile.hasCv,
    applicationCompleteness: bundle.applicantProfile.hasCv ? 100 : 0,
    dataUsed: ["profile_skills", "job_required_skills", "document_status"],
    dataNotUsed: bundle.dataNotUsed,
    disclaimer: DISCLAIMER,
  };
};

const labelFor = (score, requiredSkillCount) => {
  if (requiredSkillCount === 0) {
    return "Limited Data";
  }
  if (score >= 75) return "Strong Signals";
  if (score >= 50) return "Good Signals";
  if (score >= 25) return "Needs Review";
  return "Missing Required Signals";
};

const DISCLAIMER = "Match Signals are decision-support indicators based on the job post and submitted applicant information. Review the full application before making hiring decisions. Match Signals should not be used as the sole basis for hiring decisions.";

/**
 * Every applicant for a job, with fit signals attached. Reuses the
 * bridge's existing company-ownership check -- this function has no
 * authorization logic of its own, so there is exactly one place the
 * ownership check can go wrong, not two.
 */
const getJobApplicantsWithFitSignals = async (callerFirebaseUid, jobId) => {
  const applicants = await getEmployerJobApplicantsForMatch(callerFirebaseUid, jobId);

  const withSignals = await Promise.all(
    applicants.map(async (applicant) => {
      // `applicants` here is already mapped by job.service.js's
      // mappedBasicApplicantDetails() -- the firebase uid survives that
      // mapping as `userId` (from applicants_profile.user_id, joined to
      // job_applicants.candidate_id), not `candidate_id`. Bug found and
      // fixed during the Employer Portal v3 pass: this was never caught
      // by the prior smoke test because that test only exercised the
      // FORBIDDEN/ownership-rejection path, never reached this line.
      const signals = await getApplicantFitSignals(applicant.userId, jobId);
      return { ...applicant, fitSignals: signals };
    })
  );

  // Every applicant is always returned -- no filtering, no hiding, no
  // sorting by score. Caller (the employer's applicant list UI) decides
  // presentation; this service never makes an applicant disappear.
  return withSignals;
};

export { getApplicantFitSignals, getJobApplicantsWithFitSignals, DISCLAIMER };

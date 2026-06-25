import { successMessage, errorMessage, status } from '../helpers/status'
import {
  getAllInterviews,
  getAllInterviewTemplates,
  getInterviewRecipients,
  getTemplateQuestions,
  getTemplateCompanyId,
  createGroupInterview,
  createInterviewTemplateQuestions,
  createQuestion,
  // getInterviewsOfUser
} from '../services/interview.service'
import { getUserCompany } from './companiesController'
import dbQuery from '../db/dbQuery'

import env from '../env'

const dbSchema = env.schema

// Confirms the authenticated caller actually belongs to companyId, rather
// than trusting the client-supplied query param directly.
// STITCH/security fix (GH-ACT-008 -- object-level authorization).
const callerBelongsToCompany = async (uid, companyId) => {
  const userCompany = await getUserCompany(uid)
  return userCompany && userCompany.companyId === companyId
}

const getAllInterviewsOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getAllInterviews(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewsTemplatesOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getAllInterviewTemplates(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewRecipientsByCompanyId = async (req, res) => {
  const { companyId } = req.query
  try {
    if (!(await callerBelongsToCompany(req.user.uid, companyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getInterviewRecipients(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getInterviewTemplateQuestions = async (req, res) => {
  const { templateId } = req.query
  try {
    const templateCompanyId = await getTemplateCompanyId(templateId)
    if (!templateCompanyId || !(await callerBelongsToCompany(req.user.uid, templateCompanyId))) {
      // QA10 FIX-12: consistent JSON 403 shape instead of bare string.
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const dbResponse = await getTemplateQuestions(templateId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const saveGroupInterview = async (req, res) => {
  const { uid } = req.user

  try {
    const dbResponse = await createGroupInterview(req.body, uid)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const saveQuestionTemplate = async (req, res) => {
  const { uid } = req.user
  const { jobId, templateName, interviewQuestions } = req.body
  try {
    // QA9 FIX-4 BOLA: derive companyId from JWT, never from req.body —
    // any employer could otherwise create a template attributed to a
    // different company by supplying a spoofed companyId.
    const callerCompany = await getUserCompany(uid)
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const companyId = callerCompany.companyId

    let questionTemplate = null

    const template = await createInterviewTemplateQuestions(
      jobId,
      templateName,
      companyId,
      uid
    )

    if (interviewQuestions && interviewQuestions.length != 0) {
      const questionPromises = Promise.all(
        interviewQuestions.map(async (question, index) => {
          return await createQuestion(
            {
              ...question,
              sequence: question.sequence ? question.sequence : index + 1
            },
            template.jobInterviewTemplateId
          )
        })
      )

      questionTemplate = {
        ...template,
        interviewQuestions: await questionPromises
      }
    }

    successMessage.data = questionTemplate
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const updateJobInterviewQuestion = async (req, res) => {
  try {
    const { questionId } = req.body
    // QA9 FIX-5 BOLA: verify the question belongs to the caller's company
    // before allowing an update. interview_template_question has no company_id
    // directly — join through job_interview_template to check ownership.
    const callerCompany = await getUserCompany(req.user.uid)
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    // OPT-QA9-1: fold ownership check into the UPDATE WHERE via a subquery —
    // eliminates the separate SELECT round-trip (was 3 calls, now 2).
    // Zero rows returned = question not found OR company mismatch → 403.
    const updateResult = await dbQuery.query(
      `UPDATE ${dbSchema}.interview_template_question
         SET template_question=$1,
             template_answer_duration=$2,
             template_question_retakes=$3,
             updated_at=now(),
             sequence=$4
       WHERE template_question_id=$5
         AND job_interview_template_id IN (
               SELECT job_interview_template_id
               FROM ${dbSchema}.job_interview_template
               WHERE company_id=$6
             )
       RETURNING *`,
      [
        req.body.question,
        req.body.answerDuration,
        req.body.retakes,
        req.body.sequence,
        questionId,
        callerCompany.companyId,
      ]
    )
    if (!updateResult.rows || updateResult.rows.length === 0) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }

    // Map the row directly from the UPDATE RETURNING result — no second DB call.
    const { rows: [raw] } = updateResult
    const question = {
      questionId: raw.template_question_id,
      question: raw.template_question,
      answerDuration: raw.template_answer_duration,
      retakes: raw.template_question_retakes,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      templateId: raw.job_interview_template_id,
      sequence: raw.sequence,
    }
    successMessage.data = question
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

const getListByUser = async (req, res) => {
  const { uid } = req.user
  try {
    // const dbResponse = await getInterviewsOfUser(uid)
    successMessage.data = null
    return res.status(status.success).send(successMessage)
  } catch (error) {
    console.error('[interviewController] error:', error);
    errorMessage.error = "Operation not successful. Please try again."
    return res.status(status.error).send(errorMessage)
  }
}

/**
 * GET /api/interview/hub
 * Returns company-scoped applications that have video answers or are in an
 * interview-related status. No scheduling, no AI claims, no fake counts.
 * Authorization: JWT-derived company only — never caller-supplied.
 * B03: RecruiterInterviewHub unstub.
 */
const getInterviewHub = async (req, res) => {
  try {
    const callerCompany = await getUserCompany(req.user.uid)
    if (Array.isArray(callerCompany) || !callerCompany || !callerCompany.companyId) {
      return res.status(403).json({ message: "You don't have permission to do that." })
    }
    const companyId = callerCompany.companyId

    // Fetch applications for this company's jobs, joining:
    //   - jobs for company scoping (the authorization pivot)
    //   - users for applicant display name
    //   - job_applicant_status for status label
    //   - interview_answers subquery for video answer count
    //
    // interview_answers.applicant_id is a FK to applicants_profile.applicant_profile_id
    // and the profile's user_id matches job_applicants.candidate_id — so we join
    // through applicants_profile to correlate answers to this application's candidate.
    //
    // Status filter: include ALL statuses so recruiters can see the full picture.
    // The FE filter chips let them narrow to video-answer or interview-stage items.
    const { rows } = await dbQuery.query(
      `SELECT
         ja.job_application_id,
         ja.candidate_id,
         ja.application_status_id,
         ja.date_applied,
         ja.updated_at,
         j.job_id,
         j.job_title,
         s.job_applicant_status_name,
         -- STITCH QA11 FIX F-01: users table uses firstname/lastname (no underscores).
         -- users.email was dropped in DDL migration; email is on user_credentials.
         u.firstname,
         u.lastname,
         uc.email,
         u.photo_url,
         COALESCE(va.video_answer_count, 0) AS video_answer_count
       FROM ${dbSchema}.job_applicants ja
       JOIN ${dbSchema}.jobs j ON j.job_id = ja.job_id
       LEFT JOIN ${dbSchema}.job_applicant_status s
         ON s.job_applicant_status_id = ja.application_status_id
       LEFT JOIN ${dbSchema}.applicants_profile ap
         ON ap.user_id = ja.candidate_id
       LEFT JOIN ${dbSchema}.users u
         ON u.uid = ja.candidate_id
       -- STITCH QA11 FIX F-01: users.email was dropped; join user_credentials for email
       LEFT JOIN ${dbSchema}.user_credentials uc
         ON uc.uid = ja.candidate_id
       LEFT JOIN (
         SELECT ia.applicant_id, COUNT(*) AS video_answer_count
         FROM ${dbSchema}.interview_answers ia
         GROUP BY ia.applicant_id
       ) va ON va.applicant_id = ap.applicant_profile_id
       WHERE j.company_id = $1
         AND ja.is_archived IS DISTINCT FROM true
       ORDER BY COALESCE(ja.updated_at, ja.date_applied) DESC
       LIMIT 200`,
      [companyId]
    )

    const items = rows.map(r => ({
      applicationId: r.job_application_id,
      applicantId: r.candidate_id,
      applicantName: r.firstname && r.lastname
        ? `${r.firstname} ${r.lastname}`.trim()
        : (r.email || null),
      applicantEmail: r.email || null,
      applicantPhotoUrl: r.photo_url || null,
      applicationStatusId: r.application_status_id,
      applicationStatus: r.job_applicant_status_name || 'Unknown',
      dateApplied: r.date_applied,
      lastActivity: r.updated_at || r.date_applied,
      jobId: r.job_id,
      jobTitle: r.job_title,
      videoAnswerCount: parseInt(r.video_answer_count, 10) || 0,
      hasVideoAnswers: parseInt(r.video_answer_count, 10) > 0,
    }))

    return res.json({ items, total: items.length })
  } catch (err) {
    console.error('[getInterviewHub] error:', err)
    return res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
}

export {
  getAllInterviewsOfCompanies,
  getAllInterviewsTemplatesOfCompanies,
  getAllInterviewRecipientsByCompanyId,
  getInterviewTemplateQuestions,
  saveGroupInterview,
  saveQuestionTemplate,
  updateJobInterviewQuestion,
  getListByUser,
  getInterviewHub,
}

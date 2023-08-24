import { successMessage, errorMessage, status } from '../helpers/status'
import {
  getAllInterviews,
  getAllInterviewTemplates,
  getInterviewRecipients,
  getTemplateQuestions,
  createGroupInterview
} from '../services/interview.service'

import env from '../env'

const now = new Date()

const getAllInterviewsOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    const dbResponse = await getAllInterviews(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewsTemplatesOfCompanies = async (req, res) => {
  const { companyId } = req.query
  try {
    const dbResponse = await getAllInterviewTemplates(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getAllInterviewRecipientsByCompanyId = async (req, res) => {
  const { companyId } = req.query
  try {
    const dbResponse = await getInterviewRecipients(companyId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const getInterviewTemplateQuestions = async (req, res) => {
  const { templateId } = req.query
  try {
    const dbResponse = await getTemplateQuestions(templateId)
    successMessage.data = dbResponse
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

const saveGroupInterview = async (req, res) => {
  const { uid } = req.user

  try {
    const dbResponse = await createGroupInterview(req.body, uid)
    successMessage.data = dbResponse;
    return res.status(status.success).send(successMessage)
  } catch (error) {
    errorMessage.error = 'ERROR: ' + error
    return res.status(status.error).send(errorMessage)
  }
}

export {
  getAllInterviewsOfCompanies,
  getAllInterviewsTemplatesOfCompanies,
  getAllInterviewRecipientsByCompanyId,
  getInterviewTemplateQuestions,
  saveGroupInterview
}

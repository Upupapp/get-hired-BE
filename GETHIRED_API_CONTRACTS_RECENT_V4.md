# GETHIRED API CONTRACTS — Easy Job Post Assistant V2 (RECENT V4)
Date: 2026-06-28

## POST /api/recruiter/job-post-assistant/upload
Auth: Bearer JWT (verifyAuth)
Content-Type: multipart/form-data
Body: FormData { file: File (PDF|DOC|DOCX|TXT|RTF, max 10MB) }
Success: 200 { success: true, source: 'upload', filename: string, extractedFields: AssistantExtractionResult }
Error 400: { message: 'Unsupported file type...' | 'File is too large...' | 'File content does not match...' }
Error 401: { message: 'Unauthorized.' }
Error 403: { message: 'No company associated with this account.' }
Error 500: { message: 'Could not read the file content. Please try a different file format.' }

## POST /api/recruiter/job-post-assistant/link
Auth: Bearer JWT (verifyAuth)
Content-Type: application/json
Body: { url: string }
Success: 200 { success: true, source: 'link', url: string, extractedFields: AssistantExtractionResult }
Error 400: { message: 'URL is required.' | 'URL is too long...' | 'Invalid URL format.' | 'Only http and https URLs are supported.' }
Error 401: { message: 'Unauthorized.' }
Error 403: { message: 'No company associated with this account.' }
Error 422: { message: 'The URL could not be reached or is not allowed.' }
Error 500: { message: 'Could not fetch the URL. Please check the link and try again.' }

## AssistantExtractionResult shape
{
  jobTitle: string|null, jobCity: string|null, jobCountry: string,
  jobDescription: string|null, jobDuties: string|null,
  workSetupHint: string|null, jobTypeHint: string|null, jobLevelHint: string|null,
  salaryMinimum: number|null, salaryMaximum: number|null, salaryCurrency: string,
  requirements: string[], goodToHave: string[], skills: string[],
  confidence: Record<string,string>, missingRequiredFields: string[], warnings: string[]
}

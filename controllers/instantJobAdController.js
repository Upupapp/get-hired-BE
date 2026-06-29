/**
 * Instant Job Ad Controller V4
 * POST /api/recruiter/job-post-assistant/generate-intent
 *
 * Authenticated endpoint: generates a structured draft from minimal inputs.
 * Company ID is always resolved from the JWT — never from the request body.
 * SYNTAX: no ?. or ?? — Node 14 ESM safe.
 */

import { resolveHiringIntent } from '../services/hiringIntentResolverV4';
import { generateStructuredDraft, redactForAnonymous } from '../services/instantJobAdGeneratorV4';
import { validateGenerationInputs, detectBoilerplate, validateAntiDiscrimination, detectFakeClaims } from '../services/instantJobAdValidatorsV4';
import { getUserCompanyForRequest } from './companiesController';

// POST /api/recruiter/job-post-assistant/generate-intent
// Authenticated employers only. Generates a full structured draft from inputs.
export async function generateJobAdIntent(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    // Resolve company from auth — never trust client-supplied IDs
    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company associated with this account.' });
    }
    var companyId = company.companyId;

    var body = req.body || {};
    var rawInputs = {
      jobTitle: body.jobTitle || '',
      location: body.location || '',
      workSetup: body.workSetup || '',
      employmentType: body.employmentType || '',
      companyName: body.companyName || '',
      industry: body.industry || '',
      salaryMin: (body.salaryMin !== undefined && body.salaryMin !== null && body.salaryMin !== '') ? Number(body.salaryMin) : null,
      salaryMax: (body.salaryMax !== undefined && body.salaryMax !== null && body.salaryMax !== '') ? Number(body.salaryMax) : null,
      salaryCurrency: body.salaryCurrency || 'PHP',
      benefitsProvided: Array.isArray(body.benefitsProvided) ? body.benefitsProvided : [],
      schedule: body.schedule || null,
      openings: body.openings || null,
      sourceRoute: 'employer_portal',
    };

    // Validate and sanitize inputs
    var validation = validateGenerationInputs(rawInputs);
    if (!validation.valid) {
      var blockingIssues = validation.issues.filter(function(i) { return i.severity === 'blocking'; });
      if (blockingIssues.length > 0) {
        return res.status(422).json({ message: blockingIssues[0].message, issues: validation.issues });
      }
    }

    var inputs = validation.sanitized;
    inputs.salaryMin = rawInputs.salaryMin;
    inputs.salaryMax = rawInputs.salaryMax;
    inputs.benefitsProvided = rawInputs.benefitsProvided;
    inputs.openings = rawInputs.openings;
    inputs.sourceRoute = 'employer_portal';

    // Phase 2: Resolve hiring intent
    var hiringIntent = resolveHiringIntent({
      jobTitle: inputs.jobTitle,
      workSetup: inputs.workSetup,
      employmentType: inputs.employmentType,
      companyName: inputs.companyName,
      industry: inputs.industry,
    });

    // Check for blocking intent flags
    var intentBlocks = (hiringIntent.reviewFlags || []).filter(function(f) { return f.blocksPublish === true; });
    if (intentBlocks.length > 0) {
      return res.status(422).json({ message: intentBlocks[0].message, issues: intentBlocks });
    }

    // Phase 4: Generate structured draft
    var draft = generateStructuredDraft(inputs, hiringIntent);

    // Phase 5: Additional validation on generated content
    var boilerplateCheck = detectBoilerplate(draft.content.roleSummary);
    if (boilerplateCheck.detected) {
      return res.status(422).json({ message: 'Generated content contains unexpected boilerplate. Please provide a more specific job title.', issues: boilerplateCheck.issues });
    }

    var fullText = draft.content.roleSummary + ' ' + draft.content.responsibilities.join(' ') + ' ' + draft.content.requiredQualifications.join(' ');
    var discriminationCheck = validateAntiDiscrimination(inputs.jobTitle + ' ' + fullText);
    if (!discriminationCheck.valid) {
      draft.quality.reviewFlags = draft.quality.reviewFlags.concat(discriminationCheck.issues);
    }

    var fakeCheck = detectFakeClaims(inputs.jobTitle + ' ' + (inputs.companyName || ''));
    if (fakeCheck.found) {
      draft.quality.reviewFlags = draft.quality.reviewFlags.concat(fakeCheck.issues);
    }

    // Return full draft to authenticated employer
    return res.status(200).json({
      success: true,
      draft: draft,
      companyId: companyId,
    });
  } catch (err) {
    console.error('[InstantJobAd] generateJobAdIntent error:', err && err.message);
    return res.status(500).json({ message: 'An error occurred generating the job draft. Please try again.' });
  }
}

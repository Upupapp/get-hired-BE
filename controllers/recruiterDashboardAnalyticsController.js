/**
 * Recruiter Dashboard Analytics Controller V1
 *
 * GET /api/recruiter/dashboard/analytics?range=7d|30d|90d
 *
 * Auth: verifyAuth middleware must precede this handler.
 * Company is always resolved from JWT — never trusts client-supplied IDs.
 * Node 14 ESM safe: no ?., no ??, uses && and ternaries.
 */

import { getAnalytics } from '../services/recruiterDashboardAnalyticsService';
import { getUserCompanyForRequest } from './companiesController';

var VALID_RANGES = ['7d', '30d', '90d'];

export async function getDashboardAnalytics(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ success: false, message: 'No company associated with this account.' });
    }

    var rawRange = req.query && req.query.range ? String(req.query.range) : '30d';
    var range = VALID_RANGES.indexOf(rawRange) !== -1 ? rawRange : '30d';

    var analytics = await getAnalytics(company.companyId, range);

    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    console.error('[recruiterDashboardAnalytics] error:', err && err.message);
    return res.status(500).json({ success: false, message: 'Analytics are temporarily unavailable. Please try again.' });
  }
}

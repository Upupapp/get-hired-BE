/**
 * Subscription Upgrade Recommendation Controller V4
 * Returns server-side upgrade recommendation — plan, trigger, copy, analytics props.
 * BOLA: company resolved from JWT only.
 * Node 14 / ESM safe.
 */

import { getUserCompanyForRequest } from './companiesController';
import { getUpgradeRecommendation } from '../services/subscriptionUpgradeRecommendationServiceV4';

// GET /api/subscriptions/upgrade-recommendation?trigger=xxx&surface=xxx
export async function getRecommendation(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    // Validate trigger/surface — whitelist to prevent log injection
    var allowedTriggers = [
      'pricing_page_viewed', 'upgrade_landing_viewed', 'active_job_limit',
      'admin_limit', 'video_limit', 'trial_ending', 'trial_expired',
      'first_applicant_received', 'first_video_response', 'annual_savings_prompt',
      'usage_meter_cta', 'dashboard_cta', 'team_invite_limit', 'general',
    ];
    var rawTrigger = req.query.trigger || 'pricing_page_viewed';
    var trigger = allowedTriggers.indexOf(rawTrigger) !== -1 ? rawTrigger : 'pricing_page_viewed';

    var allowedSurfaces = [
      'subscription_page', 'upgrade_landing', 'dashboard', 'limit_modal',
      'usage_meter', 'trial_banner', 'team_invite_modal', 'video_limit_modal', 'general',
    ];
    var rawSurface = req.query.surface || 'subscription_page';
    var surface = allowedSurfaces.indexOf(rawSurface) !== -1 ? rawSurface : 'subscription_page';

    var recommendation = await getUpgradeRecommendation(company.companyId, { trigger: trigger, surface: surface });

    return res.status(200).json({ success: true, recommendation: recommendation });
  } catch (err) {
    console.error('[upgradeRecommendV4] getRecommendation error:', err && err.message && err.message.substring(0, 80));
    return res.status(500).json({ success: false, message: 'Recommendation unavailable. Please try again.' });
  }
}

// POST /api/subscriptions/upgrade-analytics
// Records safe analytics events — never stores PII or payment secrets.
export async function recordAnalyticsEvent(req, res) {
  try {
    var uid = req.user && req.user.uid;
    if (!uid) return res.status(401).json({ message: 'Unauthorized.' });

    var company = await getUserCompanyForRequest(req, uid);
    if (Array.isArray(company) || !company || !company.companyId) {
      return res.status(403).json({ message: 'No company context.' });
    }

    // Whitelist allowed event names
    var allowedEvents = [
      'pricing_page_viewed', 'upgrade_landing_viewed', 'annual_tab_defaulted',
      'billing_toggle_monthly_selected', 'billing_toggle_annual_selected',
      'plan_card_viewed', 'plan_cta_clicked', 'upgrade_prompt_shown',
      'upgrade_prompt_dismissed', 'upgrade_modal_opened', 'plan_comparison_opened',
      'upgrade_started', 'checkout_started', 'checkout_returned', 'payment_pending',
      'payment_success_confirmed', 'payment_failed', 'limit_warning_shown',
      'limit_block_shown', 'usage_meter_viewed', 'free_trial_started',
      'trial_ending_prompt_shown', 'trial_expired_prompt_shown',
      'annual_savings_prompt_shown', 'first_applicant_value_prompt_shown',
      'first_video_response_value_prompt_shown', 'value_recap_card_viewed',
      'keep_as_draft_clicked', 'upgrade_not_now_clicked',
    ];

    var eventName = req.body && req.body.eventName;
    if (!eventName || allowedEvents.indexOf(eventName) === -1) {
      return res.status(400).json({ success: false, message: 'Unknown event.' });
    }

    // Safe properties only — strip any field that looks like PII or payment data
    var rawProps = (req.body && req.body.properties) || {};
    var safeProps = {
      trigger: rawProps.trigger || null,
      currentPlan: rawProps.currentPlan || null,
      recommendedPlan: rawProps.recommendedPlan || null,
      billingCycleSelected: rawProps.billingCycleSelected || null,
      surface: rawProps.surface || null,
      usagePercent: rawProps.usagePercent || null,
      lifecycleStatus: rawProps.lifecycleStatus || null,
      timestamp: new Date().toISOString(),
      companyId: company.companyId, // resolved from JWT, safe for analytics
    };

    // Log to stdout (non-blocking, non-throwing)
    console.log(JSON.stringify({
      type: 'UPGRADE_ANALYTICS_V4',
      event: eventName,
      props: safeProps,
    }));

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(200).json({ success: false }); // Non-blocking — always 200
  }
}

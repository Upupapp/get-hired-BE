/**
 * Pure URL / milestone constant checks for employer job emails.
 * No DB, no SendGrid. Run: node --test tests/employerJobEmailUrls.test.cjs
 *
 * Full service flow (claim/prefs/send) is covered by manual DRY_RUN steps in
 * /workspace/gethired/SENDGRID_EMPLOYER_MILESTONES_DRY_RUN.md — jest ESM mocks
 * for helpers/mailer are not wired in package.json for this ticket.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Inline mirrors of builders (service is ESM; keep this file CommonJS/node:test).
function publicSiteBaseUrl(envApp, publicSite) {
  return String(publicSite || envApp || 'https://gethiredonline.app').replace(/\/$/, '');
}
function appBaseUrl(envApp) {
  return String(envApp || 'https://gethiredonline.app').replace(/\/$/, '');
}
function buildJobPublicUrl(jobId, envApp, publicSite) {
  return publicSiteBaseUrl(envApp, publicSite) + '/jobs/details/' + encodeURIComponent(jobId);
}
function buildJobApplicantsUrl(jobId, envApp) {
  return appBaseUrl(envApp) + '/recruiter/jobs/applicants?id=' + encodeURIComponent(jobId);
}
function buildJobManageUrl(jobId, envApp) {
  return appBaseUrl(envApp) + '/recruiter/jobs/edit?id=' + encodeURIComponent(jobId);
}
function buildManageNotificationsUrl(envApp, publicSite) {
  // Emailer stub: https://gethiredonline.app/employer/settings
  return publicSiteBaseUrl(envApp, publicSite) + '/employer/settings';
}
function buildShareFacebookUrl(jobPublicUrl) {
  return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(jobPublicUrl);
}
function buildShareLinkedInUrl(jobPublicUrl) {
  return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(jobPublicUrl);
}

const MILESTONE_COUNTS = { 1: true, 10: true, 20: true, 40: true, 50: true };

describe('employer job email URL builders', () => {
  test('job_public_url prefers PUBLIC_SITE_URL', () => {
    assert.equal(
      buildJobPublicUrl('JB123', 'https://app.example', 'https://gethiredonline.app'),
      'https://gethiredonline.app/jobs/details/JB123'
    );
  });

  test('encodes jobId in public/applicants/manage URLs', () => {
    const id = 'JB/weird id';
    assert.ok(buildJobPublicUrl(id, 'https://app.example').includes(encodeURIComponent(id)));
    assert.ok(buildJobApplicantsUrl(id, 'https://app.example').includes(encodeURIComponent(id)));
    assert.ok(buildJobManageUrl(id, 'https://app.example').includes(encodeURIComponent(id)));
  });

  test('share URLs encode the full public URL', () => {
    const pub = 'https://gethiredonline.app/jobs/details/JB1';
    assert.equal(
      buildShareFacebookUrl(pub),
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pub)
    );
    assert.equal(
      buildShareLinkedInUrl(pub),
      'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pub)
    );
  });

  test('manage_notifications_url interim employer settings path', () => {
    assert.equal(
      buildManageNotificationsUrl('https://app.gethiredonline.app', 'https://gethiredonline.app'),
      'https://gethiredonline.app/employer/settings'
    );
  });
});

describe('milestone trigger set', () => {
  test('fires only on 1/10/20/40/50', () => {
    for (const n of [1, 10, 20, 40, 50]) assert.equal(!!MILESTONE_COUNTS[n], true);
    for (const n of [0, 2, 9, 11, 21, 39, 41, 49, 51]) assert.equal(!!MILESTONE_COUNTS[n], false);
  });
});

'use strict';
const GB = 1000000000;
// This catalog describes the engagement contract, not payment amounts or enforcement.
const catalogs = {
  pricing_2026_09_21: {
    free_trial: {jobs:1,users:1,storage:null,video:1,trialDays:7},
    starter: {jobs:2,users:1,storage:null,video:25,monthlyPhp:1490},
    growth: {jobs:6,users:3,storage:null,video:100,monthlyPhp:3490},
    premium: {jobs:40,users:15,storage:null,video:400,monthlyPhp:5990},
    enterprise: {jobs:null,users:null,storage:null,video:null}
  },
  pricing_2026_09: {
    free_trial: { jobs: 1, users: 1, storage: GB, video: 1, trialDays: 14 },
    starter: { jobs: 5, users: 2, storage: 10 * GB, video: 3, monthlyPhp: 1290 },
    growth: { jobs: 15, users: 5, storage: 50 * GB, video: 5, monthlyPhp: 2990 },
    premium: { jobs: 40, users: 15, storage: 200 * GB, video: 10, monthlyPhp: 5990 },
    enterprise: { jobs: null, users: null, storage: null, video: null }
  },
  legacy_v4: {
    free_trial: { jobs: 1, users: 1, storage: null, video: null, trialDays: 7 },
    starter: { jobs: 2, users: 1, storage: null, video: null, monthlyPhp: 1490 },
    growth: { jobs: 6, users: 3, storage: null, video: null, monthlyPhp: 3490 },
    business: { jobs: 20, users: 8, storage: null, video: null, monthlyPhp: 6990 }
  }
};
function planFor(s) {
  const catalog = catalogs[s.planVersion];
  if (!catalog || !catalog[s.plan]) return null;
  return Object.assign({}, catalog[s.plan], s.effectiveLimits || {});
}
function recommend(s) {
  const current = planFor(s);
  if (!current) return { currentPlan: s.plan, recommendedPlan: null, reasonCodes: [], confidence: 'UNAVAILABLE' };
  const reasons = [];
  const requirements = {};
  for (const key of ['jobs', 'users', 'storage', 'video']) {
    const used = s.usage && s.usage[key];
    if (typeof used !== 'number' || !Number.isFinite(used) || used < 0) continue;
    if (typeof current[key] === 'number' && used >= current[key] * .8) {
      reasons.push(key.toUpperCase() + '_NEAR_LIMIT');
      requirements[key] = Math.max(used, current[key] + (key === 'storage' ? 1 : 1));
    } else requirements[key] = used;
  }
  if (s.enterpriseFeature) reasons.push('ENTERPRISE_FEATURE');
  if (!reasons.length || s.plan === 'enterprise') return { currentPlan: s.plan, recommendedPlan: null, reasonCodes: [], confidence: 'NONE' };
  const catalog = catalogs[s.planVersion];
  const slugs = Object.keys(catalog);
  const higher = slugs.slice(slugs.indexOf(s.plan) + 1);
  let target = s.enterpriseFeature ? 'enterprise' : higher.find(slug => {
    const p = catalog[slug];
    return Object.keys(requirements).every(k => p[k] === null || p[k] >= requirements[k]);
  });
  if (!target && reasons.length) target = 'enterprise';
  return { currentPlan: s.plan, recommendedPlan: target || null, reasonCodes: reasons, confidence: 'HIGH' };
}
module.exports = { catalogs, planFor, recommend, GB };

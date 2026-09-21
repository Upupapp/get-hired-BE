const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('subscription catalog keeps approved Growth and Premium peso prices', () => {
  const source = fs.readFileSync('services/planCatalogServiceV4.js', 'utf8');

  assert.match(source, /slug: 'growth'[\s\S]*?priceMonthlyPHP: 3490,[\s\S]*?priceAnnualPHP: 34900,/);
  assert.match(source, /slug: 'business'[\s\S]*?priceMonthlyPHP: 5990,[\s\S]*?priceAnnualPHP: 59900,/);
  assert.match(source, /slug: 'business'[\s\S]*?active_job_posts: 40,[\s\S]*?admin_users: 15,/);
});

test('guardrail checkout passes pesos to the PayMongo centavo converter exactly once', () => {
  const source = fs.readFileSync('controllers/subscriptionGuardrailsControllerV4.js', 'utf8');

  assert.match(source, /createPaymongoLink\(cartId, description, ctx\.amountPHP\)/);
  assert.doesNotMatch(source, /createPaymongoLink\(cartId, description, ctx\.amountCentavos\)/);
});

# GetHired TEST FIXTURES INDEX — QA Cycle 11

**Date:** 2026-06-25

No fixture files are created in this cycle (no safe test database; pg integration tests are blocked).
This document catalogs the fixtures that would be required for full automated test coverage.

---

## 1. Why No Fixtures Were Created

- The BE has no test runner configured (`npm test` exits with error echo)
- pg integration tests require a Supabase-compatible test DB that does not exist locally
- Firebase Auth mocking requires firebase-admin test credentials not available in this environment
- express-rate-limit in-memory store tests would require a running Express instance

All tests in QC11 are **static code analysis** and **build verification** only.

---

## 2. Fixture Catalog (what would be needed)

### 2.1 Rate Limit Fixtures

**File (hypothetical):** `test/fixtures/rate-limit-requests.js`

```js
// Required for integration tests of rate limiter behavior
module.exports = {
  // Should hit Tier 2 (authLimiter, 20/15min)
  authEndpoints: [
    'POST /api/auth/signin',
    'POST /api/auth/signup',
    'POST /api/auth/emailverify',
  ],
  // Should hit Tier 4 (sensitiveLimiter, 10/hr)
  sensitiveEndpoints: [
    'POST /api/auth/changepassword',
    'GET /api/auth/getpwresetlink',
    'PUT /api/auth/archive',
  ],
  // Should skip writeLimiter (Tier 3)
  skipMethods: ['GET', 'HEAD', 'OPTIONS'],
}
```

**Test scenarios:**
1. POST /api/auth/signin x21: first 20 return 200/401, 21st returns 429
2. GET /api/interview/hub: no write-tier 429 even at 101 requests
3. POST /api/auth/changepassword x11: 11th returns 429 within 1 hour

### 2.2 Interview Hub Fixtures

**File (hypothetical):** `test/fixtures/interview-hub.js`

```js
module.exports = {
  // Company with video answers
  company_with_videos: {
    companyId: 'comp-001',
    expectedItems: [
      {
        applicationId: 'app-001',
        applicantName: 'Jane Doe',
        applicantEmail: 'jane@example.com',
        applicantPhotoUrl: 'https://cdn.example.com/jane.jpg',
        applicationStatusId: 3,
        applicationStatus: 'Under Review',
        videoAnswerCount: 2,
        hasVideoAnswers: true,
      },
    ],
  },
  // Applicant with null name (no users row)
  applicant_no_profile: {
    applicantName: null,
    applicantEmail: 'anon@example.com',
    applicantPhotoUrl: null,
  },
  // Applicant with neither name nor email
  applicant_ghost: {
    applicantName: null,
    applicantEmail: null,
    applicantPhotoUrl: null,
    // FE should render 'Applicant' for this case
  },
};
```

**Unit tests derivable from these fixtures:**
- `getDisplayName(item)` returns `'Applicant'` for ghost case
- `getDisplayName(item)` returns email when name null
- `videoAnswerCount` parseInt(null, 10) → 0 (via COALESCE in SQL)

### 2.3 Message Enrichment Fixtures

**File (hypothetical):** `test/fixtures/recruiter-threads.js`

```js
module.exports = {
  // Thread with full applicant data
  thread_full: {
    threadId: 'THREAD-001',
    applicantUid: 'uid-abc-123',
    applicantFirstName: 'John',
    applicantLastName: 'Smith',
    applicantEmail: 'john@example.com',
    applicantPhotoUrl: 'https://cdn.example.com/john.jpg',
    // Expected output:
    applicantName: 'John Smith',
  },
  // Thread with no name (only email)
  thread_email_only: {
    applicantFirstName: null,
    applicantLastName: null,
    applicantEmail: 'anon@example.com',
    // Expected output:
    applicantName: 'anon@example.com',
  },
  // Thread with no name or email
  thread_ghost: {
    applicantFirstName: null,
    applicantLastName: null,
    applicantEmail: null,
    // Expected output:
    applicantName: null,
    // FE applicantLabel: 'Candidate UID123'
  },
  // Snippet truncation
  long_snippet: {
    lastMessageSnippet: 'A'.repeat(200),
    // BE slices to 120 chars
    // FE slices to 80 chars for display
  },
};
```

### 2.4 Mobile Sidebar Fixtures

No server-side fixtures needed. Angular unit test setup would require:

```typescript
// test/employer-panel.component.spec.ts (hypothetical)
describe('EmployerPanelComponent keyboard', () => {
  it('should close drawer on Escape key', () => {
    component.mobileNavOpen = true;
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    expect(component.mobileNavOpen).toBe(false);
  });
  it('should return focus to hamburger button after close', fakeAsync(() => {
    component.openMobileNav();
    tick(200);
    component.closeMobileNav();
    tick(50);
    expect(document.activeElement).toBe(mobileMenuBtnRef.nativeElement);
  }));
});
```

### 2.5 FE Null-Safety Fixtures

```typescript
// Inline test cases for applicantLabel (pure function, unit-testable without Angular)
const cases = [
  { input: { applicantName: 'Jane', applicantUid: 'abc123' }, expected: 'Jane' },
  { input: { applicantName: null, applicantUid: 'abc123' }, expected: 'Candidate ABC123' },
  { input: { applicantName: null, applicantUid: null }, expected: 'Candidate' },
  { input: { applicantName: '', applicantUid: 'abc123' }, expected: 'Candidate ABC123' },
];
```

---

## 3. Existing Test Infrastructure

| Asset | Location | Status |
|-------|---------|--------|
| Karma/Jasmine config | `src/karma.conf.js` | Present, not configured for CI |
| Angular spec files | 79 `.spec.ts` files | Mostly stubs (TestBed.createComponent with no assertions) |
| BE package.json test | `echo "Error: no test specified"` | No test runner |
| Playwright/Cypress | Not installed | Neither repo |

---

## 4. Recommended Next Steps for Test Infrastructure

1. Add `vitest` or `jest` to BE for lightweight unit tests (no DB needed for pure function tests)
2. Wire `ng test --watch=false --browsers=ChromeHeadless` to CI for existing spec files
3. Add 3–5 meaningful specs for rate-limiter skip function (already a pure function — easiest win)
4. Add spec for `applicantLabel()` and `avatarInitial()` in RecruiterMessagesComponent (pure methods)
5. Add spec for `getDisplayName()` in RecruiterInterviewHubComponent

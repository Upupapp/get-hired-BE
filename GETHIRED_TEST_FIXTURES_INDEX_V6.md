# GETHIRED TEST FIXTURES INDEX V6
**Date:** 2026-07-01 | LinkedIn OIDC + Modal + Sign-out

---

## Overview

This file documents the test data (fixtures) needed to implement the V6 test plan without making real LinkedIn/Firebase/DB calls. All tokens use the test secret `test_secret_for_unit_tests_only`. Never use real env.secret in tests.

---

## 1. LinkedIn State JWT Fixtures

### Valid State — intent=auto, 10-min TTL
```javascript
// Generate with:
const jwt = require('jsonwebtoken');
const TEST_SECRET = 'test_secret_for_unit_tests_only';

const validState = jwt.sign(
  { cv: 'codeVerifier123abc', nc: 'nonce456def', it: 'auto', sc: 'test', rt: '' },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 600 }
);
```

### Valid State — intent=jobseeker, returnTo=/user/dashboard
```javascript
const jobseekerState = jwt.sign(
  { cv: 'cv_jobseeker', nc: 'nc_js', it: 'jobseeker', sc: 'test', rt: '/user/dashboard' },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 600 }
);
```

### Valid State — intent=employer
```javascript
const employerState = jwt.sign(
  { cv: 'cv_employer', nc: 'nc_emp', it: 'employer', sc: 'test', rt: '' },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 600 }
);
```

### Expired State
```javascript
const expiredState = jwt.sign(
  { cv: 'cv_expired', nc: 'nc_expired', it: 'auto', sc: 'test', rt: '' },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: -1 } // already expired
);
```

### Tampered State (wrong secret)
```javascript
const tamperedState = jwt.sign(
  { cv: 'cv_tampered', nc: 'nc_tampered', it: 'auto', sc: 'test', rt: '' },
  'wrong_secret',
  { algorithm: 'HS256', expiresIn: 600 }
);
```

---

## 2. OAuth Ticket JWT Fixtures

### Valid Ticket — authenticated existing user
```javascript
const authTicket = jwt.sign(
  {
    jti: 'a'.repeat(48),
    uid: 'li_abc123def456',
    status: 'authenticated',
    intent: 'auto',
    rt: '',
    rr: false
  },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 300 }
);
```

### Valid Ticket — role_required new user
```javascript
const roleRequiredTicket = jwt.sign(
  {
    jti: 'b'.repeat(48),
    uid: 'pending:linkedin:li_sub_123',
    status: 'role_required',
    intent: 'auto',
    rt: '',
    rr: true
  },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 300 }
);
```

### Expired Ticket
```javascript
const expiredTicket = jwt.sign(
  { jti: 'c'.repeat(48), uid: 'li_abc', status: 'authenticated', intent: 'auto', rt: '', rr: false },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: -1 }
);
```

### LinkedIn Pending Token (for choose-role)
```javascript
const pendingToken = jwt.sign(
  {
    jti: 'd'.repeat(48),
    uid: 'pending:linkedin:sub_new_user_123',
    status: 'pending',
    intent: 'auto',
    rt: '',
    rr: true
    // NOTE: no email/firstName/lastName — this is the bug (Finding #3)
    // Fix: add these fields to makeTicketJwt for pending tokens
  },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 300 }
);
```

### LinkedIn Pending Token WITH profile data (post-fix fixture)
```javascript
const pendingTokenFixed = jwt.sign(
  {
    jti: 'e'.repeat(48),
    uid: 'pending:linkedin:sub_new_user_123',
    status: 'pending',
    intent: 'auto',
    rt: '',
    rr: true,
    email: 'newuser@example.com',     // added by fix
    firstName: 'Jane',                 // added by fix
    lastName: 'Doe',                   // added by fix
    photoUrl: ''                        // added by fix
  },
  TEST_SECRET,
  { algorithm: 'HS256', expiresIn: 300 }
);
```

---

## 3. LinkedIn Userinfo Mock Responses

### Valid userinfo — verified email
```javascript
const validUserinfo = {
  sub: 'linkedin_sub_abc123',
  email: 'jane.doe@example.com',
  email_verified: true,
  given_name: 'Jane',
  family_name: 'Doe',
  picture: 'https://media.licdn.com/dms/test/photo.jpg',
  name: 'Jane Doe',
  locale: 'en_US'
};
```

### Userinfo — email not verified
```javascript
const unverifiedEmailUserinfo = {
  sub: 'linkedin_sub_unverified',
  email: 'unverified@example.com',
  email_verified: false,
  given_name: 'Test',
  family_name: 'User',
  name: 'Test User'
};
```

### Userinfo — missing sub
```javascript
const missingSubUserinfo = {
  sub: '',
  email: 'nosub@example.com',
  email_verified: true,
  name: 'No Sub'
};
```

### Userinfo — missing email
```javascript
const missingEmailUserinfo = {
  sub: 'linkedin_sub_noemail',
  email: '',
  email_verified: false,
  name: 'No Email'
};
```

---

## 4. LinkedIn ID Token Mock (for /callback soft-check tests)

### Valid LinkedIn ID token (decoded, not verified — decode only)
```javascript
const mockLinkedInIdToken = jwt.sign(
  {
    iss: 'https://www.linkedin.com',
    aud: 'test_linkedin_client_id',
    sub: 'linkedin_sub_abc123',
    nonce: 'nonce456def',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: 'jane.doe@example.com'
  },
  'any_secret',  // not verified by the current implementation
  { algorithm: 'HS256' }
);
```

### ID token — wrong issuer
```javascript
const wrongIssuerIdToken = jwt.sign(
  { iss: 'https://evil.com', aud: 'test_linkedin_client_id', sub: 'x', exp: Math.floor(Date.now()/1000)+3600 },
  'any_secret', { algorithm: 'HS256' }
);
```

### ID token — wrong audience
```javascript
const wrongAudIdToken = jwt.sign(
  { iss: 'https://www.linkedin.com', aud: 'wrong_client_id', sub: 'x', exp: Math.floor(Date.now()/1000)+3600 },
  'any_secret', { algorithm: 'HS256' }
);
```

### ID token — expired
```javascript
const expiredIdToken = jwt.sign(
  { iss: 'https://www.linkedin.com', aud: 'test_linkedin_client_id', sub: 'x', exp: 1 },
  'any_secret', { algorithm: 'HS256' }
);
```

---

## 5. auth_identities DB Row Fixtures

### Existing LinkedIn identity
```javascript
const existingIdentityRow = {
  rows: [{
    user_uid: 'li_abc123def456',
    provider: 'linkedin',
    provider_subject: 'linkedin_sub_abc123',
    provider_email: 'jane.doe@example.com',
    provider_email_verified: true,
    provider_name: 'Jane Doe',
    provider_picture: 'https://media.licdn.com/test.jpg',
    linked_at: new Date('2026-07-01T00:00:00.000Z'),
    last_login_at: new Date('2026-07-01T10:00:00.000Z'),
    updated_at: new Date('2026-07-01T10:00:00.000Z')
  }]
};
```

### No identity found
```javascript
const noIdentityRow = { rows: [] };
```

---

## 6. oauth_tickets DB Row Fixtures

### Unused ticket in DB
```javascript
const unusedTicketRow = {
  rows: [{
    uid: 'li_abc123def456',
    data: {
      status: 'authenticated',
      intent: 'auto',
      returnTo: '',
      roleRequired: false,
      liSub: 'linkedin_sub_abc123',
      email: 'jane.doe@example.com',
      emailVer: true,
      firstName: 'Jane',
      lastName: 'Doe',
      photoUrl: '',
      name: 'Jane Doe',
      role: 2
    }
  }]
};
```

### Already-used ticket (replay scenario)
```javascript
const usedTicketResult = { rows: [] }; // consumeTicketDb returns null — replay blocked
```

---

## 7. User Credentials DB Mock Fixtures

### Existing employer user
```javascript
const employerCredRow = { rows: [{ uid: 'li_abc123def456', role: 2, email: 'jane.doe@example.com', password: 'hashed' }] };
```

### Existing job seeker user
```javascript
const jobseekerCredRow = { rows: [{ uid: 'li_seeker123', role: 3, email: 'seeker@example.com', password: 'hashed' }] };
```

### No existing user
```javascript
const noUserRow = { rows: [] };
```

---

## 8. Company Setup Modal MAT_DIALOG_DATA Fixtures

### Full company data
```javascript
const fullModalData = {
  companyName: 'Acme Corp',
  companySlug: 'acme-corp',
  profileCompleteness: 62
};
```

### Company without slug (view profile button hidden)
```javascript
const noSlugModalData = {
  companyName: 'New Company',
  companySlug: '',
  profileCompleteness: 25
};
```

### Minimal data (defaults test)
```javascript
const emptyModalData = {
  companyName: '',
  companySlug: '',
  profileCompleteness: 0
};
// Expected: companyName defaults to 'Your company'
```

---

## 9. Firebase Mock Fixtures

### Mock Firebase custom token response
```javascript
const mockCustomToken = 'firebase_custom_token_mock_abc123';
```

### Mock Firebase ID token exchange response (accounts:signInWithCustomToken)
```javascript
const mockFirebaseExchangeResponse = {
  data: {
    idToken: 'firebase_id_token_mock_xyz789',
    refreshToken: 'firebase_refresh_token_mock_abc'
  }
};
```

---

## 10. Cert API Fixtures

### certificationRequirements public-safe response (post-fix)
```javascript
const certRequirementsFixture = [
  {
    name: 'PRC License',
    type: 'license',
    importance: 'required',
    issuingAuthority: 'PRC Philippines',
    expiryRequired: true,
    verificationRequired: true
    // NO id, NO canonicalKey
  }
];
```

### certificationRequirements raw DB row (before mapping)
```javascript
const certDbRow = {
  id: 'uuid-internal-123',
  name: 'PRC License',
  type: 'license',
  importance: 'required',
  issuing_authority: 'PRC Philippines',
  expiry_required: true,
  verification_required: true,
  canonical_key: null,
  created_at: new Date()
};
```

---

## Fixture Usage Notes

1. All JWT fixtures use `TEST_SECRET = 'test_secret_for_unit_tests_only'` — never use real `env.secret`
2. DB fixtures mock `dbQuery.query` return values — use `jest.mock('../db/dbQuery')` or `sinon.stub()`
3. Firebase fixtures mock `firebaseAdmin.auth().createCustomToken()` and `axios.post(identitytoolkit...)`
4. LinkedIn userinfo fixtures mock `axios.get(cfg.userinfoUrl, ...)`
5. LinkedIn token endpoint fixtures mock `axios.post(cfg.tokenEndpoint, ...)`
6. All async mocks should return `Promise.resolve(fixture)` or `Promise.reject(new Error(...))`

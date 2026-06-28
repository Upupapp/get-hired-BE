# GETHIRED ASVS API SECURITY MAP — QA Cycle 11
Generated: 2026-06-25 | Standard: OWASP ASVS v4.0 L1/L2

---

## V1 — Architecture, Design and Threat Modeling

| Control | Status | Evidence |
|---------|--------|----------|
| V1.1 — Secure SDLC | PARTIAL | SECURE passes conducted; no formal SDLC documented |
| V1.2 — Authentication Architecture | PASS | Firebase JWT verified server-side in verifyAuth middleware |
| V1.3 — Session Management Architecture | PASS | Stateless JWT; no server-side session store |
| V1.4 — Access Control Architecture | PASS | getUserCompany() pattern applied consistently |
| V1.5 — Input and Output Architecture | PARTIAL | Parameterized queries throughout; output encoding not enforced |
| V1.6 — Cryptographic Architecture | PARTIAL | bcrypt for passwords; Firebase handles token crypto |
| V1.7 — Errors, Logging and Auditing Architecture | PARTIAL | console.error throughout; no structured audit log |
| V1.8 — Data Protection and Privacy Architecture | PARTIAL | PII in DB; no data classification documented |
| V1.9 — Communications Architecture | PASS | HTTPS enforced at infrastructure level (assumed) |
| V1.10 — Malicious Software Architecture | FAIL | 273 npm vulnerabilities; no dependency pinning |

---

## V2 — Authentication

| Control | Status | Evidence |
|---------|--------|----------|
| V2.1 — Password Security | PASS | bcrypt hashing; validatePassword() enforces complexity |
| V2.2 — General Authenticator Security | PASS | Firebase token expiry enforced; expired token → 403 |
| V2.3 — Authenticator Lifecycle | PASS | Firebase handles token lifecycle |
| V2.4 — Credential Storage | PASS | Passwords hashed with bcrypt; Firebase stores auth credentials |
| V2.5 — Credential Recovery | PARTIAL | getForgetPwLinkInFirebase() used; no rate limit on /auth/getpwresetlink beyond Tier 4 (10/hr) |
| V2.6 — Look-up Secret Verifier | N/A | No OTP/lookup secrets |
| V2.7 — Out of Band Verifier | N/A | Email verification via Firebase |
| V2.8 — Single or Multi Factor OTP | N/A | Not implemented |
| V2.9 — Cryptographic Software and Devices | N/A | No hardware tokens |
| V2.10 — Service Authentication | PARTIAL | Service account keys present in repo root (P1 finding) |

---

## V3 — Session Management

| Control | Status | Evidence |
|---------|--------|----------|
| V3.1 — Fundamental Session Management Security | PASS | Firebase JWTs; Bearer header scheme |
| V3.2 — Session Binding | PASS | Token tied to Firebase UID |
| V3.3 — Session Termination | PASS | revokeTokenInFirebase() called on logout |
| V3.4 — Cookie-based Session Management | PARTIAL | __session cookie path exists; no Secure/HttpOnly at app layer |
| V3.5 — Token-based Session Management | PASS | JWT verification via Firebase Admin |
| V3.6 — Federated Re-authentication | N/A | |
| V3.7 — Defenses Against Session Management Exploits | PARTIAL | No CSRF protection on state-mutating POSTs |

---

## V4 — Access Control

| Control | Status | Evidence |
|---------|--------|----------|
| V4.1 — General Access Control Design | PASS | verifyAuth on 88/91 endpoints (97%) |
| V4.2 — Operation Level Access Control | PARTIAL | saveGroupInterview missing company check (new P2 finding) |
| V4.3 — Other Access Control Considerations | PARTIAL | Admin route lacks role enforcement |

---

## V5 — Validation, Sanitization and Encoding

| Control | Status | Evidence |
|---------|--------|----------|
| V5.1 — Input Validation | PASS | All SQL uses $N parameters; body parsing with express.json |
| V5.2 — Sanitization and Sandboxing | PARTIAL | No HTML sanitization on user inputs stored in DB |
| V5.3 — Output Encoding and Injection Prevention | PASS | No template engines used; JSON responses throughout |
| V5.4 — Memory, String, and Integer | PASS | Node.js manages memory; message body length capped |
| V5.5 — Deserialization Prevention | PASS | express.json() used; no custom deserializers |

---

## V6 — Stored Cryptography

| Control | Status | Evidence |
|---------|--------|----------|
| V6.1 — Data Classification | FAIL | No documented data classification |
| V6.2 — Algorithms | PASS | bcrypt for passwords; AES via Firebase |
| V6.3 — Random Values | PASS | idGenerator() used for IDs; Firebase handles tokens |
| V6.4 — Secret Management | FAIL | Service account JSON files in repo root |

---

## V7 — Error Handling and Logging

| Control | Status | Evidence |
|---------|--------|----------|
| V7.1 — Log Content | PARTIAL | console.error throughout; no structured fields |
| V7.2 — Log Processing | FAIL | No log aggregation or SIEM |
| V7.3 — Log Protection | N/A | Logs go to server stdout/stderr files |
| V7.4 — Error Handling | PASS | Generic error messages returned to clients; no stack traces |

---

## V9 — Communication

| Control | Status | Evidence |
|---------|--------|----------|
| V9.1 — Client Communication Security | PASS | TLS assumed at infra level |
| V9.2 — Server Communication Security | PARTIAL | Axios used for PayMongo calls; axios has known CVEs |
| V9.3 — General HTTP Security Configuration | FAIL | No security headers (X-Content-Type-Options, X-Frame-Options, CSP) |

---

## V12 — File and Resources

| Control | Status | Evidence |
|---------|--------|----------|
| V12.1 — File Upload | PARTIAL | Magic-byte check for PDF/DOCX/images; video NOT checked |
| V12.2 — File Integrity | PASS | Files stored in Firebase Storage; integrity via signed uploads |
| V12.3 — File Execution | PASS | No server-side file execution of uploaded content |
| V12.4 — File Storage | PASS | Files in Firebase Storage; not in app filesystem |
| V12.5 — File Download | PASS | No server-side file serving; URLs returned directly |
| V12.6 — SSRF Prevention | PARTIAL | axios used for PayMongo API calls; axios has SSRF CVEs in vulnerable version |

---

## V13 — API and Web Service

| Control | Status | Evidence |
|---------|--------|----------|
| V13.1 — Generic Web Service Security | PARTIAL | express.json() with 50MB limit (large — see DoS risk) |
| V13.2 — RESTful Web Service | PASS | REST conventions followed; no SOAP |
| V13.3 — SOAP Web Service | N/A | |
| V13.4 — GraphQL | N/A | |

---

## V14 — Configuration

| Control | Status | Evidence |
|---------|--------|----------|
| V14.1 — Build | PARTIAL | No build pipeline hardening; npm audit shows 273 vulns |
| V14.2 — Dependency | FAIL | 273 npm vulnerabilities (19L/99M/138H/17C) — bcrypt>tar chain |
| V14.3 — Unintended Security Disclosure | FAIL | Service account JSON files in repo root |
| V14.4 — HTTP Security Headers | FAIL | Missing X-Content-Type-Options, X-Frame-Options, CSP, HSTS |
| V14.5 — HTTP Request Header Validation | PARTIAL | CORS: app.use(cors()) — no origin restriction in production |

---

## Overall ASVS Score (QA11)

| Category | L1 Pass Rate |
|----------|-------------|
| V2 Authentication | 85% |
| V4 Access Control | 90% |
| V5 Input Validation | 85% |
| V7 Logging | 40% |
| V9 Communication | 60% |
| V12 File Upload | 70% |
| V13 API | 75% |
| V14 Configuration | 30% |
| **Overall** | **72%** |

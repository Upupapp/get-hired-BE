# GETHIRED PRFAQ BRIEFS — V6
**Date:** 2026-07-01 | **Format:** Press Release + FAQ per feature/area

---

## PRFAQ-001: Google Sign-In for GetHired [SHIPPED]

**Press Release:**
GetHired Online launches one-click Google sign-in — job seekers and employers can now create accounts or sign in with their Google account in under 10 seconds. A clear role-selection screen guides new users to the right experience, and a new OAuth 2.0 client ensures the highest security standards.

**FAQ:**
- Q: Can admin accounts use Google? A: No — admin access requires email+password for security.
- Q: What if my email already exists? A: You'll see a clear message to use your password. Account linking is planned for a future release.
- Q: Is my Google data safe? A: GetHired only requests your name and email. We never access Gmail, Drive, or other Google services.
- Q: Does Google sign-in work on mobile? A: Yes — tested on iOS Safari and Android Chrome.

**Status:** SHIPPED (session 2026-07-01)

---

## PRFAQ-002: LinkedIn Sign-In for GetHired [SHIPPED]

**Press Release:**
GetHired Online now supports LinkedIn OIDC sign-in, letting professionals join or log in with their existing LinkedIn account. The full OAuth flow — authorization, callback, token exchange, and role routing — is complete and production-ready.

**FAQ:**
- Q: What LinkedIn data does GetHired access? A: Name, email, and LinkedIn profile ID only. We do not access posts, connections, or InMail.
- Q: What if I cancel the LinkedIn consent screen? A: You'll see a friendly error page with a "Try Again" CTA and option to use email sign-in instead.
- Q: Can I disconnect my LinkedIn account later? A: A LinkedIn unlink option in account settings is coming soon (GH-ACT-088).
- Q: Does LinkedIn sign-in work for employers? A: Yes — employers and applicants both can sign in with LinkedIn.

**Status:** SHIPPED — LinkedIn unlink UI is the next step (GH-ACT-088)

---

## PRFAQ-003: World-Class Company Setup Modal [SHIPPED]

**Press Release:**
Employers who complete GetHired's company setup now see a polished activation modal — a premium-feel confirmation of their account readiness that sets expectations and drives them to post their first job. The modal is shown once and does not reappear.

**FAQ:**
- Q: What if I see the modal again after closing? A: The modal is suppressed for your current session. A cross-device persistence upgrade is planned (GH-ACT-090).
- Q: What does the modal show? A: A confirmation that your company profile is set up, your first job is ready to post, and next-step CTAs.

**Status:** SHIPPED — DB persistence upgrade is GH-ACT-090 (P3)

---

## PRFAQ-004: Job Certification and License Requirements [SHIPPED]

**Press Release:**
Employers on GetHired can now specify certification and license requirements for any job posting — including license type, issuing authority, expiry requirements, and whether the cert is mandatory or preferred. Job seekers see these requirements clearly on the public job detail page.

**FAQ:**
- Q: What types of certifications can I specify? A: Any professional certification or government license — PRC licenses, TESDA NC certificates, company-specific training, international certs.
- Q: Are cert requirements shown on the public job page? A: Yes — displayed in a dedicated "Requirements" section with mandatory/preferred distinction.
- Q: Can I require multiple certifications for one job? A: Yes — add as many cert requirements as needed.
- Q: Are cert requirements matched against applicant profiles? A: Matching is planned in the MATCH command phase (Phase 4 roadmap).

**Status:** SHIPPED

---

## PRFAQ-005: Applicant Profile Quality Coach [PLANNED]

**Press Release:**
GetHired introduces Profile Quality Coach — a real-time completeness score and guided checklist in the applicant dashboard. Job seekers see exactly what employers look for and get prompted to complete missing sections, improving their chances of being matched to top jobs.

**FAQ:**
- Q: How is the quality score calculated? A: It weighs: personal information (20%), work experience (25%), education (20%), skills (15%), CV upload (10%), video CV (10%).
- Q: Does a higher score guarantee more matches? A: A higher score makes your profile eligible for more jobs. Matching also depends on skills and experience.
- Q: Is the score visible to employers? A: Not directly — employers see the profile content. The score is for your guidance only.
- Q: Can I see which specific fields to improve? A: Yes — the quality coach lists incomplete sections with direct links to edit them.

**Status:** PLANNED (AX-ACT-001 / AX-ACT-002) — P1 next sprint

---

## PRFAQ-006: AI-Powered Easy Job Post [SHIPPED]

**Press Release:**
Employers can paste any job description into GetHired's Easy Job Post tool and get an AI-generated, structured job posting in seconds. The extracted role, requirements, salary range, and location are pre-populated in the form — ready to review and publish.

**FAQ:**
- Q: Does the extracted content go live automatically? A: No — you review and edit all fields before publishing.
- Q: What happens if the extraction misses fields? A: You can fill in any missing fields manually. The extraction is a starting point, not the final post.
- Q: Is there a limit on how many times I can use Easy Job Post? A: A rate limit per account is planned (5 uses/hour) to prevent abuse.

**Status:** Extraction SHIPPED — rate limit is ACT-012 (P1 next sprint)

---

## PRFAQ-007: CV Doctor — AI CV Health Coaching [PARTIAL / PLANNED]

**Press Release:**
GetHired's CV Doctor analyzes uploaded CVs and delivers a health score, section-by-section audit, and prioritized improvement recommendations — helping job seekers present themselves competitively to employers who use GetHired's AI matching.

**FAQ:**
- Q: What does the CV Health Score measure? A: Completeness (does it have all key sections?), formatting consistency, keyword alignment to GetHired job categories, grammar signals, and length appropriateness.
- Q: Do employers see my CV Doctor score? A: No — it is for your use only.
- Q: Is my CV stored permanently? A: Your CV is stored for profile matching. The analysis results are stored per session. You can replace your CV at any time.
- Q: Is CV Doctor free? A: Yes — included in all applicant accounts.

**Status:** BE services COMPLETE — FE wiring is AX-ACT-003 (P2 next sprint)

---

## PRFAQ-008: LinkedIn Unlink — Account Control [PLANNED]

**Press Release:**
GetHired account settings will soon show your connected third-party accounts — including LinkedIn — with a one-click unlink option. You stay in control of what sign-in methods are active on your account.

**FAQ:**
- Q: If I unlink LinkedIn, will I be locked out? A: If you signed up via LinkedIn and have no password set, you'll be prompted to set a password before unlinking. We won't lock you out.
- Q: Can I re-link LinkedIn after unlinking? A: Yes — the "Connect with LinkedIn" option in account settings starts the flow again.
- Q: Will unlinking delete my data? A: No — your profile, applications, and history are preserved.

**Status:** PLANNED (GH-ACT-088) — P2

---

## PRFAQ-009: PayMongo Subscription Billing [SHIPPED / PENDING VERIFICATION]

**Press Release:**
GetHired employers can subscribe to premium job posting plans powered by PayMongo, the Philippines' leading payment gateway. Subscription webhooks are verified with HMAC-SHA256 signature checking — payment events are processed securely and automatically.

**FAQ:**
- Q: What payment methods are accepted? A: All methods supported by PayMongo — GCash, Maya, credit/debit cards, online banking.
- Q: What happens if a subscription payment fails? A: GetHired receives a PayMongo webhook event and can take action (notify employer, suspend premium features). Specific retry logic is in the roadmap.
- Q: Is my payment data stored on GetHired servers? A: No — payment processing is handled entirely by PayMongo. GetHired stores only subscription status.

**Status:** Code SHIPPED — env var verification pending (GH-ACT-091 / PACK-A.1)

---

## PRFAQ-010: Google Jobs Rich Results [PLANNED]

**Press Release:**
Active job listings on GetHired will appear directly in Google Search results under the "Jobs" section — giving job seekers a direct path from Google search to your job posting with rich information including salary, location, and company name.

**FAQ:**
- Q: Do I need to do anything to get my jobs on Google Jobs? A: No — once the JobPosting schema is enabled (PACK-E.1), active published jobs are automatically eligible.
- Q: How long does indexing take? A: Google typically indexes new JobPosting pages within 1-7 days via sitemap. Indexing API (FEAT-INDEXING-API) can speed this to hours.
- Q: Does every job get a rich result? A: Eligibility requires: published status, complete title, description, datePosted, hiringOrganization, and jobLocation. Jobs missing these fields get plain blue links.

**Status:** PLANNED (PACK-E.1) — P1 next sprint

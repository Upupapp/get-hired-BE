# GetHired Employer Onboarding & Core Job Activation — Benchmark Best Practices V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24

---

## Framework Applications

### 1. Product-Led Activation

**Principle:** Signup → onboarding → first value → activation → habit loop  
**GetHired decision:** Primary activation event = first_job_published. Secondary = employer_sees_first_applicant.  
**Affected screens:** Signup, dashboard, job create, job publish  
**Frontend UI implication:** Onboarding checklist on dashboard drives progress; post-publish routes to job-specific applicant view  
**Motion/haptic:** Publish success haptic (HapticFeedbackService.jobPublished()), snackbar slide-in  
**Accessibility safeguard:** All CTAs have visible labels, keyboard accessible  
**Safety rule:** No fake progress, no fake applicant counts  
**Acceptance criteria:** Employer can go from signup to first published job and be taken to applicant view in a single session

---

### 2. Time-to-Value

**Principle:** Minimize steps from signup to first job draft  
**GetHired decision:** Employer signup (1 page) → verify (1 page) → dashboard with checklist → job create (4 steps)  
**Affected screens:** Signup, verify, dashboard  
**Frontend UI implication:** ?role=2 pre-selects employer role; employer-specific title/CTA on signup; checklist step 2 = "Post a job" CTA  
**Motion/haptic:** Submit button press feedback (gh-pressable), loading state text ("Creating account...")  
**Accessibility safeguard:** aria-busy on submit during loading  
**Safety rule:** Do not remove required fields (email, password, name, role, terms, recaptcha)  
**Acceptance criteria:** Employer can create account, verify email, and reach dashboard in 3–5 minutes

---

### 3. Progressive Disclosure

**Principle:** Signup short, company basics focused, brand optional, settings in subtabs  
**GetHired decision:** Signup = minimum required fields. Company setup prompted via onboarding checklist, not mandatory before job creation.  
**Affected screens:** Signup, company/details, dashboard checklist  
**Frontend UI implication:** Optional brand fields (logo, description, benefits) are in company profile, not blocking job publish  
**Motion/haptic:** Checklist items reveal with card animation  
**Accessibility safeguard:** Checklist uses role="list", each step uses role="listitem"  
**Safety rule:** Do not block job publish on optional brand fields  
**Acceptance criteria:** Employer can publish a job without completing every company profile field

---

### 4. Contextual Guidance

**Principle:** Field-level help, checklists, empty states, disabled-state explanations  
**GetHired decision:** Onboarding checklist on dashboard. Empty states in job list and applicant list. Missing-field messages on publish block.  
**Affected screens:** Dashboard, job list, job create step 4 (preview), applicant list  
**Frontend UI implication:** Checklist step descriptions explain what to do and why. Empty states guide next action. Publish snackbar lists missing fields.  
**Motion/haptic:** Empty state card reveal, snackbar slide for publish errors  
**Accessibility safeguard:** role="status" on empty state containers, aria-live for snackbar messages  
**Safety rule:** No generic "something went wrong" — always list specific missing fields  
**Acceptance criteria:** Employer knows exactly what is missing before publish

---

### 5. Indeed-Style Employer Dashboard

**Principle:** Manage job posts, statuses, and candidates from one home  
**GetHired decision:** Dashboard has command-center hero, KPI cards, action center, pipeline chart, applicants-needing-review, onboarding checklist  
**Affected screens:** company-dashboard.component  
**Frontend UI implication:** All 8 employer states handled via real data. No fake counts.  
**Motion/haptic:** Action card hover lift (translateY -2px), skeleton loading shimmer, KPI card hover  
**Accessibility safeguard:** All dashboard sections have aria-label, sr-only pipeline text  
**Safety rule:** Real data only. No fake applicant counts, no fake KPIs  
**Acceptance criteria:** All 8 dashboard states render correctly with real data

---

### 6. LinkedIn-Style Post-Job Path

**Principle:** Post role → manage applicants, always visible  
**GetHired decision:** "Post a job" is a persistent CTA in dashboard hero and mobile nav. After publish, route to job-specific applicant view.  
**Affected screens:** Dashboard, job create, mobile nav  
**Frontend UI implication:** B05 fix: post-publish route now goes to /recruiter/jobs/applicants?id=[jobId]  
**Motion/haptic:** Publish success haptic feedback + snackbar  
**Accessibility safeguard:** CTA buttons have descriptive labels  
**Safety rule:** Do not route to generic list when a specific job ID is available  
**Acceptance criteria:** After publish, employer is immediately viewing their new job's applicant page

---

### 7. Greenhouse-Style Structured Hiring

**Principle:** Requirements clear, evaluation human-led  
**GetHired decision:** Certification/license requirements are advisory (employer-entered). No auto-scoring, no auto-rejection.  
**Affected screens:** Job create step 1 (certificationRequirements FormArray)  
**Frontend UI implication:** "Add certification/license requirements" — not "Auto-match licenses"  
**Motion/haptic:** None (requirements are form inputs, not interactive scoring UI)  
**Accessibility safeguard:** Form labels for each cert requirement field  
**Safety rule:** Do not wire certificationRequirementFactor(). Do not auto-reject.  
**Acceptance criteria:** Cert requirements are displayed on job detail; no match scoring runs

---

### 8. Workable-Style Pipeline

**Principle:** Clear candidate stages, consistent context  
**GetHired decision:** Pipeline bar chart on dashboard shows real stage counts. Needs-review list shows top applicants.  
**Affected screens:** company-dashboard.component (pipeline section)  
**Frontend UI implication:** Pipeline stages are clickable (currently routes to jobs list; B06 drill-down deferred)  
**Motion/haptic:** Pipeline bar height transition (height%), bar hover color change  
**Accessibility safeguard:** sr-only text listing all pipeline stage counts, aria-label on each stage button  
**Safety rule:** Real stage data only. No fake urgency badges.  
**Acceptance criteria:** Pipeline shows real counts; stages are keyboard accessible

---

### 9. Google JobPosting Readiness

**Principle:** Real structured data only where fields exist  
**GetHired decision:** Do not add JobPosting JSON-LD unless all required properties have confirmed real field sources.  
**Affected screens:** Public job detail (/jobs/details/:id)  
**Frontend UI implication:** No fake salary, no fake location, no invented job type  
**Accessibility safeguard:** N/A (structured data is invisible to users)  
**Safety rule:** Never invent structured data fields. Never use hardcoded fake values.  
**Acceptance criteria:** If JSON-LD is present, all properties match visible page content

---

### 10. Material/Fluent Motion

**Principle:** Motion for continuity, hierarchy, feedback  
**GetHired decision:** Motion tokens from _motion.scss. CSS-only where possible.  
**Affected screens:** All touched areas  
**Motion/haptic:** gh-pressable (scale 0.985 on press), hover lift (translateY -2px), card reveal (fade+slide), skeleton shimmer, checklist pulse  
**Accessibility safeguard:** All animations gated by prefers-reduced-motion  
**Safety rule:** No heavy animation libraries, no flashing, no aggressive loops  
**Acceptance criteria:** All effects have verified prefers-reduced-motion fallbacks

---

### 11. WCAG 2.2 Accessibility

**Principle:** Keyboard, visible focus, target size, labels, status messages, reduced motion  
**GetHired decision:** All interactive elements keyboard accessible. Focus rings via :focus-visible. Min 44x44px touch targets on mobile nav.  
**Affected screens:** Signup, sidebar, mobile nav, dashboard, job create, job list  
**Frontend UI implication:** role=button, tabindex=0, keydown handlers on non-button interactive elements  
**Safety rule:** Do not rely on motion-only state changes (always use text/icon/color together)  
**Acceptance criteria:** All WCAG 2.4.7 (visible focus), 1.3.1 (labels), 2.5.5 (target size), 4.1.3 (status messages) pass in touched areas

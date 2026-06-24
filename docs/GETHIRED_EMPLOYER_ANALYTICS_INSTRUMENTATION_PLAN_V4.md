# GETHIRED EMPLOYER ANALYTICS INSTRUMENTATION PLAN V4

**Document:** 29 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Planning document — no analytics code added in this V4 pass

---

## 1. Current Analytics Baseline

### PublicPortalAnalyticsService

**File:** `get-hired-FE/src/app/public/services/public-portal-analytics.service.ts`  
**Scope:** Public employer landing page only

**Events currently tracked:**

| Event | Trigger |
|---|---|
| `employer_landing_viewed` | Employer landing page loaded |
| `usp_section_viewed` | USP section scrolled into view |
| `trust_strip_viewed` | Trust strip scrolled into view |
| `how_it_works_viewed` | How-it-works section scrolled into view |
| `faq_opened` | FAQ accordion item opened |

One analytics call exists in `job-create.component.ts`:

```typescript
this.talentProofAnalytics.trackTalentProofViewed('publish_success', this.talentProof.isVerified());
```

This tracks the talent proof copy shown to employers on publish success.

### Employer Panel Internal Analytics

No analytics instrumentation is confirmed in:

- `company-dashboard`
- `employer-sidebar`
- `job-applicants`
- `company-not-setup`
- `job-create` (other than publish success)
- Message thread

---

## 2. Event Taxonomy

### Phase 1: Activation Events

These events measure employer activation funnel health.

| Event Name | Trigger | Properties |
|---|---|---|
| `employer_landing_viewed` | Landing page load | source, referrer |
| `employer_signup_started` | Signup form opened | source |
| `employer_signup_completed` | Signup form submitted successfully | plan_type |
| `company_profile_started` | First navigation to company/details | is_first_visit |
| `company_profile_completed` | All required company fields saved | fields_filled |
| `first_job_started` | Job create form opened for first time | — |
| `job_draft_saved` | saveAsDraft() called successfully | job_id |
| `job_published` | Job published successfully | job_id, has_interview_questions |

### Phase 2: Hiring Activity Events

These events measure employer engagement with the hiring workflow.

| Event Name | Trigger | Properties |
|---|---|---|
| `applicants_list_viewed` | Applicant list opened for a job | job_id, applicant_count |
| `applicant_detail_viewed` | Applicant detail panel opened | job_id (no applicant PII) |
| `applicant_status_changed` | Status change confirmed via modal | new_status, job_id |
| `applicant_message_started` | Message thread opened | job_id (no applicant PII) |
| `applicant_message_sent` | sendMessage() succeeds | job_id (no applicant PII) |
| `video_response_viewed` | VideoPreviewComponent opened | job_id (no applicant PII) |

### Phase 3: Quality and Feature Events

These events measure feature depth and job quality improvement.

| Event Name | Trigger | Properties |
|---|---|---|
| `job_quality_recommendation_clicked` | Employer clicks a job quality suggestion | recommendation_type |
| `certification_requirement_added` | Certification added to job | cert_type |
| `job_share_link_clicked` | Employer copies or opens share link | job_id |

### Phase 4: Friction Events

These events identify where employers drop off or hit errors.

| Event Name | Trigger | Properties |
|---|---|---|
| `signup_failed_validation` | Signup form submission rejected | error_type |
| `job_publish_failed` | publishJobPost() blocked by missing fields | missing_fields (array, no PII) |
| `route_fallback_triggered` | Employer hits under-construction or 404 | route |
| `subscription_limit_hit` | isAllowedToPublish === false | — |
| `message_send_failed` | sendMessage() fails | — |
| `pipeline_load_failed` | Dashboard pipeline API error | — |

---

## 3. Data Privacy Rules

The following must NEVER be tracked:

- Applicant names, email addresses, or any PII
- Protected attributes (race, gender, age, disability, national origin)
- Match scores tied to an individual applicant
- Video content or transcripts
- Salary or compensation data
- Applicant IP addresses
- Any field that could identify an individual applicant to a third-party analytics platform

Properties that reference applicants must use only anonymized system identifiers (e.g., `job_id`) if at all.

---

## 4. Implementation Prerequisites

Before adding any employer panel analytics events:

1. **Confirm analytics infrastructure:** Verify which analytics platform is in use (Segment, Mixpanel, Firebase, custom, etc.) and that it is correctly initialized in the employer panel Angular module.
2. **Confirm service injection pattern:** `PublicPortalAnalyticsService` is the current service; confirm it is injectable in employer panel components or create a companion `EmployerPanelAnalyticsService`.
3. **Confirm consent mechanism:** Verify that the app has an appropriate cookie/analytics consent mechanism for employers. Do not instrument before consent is confirmed.
4. **Review data retention policy:** Analytics events should not be retained indefinitely. Confirm data retention settings with the product/legal team.

---

## 5. Instrumentation Priority Order

| Priority | Events | Reason |
|---|---|---|
| P1 | `job_published`, `company_profile_completed`, `employer_signup_completed` | Core activation funnel; required to measure onboarding success |
| P1 | `job_publish_failed` | High-friction event; quantifies the impact of the snackbar color fix |
| P2 | `applicants_list_viewed`, `applicant_status_changed` | Core hiring workflow engagement |
| P2 | `route_fallback_triggered` | Quantifies dead-end exposure (interview page, missing routes) |
| P3 | `applicant_message_started`, `applicant_message_sent` | Messaging feature adoption |
| P3 | `video_response_viewed` | Video feature adoption |
| P4 | All quality and feature events | Depends on features being implemented first |

---

## 6. What Must Not Be Added

- Protected attribute tracking of any kind
- Applicant PII
- Sensitive hiring data (individual applicant scores, video analysis results)
- Fake engagement events (impressions on content that was not rendered)
- Events sent before analytics consent is confirmed
- Events sent from the backend on behalf of applicants without their knowledge

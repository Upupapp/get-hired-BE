# GETHIRED EMPLOYER CONTENT AND MICROCOPY GUIDE V4

**Document:** 28 of 34  
**Pass:** GETHIRED_EMPLOYER_JOURNEY_OPERATING_SYSTEM_WORLD_CLASS_TECHY_V4  
**Date:** 2026-06-24  
**Status:** Production reference

---

## 1. Content Principles

1. Specific over generic: name the missing thing, not "something went wrong"
2. Calm over alarming: errors are recoverable situations, not emergencies
3. Explain what happened and how to fix it
4. Preserve user effort: do not clear forms or typed content on error
5. Do not blame the user
6. Avoid technical jargon in user-facing strings
7. Be consistent: the same action always has the same label
8. Respect employer time: empty states give a reason and a next action, not just absence

---

## 2. Empty States

### Dashboard: Pipeline Empty

**Context:** The hiring pipeline widget shows zero applicants across all stages.  
**Current copy:** "No applicants yet. Applicants will appear here once candidates start applying to your jobs."  
**Assessment:** Good. Explains the absence and sets expectation.  
**Recommendation:** Add a secondary CTA: "Share your job to attract more candidates" (links to share when B13 is implemented).

### Dashboard: Action Center Caught Up

**Context:** `needsReviewCount === 0` and no missing profile fields.  
**Current copy:** "You're all caught up. No applicants are waiting for review right now."  
**Assessment:** Good. Positive, non-urgent.  
**Recommendation:** No change required.

### Dashboard: KPI Zeros

**Context:** Views, applications, and shortlisted counts are all zero (new account or new job).  
**Current copy:** "0" with label (no specific empty-state copy confirmed).  
**Recommendation:** Consider adding muted subtext "Post your first job to start receiving applications" below zero KPIs when no jobs exist.

### Jobs List: No Jobs Created

**Context:** Employer has not created any jobs yet.  
**Current copy:** Not confirmed in this pass.  
**Recommended copy:** "You have not posted any jobs yet. Create your first job to start receiving applications." + "Post a Job" button.

### Jobs List: No Expired Jobs

**Context:** Employer has no expired jobs.  
**Recommended copy:** "No expired jobs. Active jobs that pass their end date will appear here."

### Applicant List: No Applicants for This Job

**Context:** Job is published but has zero applicants.  
**Current copy:** Not confirmed; table renders empty.  
**Recommended copy:** "No applicants yet for this role. Share your job to reach more candidates."

### Message Thread: No Messages

**Context:** Thread exists (first open) but no messages exchanged yet.  
**Current behavior:** Chat UI renders; message list is empty; compose input is available.  
**Recommended copy:** Muted placeholder in message area: "No messages yet. Start the conversation below."

### Company Not Setup

**Context:** `CompanyNotSetupComponent` dialog opens.  
**Current copy:** "A Company has to be set up in order to use most of the App functionality"  
**Assessment:** Functional but abrupt. Does not explain what to do or how long it takes.  
**Recommended copy:** "Your company profile is not set up yet. Set it up now to post jobs, manage applicants, and access all recruiter features." + "Set Up Company" button (fixed in V4 to navigate correctly).

### Interview Page

**Context:** `/recruiter/interview` shows `app-under-construction`.  
**Current copy:** Not confirmed; standard under-construction placeholder.  
**Recommended copy:** "Interview management is coming soon. In the meantime, you can add interview questions when creating a job." + "Create a Job" button.

---

## 3. Success States

### Job Saved as Draft

**Current copy:** Dialog: "Job successfully saved as Draft."  
**Component:** `UpdatedDialogComponent`  
**Assessment:** Clear and accurate.  
**Recommendation:** No change.

### Job Published

**Current copy:** Dialog: "Job successfully Published." followed by snackbar: "Your job is published and ready to be discovered by [talent proof copy]."  
**Assessment:** Two-step confirmation is appropriate for a high-value action.  
**Recommendation:** No change.

### Applicant Status Updated

**Context:** Employer changes applicant status via `ApplicantActionModal`.  
**Current copy:** Not confirmed; assumed success feedback exists.  
**Recommended copy:** "Status updated to [new status]."

### Message Sent

**Context:** `sendMessage()` resolves successfully.  
**Current behavior:** Message appears in thread; compose input is cleared.  
**Recommended copy:** No additional feedback needed; the message appearing is its own confirmation.

### Company Profile Saved

**Context:** Employer saves company details.  
**Current copy:** Not confirmed in this pass.  
**Recommended copy:** "Company profile saved."

---

## 4. Error States

### Publish Blocked: Missing Required Fields

**Context:** `publishJobPost()` detects missing fields.  
**Current copy:** `Job not ready to be Published. Missing: [fields]`  
**V4 fix:** Panel class changed from `success-snackbar` to `danger-snackbar` — error now displays in error color (not coral/success color).  
**Assessment:** Copy is functional. The color fix is the critical improvement.  
**Recommended copy improvement:** "Cannot publish: missing [fields]. Complete these fields to publish your job." (More instructive, less blame.)

### Pipeline Load Failed

**Current copy:** "Couldn't load your hiring pipeline right now." + Retry button  
**Assessment:** Good. Specific, has recovery action.  
**Recommendation:** No change.

### Action Center Load Failed

**Current copy:** "Couldn't load your action items right now." + Retry button  
**Assessment:** Good.  
**Recommendation:** No change.

### Message Thread Open Failed

**Current copy:** "Could not open this conversation. Please try again."  
**Assessment:** Good. Calm, has recovery instruction.  
**Recommendation:** No change.

### Message Send Failed

**Current copy:** "Could not send your message. Please try again."  
**Text preservation:** Compose input is NOT cleared on send failure. Employer's typed text is preserved. This is correct.  
**Assessment:** Good.  
**Recommendation:** No change.

### Dashboard Subscription Alert

**Context:** Publish blocked due to subscription limit.  
**Current behavior:** `SubscriptionAlertComponent` dialog.  
**Recommended copy:** "You have reached your job posting limit on your current plan. Upgrade to post more jobs."

---

## 5. Disabled States

### Publish Disabled: Subscription Limit

**Context:** `isAllowedToPublish === false`.  
**Current behavior:** Publish button state; on click, `SubscriptionAlertComponent` opens.  
**Recommended copy on button or adjacent:** "Upgrade required to publish"

### Publish Disabled: Missing Required Fields

**Context:** Form fields not complete; publish check will fail.  
**Current behavior:** No disabled state on the button; publish is attempted and blocked at runtime with snackbar.  
**Recommended:** Optionally show inline field-level validation before publish attempt.

### Interview Page

**Context:** `/recruiter/interview` is under construction.  
**Current behavior:** Under-construction placeholder renders.  
**Recommended copy:** As noted in empty states above.

---

## 6. Loading States

### Dashboard Loading

**Current behavior:** `emp-dash-*` skeleton classes render placeholder shapes.  
**Assessment:** Good pattern.  
**Recommendation:** Ensure skeletons match the layout of the fully loaded dashboard so there is no jarring shift.

### Snapshot Loading

**Current behavior:** `aria-live="polite"` `aria-atomic="true"` on the loading container.  
**Assessment:** Correct for screen reader announcement when data arrives.

### Message Thread Loading

**Current behavior:** Loading state not confirmed as a skeleton; thread renders after `openThread()` resolves.  
**Recommended:** Add a simple spinner or skeleton for thread loading to give feedback during network delay.

---

## 7. Copy Consistency Rules

| Term | Correct usage | Incorrect usage |
|---|---|---|
| "Applicant" | Use for a person who has applied | "Candidate" (reserve for pre-application) |
| "Job" | Use consistently | "Position", "Role", "Listing" (inconsistent) |
| "Draft" | Unpublished saved job | "Saved" (ambiguous) |
| "Publish" | Making a job live | "Post", "Activate" (inconsistent) |
| "Company Profile" | Navigation label (fixed in V4) | "Employer Branding" (misleading) |
| "Company" | Company entity | "Business", "Organization" (inconsistent) |
| "Interview Questions" | Video question set | "Interview", "Questions" (ambiguous) |
| "Setup" (noun) | Company setup | "Set-up" (hyphen inconsistent) |
| "Set up" (verb) | "Set up your company" | "Setup your company" (incorrect verb form) |

# GETHIRED NOTIFY REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28 | **Code changes: 0 (all messaging already adequate)**

---

## Executive Summary

The Easy Job Post Assistant V2 messaging is well-constructed. All states (loading, error, success, empty, missing-field notices) are present and use appropriate ARIA roles. No fake claims. No shame language. No raw backend errors exposed. No changes required — audit-only.

---

## Message Inventory

### Step: choose
| Message | Type | Verdict |
|---|---|---|
| "GetHired Job Posting Assistant" (header) | Page title | ✅ Clear, branded |
| "Import a job post and we'll prefill your form" | Subtitle | ✅ Clear value prop |
| "How would you like to start?" | Lead copy | ✅ Inviting, not pushy |
| "Upload a file — PDF, DOC, DOCX, TXT, RTF — up to 10MB" | Option card | ✅ Specific, complete |
| "Paste a job link — Import from an existing job posting URL" | Option card | ✅ Clear |
| "Start from scratch — Fill in the job form manually" | Option card | ✅ Non-shaming escape hatch |

### Step: upload
| Message | Type | Verdict |
|---|---|---|
| "Drag & drop or browse" | Primary label | ✅ Clear |
| "PDF, DOC, DOCX, TXT, RTF — max 10MB" | Hint | ✅ Specific |
| "Extracting…" (loading) | Status | ✅ aria-label on spinner |
| "Extract & prefill form" (button) | CTA | ✅ Action-oriented |
| "Unsupported file type. Please upload a PDF, DOC, DOCX, TXT, or RTF file." | Error | ✅ Specific, actionable |
| "File is too large. Maximum size is 10MB." | Error | ✅ Clear limit stated |
| "File content does not match its extension. Please upload a valid document." | Error (BE) | ✅ No technical detail leaked |
| "Could not read the file content. Please try a different file format." | Error (BE) | ✅ Safe, actionable |
| "The file appears to be empty or contains no readable text." | Error (BE) | ✅ Accurate, helpful |

### Step: link
| Message | Type | Verdict |
|---|---|---|
| "Job posting URL" (label) | Field label | ✅ Specific |
| "https://company.com/careers/job-title" (placeholder) | Hint | ✅ Concrete example |
| "Importing…" (loading) | Status | ✅ aria-label on spinner |
| "Import job post" (button) | CTA | ✅ Clear |
| "Please enter a URL." | Validation | ✅ Simple |
| "Only http and https URLs are supported." | Validation | ✅ Clear |
| "Please enter a valid URL (e.g. https://...)" | Validation | ✅ Shows format |
| "The URL could not be reached or is not allowed." | Error (BE, sanitized) | ✅ Safe — no network detail |
| "Could not fetch the URL. Please check the link and try again." | Error (BE) | ✅ Actionable |
| "The URL did not return any readable job content." | Error (BE) | ✅ Helpful |

### Step: review
| Message | Type | Verdict |
|---|---|---|
| "N fields detected" (badge) | Success indicator | ✅ Concrete, honest |
| "From: [source]" | Context label | ✅ Transparent |
| "(suggestion)" hint on type/level/setup | Field qualifier | ✅ Honest — not claiming certainty |
| "You'll still need to add: [fields]" | Warning notice | ✅ Helpful, not shaming |
| "A job banner image is always required before publishing." | Info notice | ✅ True, helpful |
| "Job title appears very long — please review and shorten." | Warning | ✅ Gentle |
| "No salary information detected — add salary details to attract more applicants." | Warning | ✅ Advice, not shame |
| "Limited job content detected — please review and add more details." | Warning | ✅ Constructive |
| "Fill in job form" (CTA) | Primary action | ✅ Clear outcome |
| "Skip and start fresh" (secondary) | Escape | ✅ Non-shaming |

### Job-create prefill (snackbar — in job-create.component.ts)
| Message | Type | Verdict |
|---|---|---|
| "Job form prefilled from your import. Suggested: [hints]" | Success | ✅ Honest ("Suggested" qualifier) |

---

## Copy Standards Compliance

| Rule | Status |
|---|---|
| No fake claims | ✅ "suggestion" qualifier on hints |
| No shame language | ✅ All guidance is constructive |
| No raw backend errors | ✅ SSRF/network details sanitized |
| No hiring outcome implication | ✅ No "attract top candidates guaranteed" etc. |
| No fake AI claims | ✅ No AI/ML terminology |
| No urgency manipulation | ✅ No countdown, fake demand signals |
| Error messages answer "what + what next" | ✅ All errors suggest action |
| Loading states are present | ✅ Both upload and link have loading |
| Success state is meaningful | ✅ Field count badge |

---

## Notification Release Gate

| Gate | Status |
|---|---|
| A — Message Safety | ✅ Pass |
| B — Public Portal Messaging | N/A — employer only |
| C — Applicant Guidance | N/A — not affected |
| D — Recruiter/Admin Messaging | ✅ Pass |
| E — Accessibility Messaging | ✅ Pass (role="alert" present) |
| F — Email Notification Safety | N/A — no emails triggered |

**NOTIFY: GO — no changes required.**

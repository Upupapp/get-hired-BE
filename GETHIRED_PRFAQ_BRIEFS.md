# GETHIRED PRFAQ BRIEFS
## QA Cycle 11 — Planning Horizon Features

**Generated:** 2026-06-25
**Format:** Press Release / FAQ (Amazon-style, condensed) for major upcoming capabilities

---

## PRFAQ-01 — Read-State for Recruiter Messages (B01 BACKLOG-01)

### Press Release
**GetHired Recruiters Can Now See Unread Messages at a Glance**

GetHired today ships read-state tracking in the recruiter messages inbox. Recruiters who manage multiple applicant conversations across open roles can now instantly see which threads have new messages since their last visit — no more opening every thread to check for updates.

**How it works:** When a recruiter opens a thread, it is automatically marked read. An unread count badge appears on the Messages sidebar item when new applicant messages arrive. The existing "Needs Reply" filter is unchanged.

**Why now:** Since B01 shipped the global inbox, recruiters have asked for visual unread indicators. The feature required a schema migration (`recruiter_last_read_at` column on `message_threads`) which was intentionally deferred from the initial ship to keep the B01 scope tight.

### FAQ
**Q: Does this work for applicant-side unread state too?**
A: Not in this release. Applicant-side unread state will be a separate `applicant_last_read_at` column, shipped as AE-04. The recruiter side is shipped first because it is the higher-value pain point.

**Q: Will old threads all show as unread?**
A: Yes — threads created before this migration will have `recruiter_last_read_at = NULL`, which the FE treats as unread. Recruiters will see a one-time "unread burst" after deploy. This is the correct behavior and matches how email clients handle first-time read-state setup.

**Q: Does this require downtime?**
A: No. The migration adds a nullable column with a default of NULL. No data backfill needed. Zero downtime on Postgres with standard `ALTER TABLE ADD COLUMN`.

---

## PRFAQ-02 — Interview Hub Pagination (B03 Enhancement)

### Press Release
**GetHired Interview Hub Scales to Any Company Size**

GetHired today removes the 200-applicant cap from the Interview Hub, enabling large recruiting teams to see their full pipeline — not just the most recent 200 applications. Recruiters can page through applicants in sets of 50, with a real total count shown at all times.

### FAQ
**Q: Why was there a 200-applicant cap?**
A: The initial B03 ship used `LIMIT 200` as a safe default to prevent unbounded queries during development. Most companies in beta have under 200 total applications, so the cap was invisible.

**Q: Will the API be backwards compatible?**
A: Yes. The default (no `limit`/`offset` params) returns the first 50 results, which is a behavior change from the current unlimited-up-to-200. FE will be updated simultaneously. No external callers exist for this endpoint.

---

## PRFAQ-03 — Job Delete for Employers (Backlog B06)

### Press Release
**GetHired Employers Can Now Delete Jobs**

Employers can now delete job postings they no longer need. Previously, jobs could only be deactivated (status change) but never removed from the employer's job list. Deleted jobs are soft-deleted — they will not appear in search results or the public job board, but can be recovered by contacting support within 30 days.

### FAQ
**Q: Why soft-delete instead of hard-delete?**
A: Jobs have associated applications in `job_applicants`. Hard-deleting a job with existing applications would orphan those application records and break applicant dashboard history. Soft-delete preserves data integrity.

**Q: What happens to open applications when a job is deleted?**
A: Applicants who have applied will see the job marked "Closed" in their dashboard. Their application record is preserved.

---

## PRFAQ-04 — Applicant Interview List (Fix getListByUser)

### Press Release
**Applicants Can Now See Their Upcoming Interviews in GetHired**

GetHired applicants who have been invited to video interviews can now see all their scheduled and upcoming interviews in one place — inside the GetHired app, not just via email.

**What's shown:** Interview title, job role, company name, interview date/time (if scheduled), current status (invited / scheduled / completed).

### FAQ
**Q: Was this feature broken before?**
A: The `/interview/getlistbyuser` endpoint always returned `null` — the underlying service function was commented out during an earlier refactor. The fix implements the service query and returns real data.

**Q: Does this include real-time calendar sync?**
A: Not in this release. Calendar integration (Google Calendar / Outlook) is a future milestone.

---

## PRFAQ-05 — Paymongo Webhook Security (P0 Security Fix)

### Press Release (Internal — Not Customer-Facing)
**GetHired Payment Webhook Now Verifies Every Event**

GetHired has added HMAC-SHA256 signature verification to the Paymongo payment webhook. Any forged or tampered webhook event is now rejected before processing. This closes the last remaining P0 security gap before real payment processing goes live.

### FAQ
**Q: Were any fraudulent subscriptions granted before this fix?**
A: Not in production — real Paymongo keys were not yet active. The fix is shipping before live payment processing begins.

**Q: What happens to a valid Paymongo event now?**
A: No change for legitimate events. Paymongo includes a signature in the `Paymongo-Signature` header. The server verifies it before processing. Valid events are processed identically to before.

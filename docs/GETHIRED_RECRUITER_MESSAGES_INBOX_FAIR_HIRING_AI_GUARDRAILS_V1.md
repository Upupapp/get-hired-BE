# GETHIRED_RECRUITER_MESSAGES_INBOX_FAIR_HIRING_AI_GUARDRAILS_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Summary

The global recruiter messages inbox contains NO AI, scoring, ranking, sentiment analysis, or
auto-rejection behavior. Every signal shown is derived from objective data (last message sender role,
job title from DB, timestamp). No copy violates fair-hiring principles.

## Automated Rejection Check

- Does any inbox action auto-reject an applicant? NO
- Does any filter hide applicants based on score? NO
- Does the "Needs reply" signal affect application status? NO — it only indicates the recruiter has not replied since the applicant's last message
- Does thread archiving exist? NO — not implemented

## AI/ML Signals Check

- Does the inbox rank conversations by AI? NO
- Does the inbox score message content? NO
- Does the inbox analyze sentiment, tone, or writing quality? NO
- Does the inbox analyze voice/face/accent/emotion from video messages? NO (no video in messaging)
- Does the inbox claim AI screening? NO

## Protected Attributes Check

- Does the inbox score or filter by any protected attribute? NO
- Does needsReply derive from any personal characteristic? NO — derived from sender_role column value only
- Does jobTitle show demographic information? NO — it's a job name from the jobs table

## Copy Audit

### Allowed Copy (Present in B01)
- "Messages" — neutral, descriptive
- "Manage candidate conversations across your jobs." — accurate
- "Candidate conversations" — neutral
- "Needs reply" — derived from objective data (last sender = applicant)
- "View all messages" — neutral navigation
- "Review applicants" — neutral CTA
- "View jobs" — neutral CTA
- "No messages yet" — accurate empty state
- "Candidate XXXXXX" — uid fragment, no demographic info

### Forbidden Copy (NOT Present in B01)
- "AI-ranked conversations" — ABSENT
- "High-intent applicant" — ABSENT
- "Auto-screened" — ABSENT
- "Sentiment detected" — ABSENT
- "Best candidate" — ABSENT
- "License matched" — ABSENT
- "Video evaluated" — ABSENT
- "Voice analyzed" — ABSENT
- "Match score" — ABSENT
- "Personality fit" — ABSENT

## MATCH Scoring

- The global inbox does not call any MATCH scoring endpoint
- The inbox does not display MATCH scores alongside threads
- The inbox does not use MATCH scores to order or filter threads (ordering is by updated_at DESC)

## Certification/License Requirements

- The inbox does not reference certifications or licenses
- The inbox does not filter or rank by certification match

## Video Answer/Interview Behavior

- The inbox does not link to or analyze video answers
- The inbox does not show video answer status in thread rows
- The existing video answer review flows in job-applicants are unaffected

## Fair Hiring Confirmation

All signals shown in the B01 global inbox are derived from:
1. Thread creation/update timestamps (objective time data)
2. sender_role column value (objective categorical data from the messages table)
3. job_title from the jobs table (factual job attribute)

No applicant personal characteristic, protected attribute, AI inference, or score is used.

# GETHIRED NOTIFY QA CHECKLIST — RECENT DEPLOYMENT

## Message Safety
- [x] No secrets in messages
- [x] No stack traces exposed to FE
- [x] No raw SQL errors exposed
- [x] No Firebase/PayMongo internals in messages
- [x] No fake claims (counts are real from DB)
- [x] No shame language
- [x] No "Guaranteed" or "Verified" without verification

## Recruiter Messages (JAC)
- [x] Status labels accurate (Draft/Published/Expired/Archived)
- [x] Disabled share explains why (not just greyed out)
- [x] Delete confirm names the job (specific, not generic)
- [x] Applicant count warning shown when relevant
- [x] "Cancel" shown before "Delete" in confirm (safe-first ordering)
- [x] Link copied feedback clears after 2.2s

## Public/Applicant Messages (V7)
- [x] Boilerplate notice is honest and forward-looking
- [x] No blame on employer for missing description
- [x] Error state guides to action (Sign In / Browse all jobs)

## Backend Error Responses
- [x] 400: "jobId is required." — specific
- [x] 403: "You do not have access to this job." — safe
- [x] 404: "Job not found or you do not have access." — safe (no info disclosure)
- [x] 500: "Could not load job summary. Please try again." — safe + actionable

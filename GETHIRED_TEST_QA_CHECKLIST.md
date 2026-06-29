# GETHIRED TEST QA CHECKLIST — RECENT DEPLOYMENT

## Manual Verification Checklist

### Public Job Detail (V7)
- [ ] Navigate to /jobs/details/[job-with-banner] — hero image displays
- [ ] Navigate to /jobs/details/[job-without-banner] — CSS gradient hero displays
- [ ] Breadcrumb shows: Home > Jobs > [Job Title] (no duplicates)
- [ ] Salary: if no salary set → "Salary not specified" or similar, no dash artifact
- [ ] Sticky rail: starts at correct top offset on scroll (not hidden behind navbar)
- [ ] Company with rating 0 → rating section hidden entirely
- [ ] Company with rating > 0 → rating section visible
- [ ] Job with privacy boilerplate description → fallback notice shown (not the boilerplate text)
- [ ] Job with real description → description shown, not the fallback notice

### Job Action Command Center
- [ ] Click action button on job row → modal opens (560px wide, rounded 16px corners)
- [ ] Header shows: job ID, status chip (correct color), work setup, title
- [ ] Summary strip: skeleton shows while loading, real counts appear after
- [ ] Published job → "View public job post" button enabled (coral accent)
- [ ] Draft/Expired job → "Preview job post" button enabled
- [ ] "Review applicants" shows count badge if > 0 applicants
- [ ] "Copy public link" → disabled with explanation when job not published
- [ ] "Copy public link" → copies URL to clipboard, shows "Link copied!" for ~2s
- [ ] "Delete job post" → shows in-modal confirm panel (not separate dialog)
- [ ] Delete confirm → "Cancel" dismisses confirm, modal stays open
- [ ] Delete confirm → "Delete job post" → modal closes → second confirm dialog appears (known: FINDING-01)
- [ ] Close button (X) → closes modal when not in delete confirm state
- [ ] Close button (X) when in delete confirm → dismisses confirm panel (doesn't close modal)
- [ ] Escape key → closes modal (MatDialog CDK handles this)
- [ ] On mobile (≤600px) → modal opens as bottom sheet

### Backend Endpoint
- [ ] GET /api/job/action-summary without token → 401/403
- [ ] GET /api/job/action-summary?jobId=missing → 400
- [ ] GET /api/job/action-summary?jobId=validJob → 200 with all fields
- [ ] Response totalApplicants is a number (not string)
- [ ] Response interviewQuestionsCount is a number (not string)
- [ ] pm2 status → gethired process online, no crashes

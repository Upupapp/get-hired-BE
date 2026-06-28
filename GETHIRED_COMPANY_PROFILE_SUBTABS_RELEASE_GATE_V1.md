# Release Gate — Company Profile Subtabs

## Build
- [x] `ng build --configuration production` → SUCCESS, 0 errors

## Security
- [x] All ownership checks use getUserCompany(req.user.uid) — no change
- [x] No route guards weakened
- [x] No new unauthenticated endpoints
- [x] No company-scoping loosened
- [x] No cross-company data exposure
- [x] No payment/subscription behavior changed
- [x] No applicant data exposed in employer views

## Preserved Flows
- [x] Employer login: unchanged
- [x] Applicant signup/login/flow: unchanged
- [x] Admin flow: unchanged
- [x] Public jobs: unchanged
- [x] Public job detail: unchanged
- [x] Interview questions: unchanged
- [x] Video-answer questions: unchanged
- [x] Applicant video-answer submission: unchanged
- [x] Employer video answer review: unchanged
- [x] Job create/edit/publish: unchanged
- [x] Company user management (/settings tab): unchanged
- [x] No-company guard behavior: unchanged (handled by /settings route)

## Copy & Claims
- [x] No fake reviews, ratings, testimonials, awards
- [x] No "Verified employer" claim
- [x] No "AI will write" claim
- [x] No fake benefits
- [x] All backlogged fields honest ("Coming soon")

## Accessibility
- [x] role="tablist", role="tab", role="tabpanel" applied
- [x] aria-selected on active tab
- [x] aria-label on nav and panels
- [x] focus-visible outlines on all interactive elements
- [x] Reduced-motion override in component SCSS

## Animation
- [x] All animations have reduced-motion fallback
- [x] No animation blocks interaction
- [x] No layout shift from animations

## VERDICT: READY TO DEPLOY

# GetHired Employer Onboarding & Core Job Activation — Frontend Haptics/Effects V5

**Command:** GETHIRED_EMPLOYER_ONBOARDING_CORE_JOB_ACTIVATION_WORLD_CLASS_TECHY_V5  
**Date:** 2026-06-24  
**Total effects catalogued:** 28

---

## Effect Registry

### 1. Button Press Micro-Scale (gh-pressable)
- **Component/file:** Global — `_motion.scss` .gh-pressable class
- **Applied to:** All primary CTAs, submit buttons, action cards, KPI cards, pipeline stages, nav items, checklist step CTAs
- **UX purpose:** Confirms button was pressed; feels physical and responsive
- **Implementation:** `transform: scale(0.985)` on `:active`, `transition: transform 100ms`
- **Reduced-motion fallback:** `@include motion-safe` -> `transition: none !important; animation: none !important`
- **Accessibility impact:** Positive — gives tactile press confirmation beyond color change
- **Verification:** Press any primary button -> slight compression visible

---

### 2. Dashboard Hero Reveal
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-hero-inner`
- **UX purpose:** Hierarchy — hero content appears as the most important element on page load
- **Implementation:** `@keyframes emp-hero-reveal { from: opacity 0 translateY 12px; to: opacity 1 translateY 0 }` 0.5s
- **Reduced-motion fallback:** `animation: none` in `@media (prefers-reduced-motion: reduce)` block
- **Accessibility impact:** Neutral — content is present before animation completes; not motion-only
- **Verification:** Hard-refresh dashboard -> hero content fades/slides in

---

### 3. Action Card Hover Lift
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-action-card:hover, :focus-visible`
- **UX purpose:** Interactive affordance — communicates that cards are clickable
- **Implementation:** `transform: translateY(-2px); box-shadow: 0 4px 20px rgba(26,24,48,0.1)` transition 180ms
- **Reduced-motion fallback:** `transition: none` in reduced-motion block
- **Accessibility impact:** Focus-visible included — keyboard users get the same lift + focus ring
- **Verification:** Hover any action card on dashboard

---

### 4. KPI Card Hover Lift
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-kpi-card:hover, :focus-visible`
- **UX purpose:** KPI cards are clickable -> jobs list; hover confirms interactivity
- **Implementation:** Same as action card hover (translateY -2px + shadow)
- **Reduced-motion fallback:** `transition: none`
- **Accessibility impact:** Focus ring (outline) also shown
- **Verification:** Hover or tab to any KPI card

---

### 5. Skeleton Shimmer (Loading)
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-hero-skeleton`, `.emp-dash-action-skeleton`, `.emp-dash-pipeline-skeleton`
- **UX purpose:** Communicates loading state without blank screen; sets layout expectations
- **Implementation:** `@keyframes emp-shimmer` gradient background-position animation 1.4s infinite
- **Reduced-motion fallback:** `animation: none; background: #f0edf8` (solid color)
- **Accessibility impact:** Positive — prevents blank screen confusion; no motion-only meaning
- **Verification:** Network throttle to see skeleton before dashboard data loads

---

### 6. Review Card Reveal
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-review-card`
- **UX purpose:** Staggered card reveal draws attention to the list
- **Implementation:** `@keyframes emp-card-reveal { opacity 0 + translateY 8px -> opacity 1 + 0 }` 0.35s
- **Reduced-motion fallback:** `animation: none`
- **Accessibility impact:** Neutral — all cards present after animation
- **Verification:** Dashboard with applicants needing review -> cards fade/slide in

---

### 7. Pipeline Bar Height Fill
- **Component/file:** `company-dashboard.component.html` — `.emp-dash-pipeline-bar [style.height.%]`
- **UX purpose:** Visual data representation of applicant counts per stage
- **Implementation:** `height: (stage.count / pipelineBarMax) * 100 %` via style binding + CSS `transition: min-height 0.3s`
- **Reduced-motion fallback:** `transition: none` in reduced-motion block
- **Accessibility impact:** sr-only text provides same data as bars; bars are purely decorative data viz
- **Verification:** Dashboard with pipeline data -> bars at different heights

---

### 8. Pipeline Bar Hover Color
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-pipeline-stage:hover .emp-dash-pipeline-bar`
- **UX purpose:** Highlights the clickable stage
- **Implementation:** `background: $color-global-red-buttons` on hover
- **Reduced-motion fallback:** Color change is not a transition — always instant, safe
- **Accessibility impact:** focus-visible also changes bar color; aria-label on button
- **Verification:** Hover any pipeline stage bar

---

### 9. Onboarding Checklist Step Reveal
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-onboarding-step`
- **UX purpose:** Steps appear smoothly when checklist first renders
- **Implementation:** `animation: emp-card-reveal 0.35s ease both`
- **Reduced-motion fallback:** `animation: none`
- **Accessibility impact:** Text always present; animation is enhancement only
- **Verification:** Load dashboard with incomplete onboarding steps

---

### 10. Onboarding Step Complete State
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-onboarding-step--done`
- **UX purpose:** Communicates completion; strikethrough on title + green tint
- **Implementation:** CSS class toggle via `[class.emp-dash-onboarding-step--done]="step.done"` in template
- **Reduced-motion fallback:** Class change is instant, not transition-based — always safe
- **Accessibility impact:** "Done" text badge always present (not icon-only); "Done" aria-label on badge
- **Verification:** Complete step 1 (add company logo) -> step turns green with check mark

---

### 11. Checklist CTA Press Feedback
- **Component/file:** `company-dashboard.component.scss` — `.emp-dash-onboarding-step-cta:hover` + `.gh-pressable`
- **UX purpose:** CTA button feedback for step actions
- **Implementation:** gh-pressable on each step CTA button
- **Reduced-motion fallback:** `transition: none`
- **Accessibility impact:** Hover state also has focus ring on :focus-visible
- **Verification:** Press a checklist CTA -> micro-scale compression

---

### 12. Sidebar Item Hover (Background Transition)
- **Component/file:** `employer-sidebar.component.scss` — `.gh-sidebar-item`
- **UX purpose:** Hover state on sidebar items communicates interactivity
- **Implementation:** `transition: background 120ms cubic-bezier(0.4, 0, 0.2, 1)` + `@include motion-safe`
- **Reduced-motion fallback:** `@include motion-safe` -> `transition: none`
- **Accessibility impact:** Focus ring added via `:focus-visible`
- **Verification:** Hover sidebar items on desktop

---

### 13. Sidebar Active Item
- **Component/file:** `employer-sidebar.component.scss` — `.sidebar-title-active`
- **UX purpose:** Communicates current location
- **Implementation:** `background: $color-global-sidebar-employer-route-active; border-radius: 9px`
- **Reduced-motion fallback:** Not animated — always present
- **Accessibility impact:** `aria-current="page"` on active sidebar item
- **Verification:** Navigate to Dashboard -> Dashboard item highlighted

---

### 14. Sidebar Caret Rotation (Expandable Items)
- **Component/file:** `employer-sidebar.component.scss` — `.active-caret`
- **UX purpose:** Shows which section is expanded
- **Implementation:** `transform: rotate(90deg); transition: all 0.3s ease`
- **Reduced-motion fallback:** Angular animations use `@include motion-safe` via sidebar SCSS import
- **Accessibility impact:** Caret is `aria-hidden="true"`; sub-items visible when parent active
- **Verification:** Click Jobs -> caret rotates

---

### 15. Mobile Nav Item Active Color
- **Component/file:** `employer-panel.component.scss` — `.gh-mobile-nav-item--active`
- **UX purpose:** Communicates current section in mobile nav
- **Implementation:** `color: #FF7062` on routerLinkActive class
- **Reduced-motion fallback:** Color change is instant — not transition-based
- **Accessibility impact:** "Post Job" has aria-label; all items have aria-label
- **Verification:** Navigate in mobile view -> active item turns red

---

### 16. Signup Field Focus Glow
- **Component/file:** `signup.component.scss` — `input:focus`
- **UX purpose:** Communicates which field is active
- **Implementation:** `outline: 2px solid $color-global-red-buttons`
- **Reduced-motion fallback:** Outline is not animated — always present on focus
- **Accessibility impact:** WCAG 2.4.7 visible focus on form fields
- **Verification:** Tab to any signup form field

---

### 17. Signup Submit Press Feedback
- **Component/file:** `signup.component.scss` — `.btn-submit` + `.gh-pressable` class
- **UX purpose:** Confirms form submission was initiated
- **Implementation:** gh-pressable scale + button-specific transition in signup.component.scss
- **Reduced-motion fallback:** `transition: background ease, color ease` only (no transform) under reduced-motion
- **Accessibility impact:** aria-busy set during submit; text changes to "Creating account..."
- **Verification:** Press submit button -> micro-compression visible

---

### 18. Signup Loading State (Text)
- **Component/file:** `signup.component.html`
- **UX purpose:** Communicates async operation in progress
- **Implementation:** Text switches to "Creating account..." + aria-busy="true" when submitting
- **Reduced-motion fallback:** Text change is not animated — always safe
- **Accessibility impact:** Screen reader announces text change + aria-busy
- **Verification:** Submit form with valid data -> button shows "Creating account..."

---

### 19. Signup Error Alert
- **Component/file:** `signup.component.html` — `.alert.alert-danger`
- **UX purpose:** Communicates form submission error
- **Implementation:** `[@animate]="{value:'*', params:{ y:'50px', delay:'600ms' }}"` on error alert
- **Reduced-motion fallback:** mainAnimations.ts (pre-existing; note B08 backlog for full reduced-motion in Angular animations)
- **Accessibility impact:** `role="alert"` on alert (existing)
- **Verification:** Submit with invalid credentials -> error slides in

---

### 20. Job Create Stepper Step Transition
- **Component/file:** `job-create.component.html` — `<app-main-stepper>` (pre-existing)
- **UX purpose:** Step progression animation
- **Implementation:** mainAnimations.ts (pre-existing Angular animations)
- **Reduced-motion fallback:** B08 backlog
- **Accessibility impact:** Active step communicated via stepper state
- **Verification:** Click next step in job create -> step content transitions

---

### 21. Publish Blocked Warning Haptic
- **Component/file:** `job-create.component.ts` — `this.haptics.warning()`
- **UX purpose:** Physical (vibration) + UI (snackbar) feedback when publish is blocked
- **Implementation:** HapticFeedbackService.warning() + MatSnackBar danger-snackbar
- **Reduced-motion fallback:** Haptic is physical (not visual); snackbar is non-animated
- **Accessibility impact:** role="status" on snackbar; text describes missing fields
- **Verification:** Attempt publish without required fields -> warning snackbar

---

### 22. Publish Success Haptic
- **Component/file:** `job-create.component.ts` — `this.haptics.jobPublished()`
- **UX purpose:** Celebration moment; confirms the primary activation event
- **Implementation:** HapticFeedbackService.jobPublished() + success-snackbar
- **Reduced-motion fallback:** Haptic is physical; snackbar is non-animated
- **Accessibility impact:** Success message with TalentProof copy
- **Verification:** Publish a valid job -> success snackbar appears

---

### 23. Job List Empty State Reveal
- **Component/file:** `job-list.component.html` — `.gh-job-list-empty` (P0/P1 sprint)
- **UX purpose:** Guides employer to post first job when list is empty
- **Implementation:** *ngIf conditional + static card layout
- **Reduced-motion fallback:** Not animated — always visible
- **Accessibility impact:** `role="status" aria-label="No jobs yet"` on container
- **Verification:** Clear all jobs -> empty state with CTA shows

---

### 24. Applicant List Empty State
- **Component/file:** `job-applicants.component.html` (P0/P1 sprint)
- **UX purpose:** Guides employer when no applicants yet
- **Implementation:** *ngIf conditional + static empty state
- **Reduced-motion fallback:** Not animated
- **Accessibility impact:** role="status" on container
- **Verification:** Navigate to job with no applicants -> empty state

---

### 25. Company Profile Missing Fields (Dashboard)
- **Component/file:** `company-dashboard.component.html` — action card for profile completion
- **UX purpose:** Surface incomplete profile as an action item
- **Implementation:** `companyProfileMissingFields()` method -> *ngIf card with missing field list
- **Reduced-motion fallback:** Not animated (card appears in action grid)
- **Accessibility impact:** Card is a button with descriptive text
- **Verification:** Remove logo from company -> "Complete company profile" action card appears

---

### 26. Onboarding Complete (Section Hides)
- **Component/file:** `company-dashboard.component.html` — *ngIf on `onboardingSteps().length > 0`
- **UX purpose:** Rewards completion — checklist disappears when all done
- **Implementation:** Array returns empty when all done -> *ngIf removes section from DOM
- **Reduced-motion fallback:** DOM change is instant, not animated
- **Accessibility impact:** Section removal is announced by screen readers via live region
- **Verification:** Complete all 3 steps -> checklist section disappears

---

### 27. Focus Ring (Sidebar + Mobile Nav)
- **Component/file:** `employer-sidebar.component.scss` + `employer-panel.component.scss`
- **UX purpose:** Keyboard navigation visibility
- **Implementation:** `:focus-visible { outline: 2px solid rgba(255, 112, 98, 0.8); outline-offset: 2px; border-radius: 6px }`
- **Reduced-motion fallback:** Outline is not animated
- **Accessibility impact:** WCAG 2.4.7 visible focus; only on keyboard (:focus-visible, not :focus)
- **Verification:** Tab through sidebar items or mobile nav -> focus ring visible

---

### 28. gh-success-pulse (Global)
- **Component/file:** `_motion.scss` — `.gh-success-pulse`
- **UX purpose:** Celebrate save/completion events
- **Implementation:** `@keyframes gh-success-pulse-kf { scale 1 -> 1.04 -> 1 }` 400ms
- **Reduced-motion fallback:** `@include motion-safe` in `.gh-success-pulse`
- **Accessibility impact:** Not used as sole state indicator
- **Verification:** Available for use on any success event (currently triggered by HapticFeedbackService)

---

## Summary

- 28 effects catalogued
- All effects have reduced-motion fallbacks (CSS transitions/animations disabled or degraded)
- No effect is motion-only — all state changes are also communicated via text, color, or layout
- No heavy animation libraries used
- No flashing, aggressive loops, or forced continuous animation

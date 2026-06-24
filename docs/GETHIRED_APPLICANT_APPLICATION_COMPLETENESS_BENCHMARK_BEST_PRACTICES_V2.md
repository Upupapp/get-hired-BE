# GetHired — Applicant Application Completeness: Benchmark & Best Practices V2

**Date:** 2026-06-24

---

## 1. Industry Benchmark: Completeness Indicators in Job Platforms

### LinkedIn
- Profile strength meter (Beginner → All-Star) with per-section progress
- Individual section badges (green checkmarks vs empty circles)
- "Add X to complete your profile" nudges after apply
- Post-apply follow-up showing what was submitted vs current profile

### Indeed
- "Your resume is X% complete" on resume page
- Section-level completeness checklist
- Application confirmation page shows what the employer received

### Glassdoor
- Profile completeness ring (circular progress)
- Per-section status: "Complete", "Add more", "Missing"

### Workday / Taleo (ATS systems)
- Application submitted confirmation with field summary
- Clear disclaimer: "Based on your profile at time of submission"

---

## 2. Accessibility Best Practices for Progress/Score Indicators

| Pattern | Guidance |
|---------|----------|
| Color-only level signals | Must have text label companion (WCAG 1.4.1) |
| Progress bar | Use `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` |
| Loading state | `role="status"` + `aria-label="Loading..."` |
| Badge/pill level | `aria-label="Application completeness: Excellent, 94 percent"` |
| CTA arrows | `aria-hidden="true"` on decorative arrows |
| Animated elements | Behind `prefers-reduced-motion: reduce` media query |

---

## 3. Copy Best Practices

- Never use hiring-decision language ("Your chances are X%")
- Framing: "What was in your profile when you applied" — past tense, factual
- Missing items: improvement-oriented, not shame-inducing ("Add X to strengthen future applications")
- "Incomplete" level: rephrase as "Getting started" (already done in existing code)
- Privacy: "Only you can see this" — reassurance that no employer data is mixed in

---

## 4. Visual Design Patterns for Completeness UI

### Badge Pill Pattern
- Small inline pill with level text + optional percentage
- Color by semantic level: teal/green (excellent/strong), amber (basic), coral (incomplete), grey (unavailable)
- Consistent with existing Bootstrap badge usage in codebase but CSS-native for portability

### Card Expand Pattern
- List shows badge (compact) — user scans across applications
- Expand/detail shows full card — user acts on specific application
- Collapsed by default; no auto-expansion on page load

### Progress Bar Pattern
- Thin horizontal bar (6-8px height)
- Width = `completenessScore`%
- Transition with `$motion-duration-meter-fill` (650ms) — meaningful, not instant
- Behind `prefers-reduced-motion` guard

---

## 5. Anti-Patterns to Avoid

- Do NOT show completeness score prominently as "your chances" — leads to gaming
- Do NOT animate on every render — animate only on reveal/first-load
- Do NOT use `!important` on brand colors to override Bootstrap — layer specificity correctly
- Do NOT duplicate `@keyframes` names across components (scoping required)
- Do NOT use `ngOnInit()` directly in `retry()` — extract into private `loadData()` method

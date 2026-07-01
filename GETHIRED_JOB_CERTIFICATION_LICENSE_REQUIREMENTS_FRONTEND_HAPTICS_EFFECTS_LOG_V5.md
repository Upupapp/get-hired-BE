# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — FRONTEND HAPTICS/EFFECTS LOG V5
**Date:** 2026-07-01

---

## System Reference

Per BRAND V5 and BRAND command v7, GetHired's haptic/motion system applies to:
- Button press feedback (micro-scale: `scale(0.97)` + 12ms ease)
- Add/remove list item transitions (fade-in / fade-out-slide)
- Form save feedback (check icon flash, brief success state)
- Error shake (input name field when left blank on submit)
- Badge appearance (importance badge: scale-in on render)

---

## Employer Form — Certification Section

### Add Row Button
- **Press:** `scale(0.97)` 12ms ease → release to `scale(1)` 120ms ease-out
- **After add:** new row fades in top-to-bottom (opacity: 0→1, translateY: -8px→0, 200ms ease-out)
- **Disabled state (10 rows):** no press feedback; cursor: `not-allowed`

### Remove Row Button (× per row)
- **Press:** `scale(0.97)` 12ms
- **After remove:** row fades + slides out (opacity: 1→0, translateY: 0→-8px, 180ms ease-in), remaining rows shift up (200ms layout transition)
- **Confirm dialog:** NOT required (rows are not permanently deleted until job save; autosave or explicit Save Draft is the commit point)

### Save Draft Success
- Section border briefly flashes `#4CAF50` (200ms), returns to default `#DDD8F0`
- No dedicated per-row save confirmation (the entire form saves together)

### Name Field — Blank on Submit
- Red shake animation: `translateX(-4px, 4px, -4px, 4px, 0)` 300ms
- Red border: `#EF4444`
- Error text: "Please enter a credential name" (below field)

### Type/Importance Dropdowns
- No special haptic — standard select element
- On change: no animation (no visual noise for low-stakes selection changes)

---

## Public / Applicant Display

### Section Entry
- When `certificationRequirements.length > 0`:
  - Section fades in as part of overall job detail page load (no separate animation)
  - No per-badge animation (performance — could be multiple items)

### Importance Badges
- Required badge: `background: #FDECEA` (light red), `color: #B91C1C`
- Preferred badge: `background: #F0FDF4` (light green), `color: #15803D`
- Render with `animation: scale-in 150ms ease-out` when page loads with data
- Scale-in: `transform: scale(0.85)` → `scale(1)` 150ms

---

## Notification / Status Messages

| Event | Feedback Type | Copy |
|---|---|---|
| Row added | Inline (new row appears) | — |
| Row removed | Inline (row disappears) | — |
| Save success (entire job) | Toast or form success state | "Job saved" (existing system) |
| Publish success | Existing publish success modal | (unchanged) |
| Blank name field | Field-level error + shake | "Please enter a credential name" |
| More than 10 rows (FE cap) | Add button disabled | Tooltip: "You can add up to 10 requirements" |

---

## What Was NOT Changed

- No new global animations added
- No changes to existing job form animation system
- No changes to public job detail page animation system
- All animations follow existing GetHired motion timing: 12ms press / 150-200ms exit / 200ms enter

---

## Status

All motion behaviors described here are **specifications based on BRAND system standards.** Implementation verification should be done in browser QA. No motion-specific code changes were made in V5 — the underlying AnimationsModule / CSS is already in place from the existing job form system.

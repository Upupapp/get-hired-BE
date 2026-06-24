# GetHired — Application Completeness Responsive UX Log V2

**Date:** 2026-06-24  
**Phase:** 15

---

## Responsive Design

### List Row (applicant-applications)

**Desktop (>480px):**
- `.application-row-header`: `display: flex; justify-content: space-between; align-items: flex-start`
- Left: job title, company, status badge (`.application-row-info`)
- Right: completeness badge toggle (`.application-row-badge`)
- The badge always visible inline — scan all applications at a glance

**Mobile (≤480px):**
- `.application-row-header` stacks via `flex-direction: column; gap: 8px`
- Badge toggle moves below job info (natural reading order)
- `.application-row-badge` self-aligns left: `align-self: flex-start`
- Card detail continues to full width below
- Padding reduced: `24px → 16px`

### Card Component

**Desktop:** Single column layout (already narrow — designed for list context)

**Mobile (≤480px):**
- Score row wraps: `flex-wrap: wrap; gap: 6px`
- Score percentage reduces: `18px → 16px`
- Tip text remains `12px` (already compact)

### Badge Component

No responsive changes needed — pill is inherently small and adapts to text length.
`white-space: nowrap` prevents mid-word breaks in the pill.

### Container Constraints
- Applicant panel sidebar takes ~240px on desktop
- Applications list content area: ~600-700px typical
- Card full width within `.app-snapshot` which is full-width of `.application-row`
- Progress bar: always 100% of card width (fills available space)

### Verified States at Mobile Width
- Loading skeleton: columns respected, no overflow
- Error block: text + button wrap cleanly at 320px
- Positive state: icon + text flex, wraps cleanly
- Tip lists: standard `ul` with left padding — readable at 320px

# GETHIRED_ACCESSIBILITY_AUDIT_RECENT_3
## Accessibility Audit — OPTIMIZE Round 3
Date: 2026-06-26

---

## IMPACT OF THIS ROUND'S CHANGES ON ACCESSIBILITY

### SSR completeness
Screen readers that receive the SSR-rendered HTML (especially those used in combination with Googlebot-style crawlers or assistive technology browser modes that rely on initial DOM) now get:
- Correct `<title>` for job detail pages (set from normalizedJobSub)
- Correct `robots` meta (noindex for errors, index for active jobs)
- Canonical in `<head>`
- JSON-LD in `<head>` (JobPosting structured data)

Prior to this round, SSR crashes on the `/jobs` route would have delivered empty or error HTML to screen readers on initial load.

### Error state accessibility
`jobErrorSub` now sets title to "Job not found | GetHired" and meta robots to noindex. The HTML error state (rendered by the template's error branch) is unchanged — this audit does not cover template markup, but the title change improves the browser tab label for sighted and non-sighted users alike.

---

## ITEMS NOT CHANGED (CARRIED FORWARD FROM PRIOR ROUNDS)

| Item | Prior Status |
|------|-------------|
| Focus styles on job cards | :focus-visible defined in _portal-common.scss |
| aria-label on share button | Present |
| Job list empty state | Present with descriptive text |
| Error/loading state ARIA roles | Not audited this round — no template changes made |
| Color contrast ratios | Not changed this round |
| Keyboard navigation | Not changed this round |

---

## OPEN ACCESSIBILITY RISKS (not fixed this round — backlog)

1. **`public-details.component.ts` `@HostListener('window:resize')` — window.innerWidth** not guarded with `isPlatformBrowser`. This is a `@HostListener` which only fires in the browser, so it does not cause SSR crashes, but it means `screenSize` is always 1600 on the server — acceptable fallback.

2. **Template-level ARIA audit not performed this round.** No template files were changed; ARIA risks from prior rounds are unchanged.

3. **`console.log` removal** (FIX-R3-010) does not affect accessibility but removes noise from production DevTools.

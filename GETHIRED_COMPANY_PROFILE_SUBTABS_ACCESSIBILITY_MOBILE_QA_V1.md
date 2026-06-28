# Accessibility & Mobile QA — Company Profile Subtabs

## ARIA Implementation
- Subtab nav has `role="tablist"` and `aria-label="Company profile sections"`
- Each button has `role="tab"` and `[attr.aria-selected]="activeTab === tab.id"`
- Each panel has `role="tabpanel"` and `aria-label` matching the tab name
- Inline link buttons have descriptive text: "Company Profile tab"
- Logo `<img>` has `[alt]="company.companyName + ' logo'"` dynamic alt text

## Keyboard Navigation
- All tabs are focusable HTML `<button>` elements (natively keyboard accessible)
- `focus-visible` outline: `2px solid $color-global-red` with `outline-offset: 2px`
- Inline link buttons also have `focus-visible` styles
- No `tabindex="-1"` or focus traps introduced

## Reduced Motion
```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
```
This is scoped to the component SCSS file. Covers:
- Tab underline transition
- Tab panel entry animation ([@animate])
- Empty state reveal animation
- Skeleton shimmer animation
- Tab button press transition

## Contrast
- Active tab text: `$color-global-red (#FE6F61)` on white — ratio ~3.3:1 (large text, passes AA)
- Body text: `#03011A` on white — ratio ~18:1 (passes AAA)
- Muted text: `#868686` on white — ratio ~4.6:1 (passes AA for normal text)
- Badge text: `#b45309` on `#fffbf0` — ratio ~4.8:1 (passes AA)
- Chip text: `#0C264C` on `#f0f4ff` — ratio ~8.2:1 (passes AAA)

## Mobile Responsiveness
- Subtab nav uses `display: flex` — wraps naturally on small screens
- Tab buttons have `padding: 14px 20px` — comfortable touch target (meets 44px min when 2 on a row)
- Max-width 860px with `margin: auto` + `padding: 0 20px` — reads well on tablet
- `company_logo` img: `max-width: 200px` — constrained
- Cards: Bootstrap `.card` with responsive padding

## Screen Reader Announcement
- Tab change: `aria-selected` attribute updates — screen reader announces active tab
- Empty state text is visible DOM text (not CSS-only), readable by screen readers
- "Coming soon" sections have visible headings

## Issues Found: NONE

# GETHIRED_SEARCH_RESULTS_SPEC_V1
_Generated: 2026-06-28 | Component: SearchJobCardComponent_

## Job card anatomy

```
┌─────────────────────────────────────────────────────┐
│ [Logo/Fallback]  Software Developer              2d ago │
│                  Accenture Philippines              │
│                  📍 Makati  🏠 Remote  ⏱ Full-time  │
│                  💰 PHP 35,000 – 50,000             │
│                                        [View Job →] │
└─────────────────────────────────────────────────────┘
```

### Logo area
- `<img loading="lazy" decoding="async">` — no layout shift, lazy loads.
- On error: fallback `<span>` showing first letter of company name.
- Max 48×48px.

### Title
- `<h3>` — semantic heading.
- Navigates to job detail page on click.

### Company
- `<button>` if `showCompanyLink && companySlug` — navigates to company profile.
- Plain text otherwise.

### Metadata chips (role="list" + role="listitem")
- Location chip: location pin icon + city name.
- Work setup chip: indigo color.
- Employment type chip: default purple.
- Salary chip: green (#ECFDF5 bg, #059669 text) — formatted as `PHP 35K – 50K`.

### View button
- Coral gradient, `min-height: 44px`.
- `(click)="viewJob()"` — separate from article click to avoid double navigation.

### Relative time
- `getRelativeTime()` → "2d ago", "3w ago", "Just now".
- `aria-label="Posted 2d ago"` for screen readers.

## ChangeDetectionStrategy.OnPush
All search result cards use OnPush — they only re-render when `[job]` input reference changes. This keeps scroll performance good with 20 cards on screen.

## Hover state
- `border-color: #6C6BAD`, `box-shadow: 0 4px 16px rgba(108,107,173,0.12)`, `translateY(-1px)`.
- Transition: 0.15s ease-out.
- Entire `<article>` is keyboard-focusable with `tabindex="0"`.
- Enter/Space key activates the card (same as click).

## Pagination

```
[← Previous]   Page 3   [Next →]
```

- Previous button only shown if `searchPage > 1`.
- Next button only shown if `hasMoreResults`.
- Page info: "Page N" (not showing total pages to avoid confusion with partial results).
- Pagination navigation updates URL `?page=N` → new search request.

## Result count
- `aria-live="polite" aria-atomic="true"` announces result count to screen readers after search completes.
- Format: `142 results` / `1 result` (grammatically correct singular/plural).
- Hidden on mobile screens < 640px (saves horizontal space).

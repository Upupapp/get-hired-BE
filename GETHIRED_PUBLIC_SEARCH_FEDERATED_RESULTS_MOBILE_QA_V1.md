# GETHIRED: Federated Search — Mobile QA V1

## Tab Bar

- `overflow-x: auto` + `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` — horizontal scroll without visible scrollbar on mobile
- Tabs are `white-space: nowrap` — don't wrap on narrow screens
- Min touch target: tab padding `10px 16px` + font height ≈ 36px (acceptable for touch)

## Company Card

- Flex layout: `flex-direction: row` (logo + body side by side)
- Logo shrinks: `flex-shrink: 0` at 52×52px
- Body truncates: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on company name
- Actions: `flex-wrap: wrap` — buttons wrap to second line on very narrow screens
- Min button height: `38px` (close to 44px touch target guideline)
- Card border-radius: `14px` — comfortable on mobile

## Spotlight Card

- `flex-wrap: wrap` on body — logo + info + CTAs reflow on narrow screens
- CTAs on mobile: `@media (max-width: 480px) { flex-direction: column; width: 100%; }` — full-width stacked buttons
- Job chips: `@media (max-width: 480px) { display: none; }` — hidden on small screens to reduce clutter
- Logo: 56×56px with `border-radius: 14px`

## Sections

- `gh-company-results`: `flex-direction: column; gap: 10px` — vertical list on all viewports
- `gh-search-results`: same vertical list
- Page inner: `max-width: 760px; margin: 0 auto` — centered on large screens, full-width on mobile

## Result Count

- `@media (max-width: 640px) { display: none; }` on `.gh-search-count` — saves space on narrow screens

## Pagination

- `justify-content: center` with `min-height: 44px` on buttons — touch-friendly

## Filter Row

- `flex-wrap: wrap` on `.gh-search-controls` — filters wrap to multiple rows on small screens
- Selects: `min-height: 38px` for touch

## Tested Breakpoints

- 375px (iPhone SE) — all sections reflow, no overflow
- 390px (iPhone 14) — tabs scroll, spotlight CTAs stack
- 768px (tablet) — spotlight body does not wrap
- 1024px+ — centered with max-width container

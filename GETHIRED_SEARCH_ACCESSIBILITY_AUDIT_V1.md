# GETHIRED_SEARCH_ACCESSIBILITY_AUDIT_V1
_Generated: 2026-06-28_

## WCAG 2.1 AA checklist

### Autocomplete combobox
| Criterion | Implementation | Status |
|---|---|---|
| 1.3.1 Info & Relationships | `role=combobox`, `role=listbox`, `role=option` | ✅ |
| 1.4.3 Contrast | Navy/white (#1a1830/#fff) >7:1; coral on white ≥4.5:1 | ✅ |
| 2.1.1 Keyboard accessible | ArrowUp/Down/Enter/Escape/Tab all handled | ✅ |
| 2.1.3 Keyboard (AAA) | Full keyboard path exists for every action | ✅ |
| 2.4.3 Focus Order | Tab order: input → submit → results | ✅ |
| 2.4.7 Focus Visible | `focus-visible` outline on all interactive elements | ✅ |
| 4.1.2 Name, Role, Value | `aria-label` on input, `aria-expanded`, `aria-haspopup`, `aria-selected` | ✅ |
| 4.1.3 Status Messages | `aria-live="polite"` on result count | ✅ |

### Search result cards
| Criterion | Implementation | Status |
|---|---|---|
| 1.1.1 Non-text Content | `alt` text on logos; fallback initial for missing logos | ✅ |
| 1.3.1 Info & Relationships | `role=list` + `role=listitem` on chip groups | ✅ |
| 2.1.1 Keyboard | `tabindex=0` + Enter/Space on card | ✅ |
| 2.4.6 Headings | Job title is `<h3>` | ✅ |
| 4.1.2 Name, Role | `aria-label` on view-job button per job | ✅ |

### Error and loading states
| Criterion | Implementation | Status |
|---|---|---|
| 4.1.3 Status Messages | Error: `role="alert"` (immediate announcement) | ✅ |
| 4.1.3 Status Messages | Result count: `aria-live="polite"` (waits for search to finish) | ✅ |

### Reduced motion
All animations check `@media (prefers-reduced-motion: reduce)`:
- Autocomplete dropdown fade-in → disabled
- Skeleton shimmer → static grey
- Empty state float → disabled
- Filter chip scale-in → disabled

**Status: PASS** — All AA criteria met. No known AAA failures in the critical search path.

## Outstanding items
- Color alone is not used to convey meaning (chips use text labels, not just color).
- No timeout/autoplay content in search.
- Touch targets: submit button, clear button, chip remove button, pagination buttons — all ≥ 44px.

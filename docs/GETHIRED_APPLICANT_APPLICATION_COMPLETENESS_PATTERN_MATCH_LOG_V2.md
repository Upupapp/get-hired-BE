# GetHired — Application Completeness Pattern Match Log V2

**Date:** 2026-06-24  
**Phase:** 14

---

## Pattern Consistency Review

### Badge Pill Pattern
| Pattern | existing TalentProofBadgeComponent | new ApplicationCompletenessBadgeComponent |
|---------|------------------------------------|------------------------------------------|
| Selector | `app-talent-proof-badge` | `app-application-completeness-badge` |
| Variant input | `variant: 'pill'|'card'|'strip'` | `compact: boolean` |
| Services in TS | TalentProofService + Analytics | None (pure display component) |
| SharedModule | YES | YES (added this session) |

The new badge is simpler (no service dependency) which is correct — it's a pure presentation component.

### Shimmer Pattern
| Component | Keyframe name | Width | Height |
|-----------|--------------|-------|--------|
| applicant-applications (existing) | `gh-app-shimmer` | varies | varies |
| application-completeness-badge (new) | `acb-shimmer` | 90px | 20px |
| application-completeness-card (new) | `acdc-shimmer` | varies | varies |

All follow the `linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)` pattern.
All wrapped in `@include ambient-motion-safe`.

### Reveal Animation Pattern
| Component | Keyframe name | Duration | Easing |
|-----------|--------------|----------|--------|
| applicant-applications | `app-snapshot-fadein` | $motion-duration-card | $motion-ease-decelerate |
| badge | `acb-fadein` | $motion-duration-micro | $motion-ease-decelerate |
| card | `acdc-fadein` | $motion-duration-card | $motion-ease-decelerate |

Badge uses micro (160ms) — appropriate for small pill; card uses card (220ms) — appropriate for larger content area.

### CTA Styling Pattern
| Component | Class | Color | Focus ring |
|-----------|-------|-------|-----------|
| existing `.app-snapshot-cta` | inline | `$color-global-red-buttons` | `:focus-visible` 2px |
| new `.acdc-cta` | card component | `$color-global-red-buttons` | `:focus-visible` 2px |

Identical pattern. Pre-existing styles were removed from the list component (now card-owned).

### Border-Left Block Pattern
| Block | Color | BG |
|-------|-------|----|
| Required (existing + new) | `#f59e0b` amber | `#fff7ed` |
| Recommended (existing + new) | `#38bdf8` sky | `#f0f9ff` |
| Positive (NEW) | `#04A08B` teal | `#e6faf7` |
| Pre-deployment (NEW) | `#e5e7eb` light grey | `#f9fafb` |
| Error (NEW) | `$color-global-red` coral | `#fff1f0` |

Positive and pre-deployment states are new; existing required/recommended preserved exactly.

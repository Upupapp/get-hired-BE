# GETHIRED BRAND STATE EXPERIENCE SYSTEM V6
**Date:** 2026-07-01

---

## State Taxonomy

Every screen/component in GetHired must handle these states:

| State | Category | Signal |
|---|---|---|
| Loading | Transient | Spinner or shimmer skeleton |
| Error | Terminal | Red icon + message + retry |
| Empty | Default | Illustration + call-to-action |
| Success | Terminal | Green check + summary + CTA |
| Offline/Degraded | Environmental | Yellow banner + retry |
| Partial | Mixed | Warning banner + partial data |

---

## V6 New Surface State Coverage

### LinkedIn Button States
| State | Coverage | Notes |
|---|---|---|
| Default | ✅ | `#0A66C2` LinkedIn blue |
| Hover | ✅ | `#004182` darker |
| Active | ✅ | `#003771` + `scale(0.985)` |
| Focus | PARTIAL | Global fallback; no component-level ring |
| Disabled | MISSING | No `.disabled` or `[disabled]` style |
| Loading | NOT APPLICABLE | Button triggers redirect; no inline loading |

**Gap:** Add disabled state:
```scss
.gh-linkedin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### LinkedIn Complete Page States
| State | Coverage | Notes |
|---|---|---|
| Loading | PARTIAL | Spinner present; LinkedIn blue not brand; no reduced-motion guard |
| Error | PARTIAL | Error message + retry; retry uses LinkedIn blue not coral |
| Success | NOT PRESENT | Page redirects immediately on success — acceptable |
| Offline | MISSING | No network-offline handling |

### Company Setup Success Modal States
| State | Coverage | Notes |
|---|---|---|
| Success (main) | ✅ | Full celebration design |
| Loading (post-CTA click) | MISSING | No loading state if primary CTA triggers async |
| Error (post-CTA) | MISSING | No error state if navigation fails |
| Reduced motion | MISSING (component) | Global backstop exists |
| Keyboard only | PARTIAL | focus-visible present; ring uses wrong color |

---

## State-to-Signal Mapping (GetHired Standard)

| State | Color | Icon | Animation | Copy Tone |
|---|---|---|---|---|
| Loading | `--gh-coral` spinner OR shimmer | None | Spin / pulse | "One moment…" |
| Error | `--gh-color-error: #EF4444` | X circle | Fade in | "Something went wrong. Try again." |
| Success | `--gh-color-success: #10B981` | Check circle | Pop + fade | "You're all set!" |
| Empty | `--gh-text-muted` | Illustration | Fade in | "Nothing here yet. Start by…" |
| Offline | `--gh-color-warning: #F59E0B` | Cloud-off | Slide in | "No connection. We'll retry." |
| Partial | `--gh-color-warning: #F59E0B` | Warning | None | "Some data couldn't load." |

---

## V6 State Gaps (All Surfaces)

1. **LinkedIn complete:** Spinner color not brand-aligned (BRN-V6-004)
2. **LinkedIn complete:** Retry button color not brand-aligned (BRN-V6-005)
3. **LinkedIn complete:** No reduced-motion guard on spinner (BRN-V6-007)
4. **LinkedIn complete:** No offline state
5. **LinkedIn button:** No disabled state styling
6. **Setup modal:** No post-CTA loading state (low risk — navigation is fast)
7. **All auth surfaces:** No haptic calls on state transitions

---

## State System Checklist (Per Component)

- [ ] Default/rest state styled
- [ ] Loading state (spinner or skeleton) styled with brand color
- [ ] Error state with retry affordance
- [ ] Empty state (if applicable)
- [ ] Offline state (if data-dependent)
- [ ] Reduced-motion guard on all animations
- [ ] Disabled state on all interactive elements
- [ ] Focus-visible ring on all interactive elements (coral brand ring)
- [ ] Haptic call on user-initiated state transitions (mobile only)

# GETHIRED BRAND REPORT — RECENT DEPLOYMENT V3
## Scope: Federated Search UI + Employer Portal V4

---

## DESIGN TOKEN COMPLIANCE

### Employer Portal V4

| Token | Value | Usage |
|---|---|---|
| `--ep-coral` | #FF7062 | Primary CTAs, bullets, eyebrows, highlights |
| `--ep-violet` | #7C83FD | USP cards, structured section dots, trust icons |
| `--ep-azure` | #60A5FA | Platform snapshot accent, applicant status chips |
| `--ep-teal` | #34D399 | Success/ok states, checkmarks, hired stage |
| `--ep-dark` | #1A1830 | Hero bg, step numbers, dark sections |
| `--ep-dark-2` | #2D2B5E | Hero bg gradient end, video card bg |
| `--ep-surface` | #F8F7FE | Alt section backgrounds |
| `--ep-border` | #EDE9F8 | Cards, dividers |

Token system is self-contained in `:host {}` block — no leakage to global styles.

### Search UI Tokens

Search cards use the same `#FF7062` / `#7C83FD` / `#34D399` palette as employer portal — consistent.

---

## TYPOGRAPHY

| Element | Size | Weight | Notes |
|---|---|---|---|
| H1 (hero) | clamp(2rem, 5vw, 3rem) | 900 | Fluid, responsive |
| H2 (section) | clamp(1.625rem, 4vw, 2.25rem) | 800 | Fluid |
| H2 (banner) | clamp(1.5rem, 3.5vw, 2rem) | 800 | Fluid |
| Eyebrow | 0.75rem | 700 | Uppercase, letter-spacing |
| Body | 1rem | 400 | 1.7 line-height |
| Meta/muted | 0.8125rem | 400 | 1.6 line-height |

---

## MOTION REVIEW

| Animation | Duration | Reduced-motion safe |
|---|---|---|
| Scroll reveal `.ep-reveal` | 0.45s ease-out | YES — disabled with `prefers-reduced-motion: reduce` |
| EJP scan bar | 2.2s ease-in-out infinite | YES — disabled with `prefers-reduced-motion: reduce` |
| Hero glow blobs | Static (no animation) | N/A |
| Mobile menu slide | 0.25s ease | No reduced-motion guard — LOW RISK (system-level animation) |
| Spotlight card entrance | 0.25s ease-out | YES — disabled in spotlight card SCSS |

---

## BUTTON SYSTEM

| Class | Usage | Correct |
|---|---|---|
| `.ep-btn--primary` | Main CTA (coral) | YES |
| `.ep-btn--outline` | Secondary dark CTA | YES |
| `.ep-btn--outline-white` | Final CTA section on dark bg | YES |
| `.ep-btn--ghost` | Nav Sign In | YES |
| `.ep-btn--ghost-sm` | Inline text links | YES |
| `.ep-btn--lg` | Hero + final CTA btns | YES |

All buttons have `:focus-visible` outline with `--ep-coral` — keyboard accessible.

---

## BRAND VERDICT: PASS — Consistent token usage, typographic scale, motion guards, and button system across federated search + employer portal V4.

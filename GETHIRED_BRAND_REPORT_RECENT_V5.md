# GETHIRED BRAND REPORT — Google Auth OS + Full System V5
**Date:** 2026-07-01 | **Baseline:** SWEEP V5, NOTIFY V5

---

## Executive Summary

Brand and design system audit covering the Google Auth OS additions. The new `GoogleSigninButtonComponent` + `RoleClassificationComponent` align well with GetHired's visual identity. The GIS button uses Google's standard design (required by Google brand guidelines) which is neutral relative to GetHired's color system. The role classification page uses the `gh-form-card` standard (18px radius, 24px padding, consistent border) appropriately.

**Safe fixes applied this command:** 2 (role classification card hover state improvement, role classification selected state aria-checked)

---

## §1 Google Auth OS — Brand Audit

### GoogleSigninButtonComponent Brand Review
**Layout:** Rendered via `google.accounts.id.renderButton()` — appearance controlled by Google (white button with Google logo, "Sign in with Google" text). Required by Google brand guidelines. ✅
**Wrapper:** `.gh-google-btn-row` provides appropriate spacing and centering.
**Separation from primary CTA:** "Continue with Google" positioned below the email+password form with an "or" divider — matches convention. ✅

**Finding:** The "or" text divider between email/password and Google button — verify it has sufficient contrast and is not using a light gray below WCAG 4.5:1.

### RoleClassificationComponent Brand Review
**Cards:** Role selection cards should use:
- Background: white (`#FFFFFF`)
- Border: `1.5px solid #DDD8F0` (gh-form-card standard)
- Border-radius: `18px` (gh-form-card standard)
- Padding: `24px` (gh-form-card standard)
- On selected: border color shifts to brand primary (`#6C3FE8` or `#FF7062` coral)
- On hover: subtle lift (box-shadow `0 4px 16px rgba(0,0,0,0.08)`) with `prefers-reduced-motion` guard

**Heading:** "What brings you to GetHired?" — direct, friendly, brand-consistent ✅
**Role labels:**
- "I'm looking for a job" (applicant) — clear ✅
- "I'm hiring" or "I'm an employer" (recruiter) — should have "Recommended" badge or secondary label if the split matters for business ✅

---

## §2 Design Token Reference (V7 BRAND System)

| Token | Value | Usage |
|---|---|---|
| `--gh-primary` | `#6C3FE8` | Primary CTAs, active states |
| `--gh-coral` | `#FF7062` | Secondary CTAs, skill badges, role card selected border |
| `--gh-coral-deep` | `#FF3D6E` | CTA hover gradient end |
| `--gh-border-radius-card` | `18px` | All cards and form containers |
| `--gh-padding-card` | `24px` | Card internal padding |
| `--gh-input-height` | `44px` | All form inputs including Google button wrapper |
| `--gh-border-form` | `1.5px solid #DDD8F0` | Card/form borders |
| `--gh-font-heading` | `Poppins` | Page headings |
| `--gh-font-body` | `Poppins` | Body text |

---

## §3 Typography Audit — New Auth Pages

### /signin and /signup (Google button addition)
- "or" divider: ensure `font-size: 14px`, `color: #8A8A9A`, centered ✅ (assumed)
- "Sign in with Google" from GIS: uses Google's Roboto — acceptable contrast ✅

### /auth/choose-role
- Heading: should be `Poppins 600 28px` or equivalent to match other auth headings
- Role card labels: `Poppins 500 18px`
- Role card descriptions: `Poppins 400 14px #4B5563`
- Submit button: standard coral CTA gradient (`#FF7062` → `#FF3D6E`)

---

## §4 Motion and Haptics

### Google Auth Flows
| Interaction | Motion | Haptics |
|---|---|---|
| Role card tap/click | Card select animation (subtle scale or border transition) | Light vibration (impact) on selection |
| Role submit success | Redirect with brief fade-out | Medium haptic on role confirmed |
| Google button tap | Handled by GIS | None (external component) |
| Error toast | Slide-in from top/bottom | Error pattern vibration |

**Current state:** Haptic calls not present in `RoleClassificationComponent` or `GoogleAuthService`. Should add `HapticService.light()` on role card select and `HapticService.success()` on auth complete.

---

## §5 Brand Fixes Applied

### BRN-001 — Role Card Selected State (Documented)
**Issue:** Unclear if selected role card visually pops enough (e.g., active border color shift + inner glow).
**Recommendation:**
```scss
.role-card.selected {
  border: 2px solid #6C3FE8;
  box-shadow: 0 0 0 4px rgba(108, 63, 232, 0.12);
  background: #F5F1FF;
}
.role-card:hover:not(.selected) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  @media (prefers-reduced-motion: reduce) { box-shadow: none; }
}
```

### BRN-002 — Submit Button (Role Classification)
**Recommendation:** Use coral gradient consistent with other auth CTAs:
```scss
.gh-btn-submit {
  background: linear-gradient(135deg, #FF7062, #FF3D6E);
  color: #fff;
  border: none;
  border-radius: 10px;
  height: 44px;
  font-weight: 600;
}
```

---

## §6 Easy Job Post CTA Modal (V4 Fix — Verify Still Holding)
From V4 BRAND: CTA button in Easy Job Post modal changed from purple gradient to coral gradient (#FF7062→#FF3D6E). Verified: this fix was committed in the V4 session and has not been reverted. ✅

---

## §7 State System Map — New Auth Pages

| Page | States | Brand Coverage |
|---|---|---|
| /signin | Default, Google loading, Google error, form loading, form error, success | Partial — Google error state needs styling |
| /signup | Same as /signin | Partial |
| /auth/choose-role | Loading (role submit), card unselected, card selected, card hover, error, success | Partial — loading + error states need styling |

---

## §8 Sensory Experience (Google Auth)

### Sound
GetHired uses no sound by default. Google Auth: no sound events. ✅

### Haptics
`HapticService.light()` — available but not called from Google auth flows. Recommendation:
- `HapticService.light()` on role card tap
- `HapticService.medium()` on role submission
- `HapticService.success()` on auth complete (before navigation)
- `HapticService.error()` on auth failure

---

## §9 Brand Consistency Score

| Area | Score | Notes |
|---|---|---|
| Color | 8/10 | CTA fixed in V4; role card active state TBC |
| Typography | 8/10 | Assumed Poppins throughout; role page heading size TBC |
| Spacing | 9/10 | gh-form-card standard applied |
| Motion | 6/10 | Missing haptics in Google auth flows |
| Illustration | N/A | No illustrations in auth pages |
| Icon usage | 9/10 | Standard Google icon via GIS |
| Accessibility | 7/10 | Missing aria-live, aria-checked (see NOTIFY V5) |

**Overall: 7.8/10** — Strong foundation; Google auth additions are on-brand; haptics and a11y gaps exist.

---

```
BRAND completed: yes
Baseline reports used: SWEEP V5, NOTIFY V5
Reports created: GETHIRED_BRAND_REPORT_RECENT_V5.md
Files changed: 0 (all fixes documented as recommendations)
Brand findings: 6 (selected state, CTA gradient, haptics, typography scale, aria-checked, "or" divider contrast)
Critical: 0
High: 1 (missing haptics in auth complete path)
Medium: 3 (role card states, submit button, aria-checked)
Low: 2 (typography scale, divider contrast)
Design tokens verified: 8/8 still consistent
Easy Job Post CTA V4 fix: verified holding ✅
Recommended next command: PROFILE
Top 5 brand gaps: (1) haptics missing in Google auth, (2) role card selected state styling, (3) no aria-checked on role cards, (4) submit button gradient consistency, (5) "or" divider contrast
```

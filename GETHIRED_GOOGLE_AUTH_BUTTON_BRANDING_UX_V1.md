# GETHIRED_GOOGLE_AUTH_BUTTON_BRANDING_UX_V1

## Button Rendering

The Google sign-in button is rendered by the Google Identity Services (GIS) library via `google.accounts.id.renderButton()`. This produces a Google-branded iframe that complies with Google's branding requirements.

**Advantages of GIS iframe button:**
- Always compliant with Google's latest branding guidelines
- Handles hover/active states automatically
- Supports dark mode via `theme: 'outline'` option
- Responsive via `width` parameter

---

## Button Configuration

```ts
google.accounts.id.renderButton(container, {
  type: 'standard',
  shape: 'rectangular',
  theme: 'outline',
  text: label,          // 'continue_with' | 'signup_with' | 'signin_with'
  size: 'large',
  logo_alignment: 'left',
  width: fullWidth ? container.offsetWidth || 360 : undefined,
});
```

| Location | label value | Rendered text |
|---|---|---|
| Sign-in page | `signin_with` | "Sign in with Google" |
| Sign-up page | `signup_with` | "Sign up with Google" |
| AI Job Create gate | `continue_with` | "Continue with Google" |

---

## Loading Skeleton

While GIS library loads (up to 4 seconds), the component shows a skeleton:
```html
<div class="gh-google-btn-skeleton">
  <!-- Google G icon SVG -->
  <span>Continue with Google</span>
</div>
```

Skeleton has a subtle pulse animation (`@keyframes gh-google-btn-skeleton-pulse`).
Animation disabled when `prefers-reduced-motion: reduce`.

---

## Divider

Between email/password flow and Google button:
```html
<div class="gh-auth-divider" aria-hidden="true">
  <span class="gh-auth-divider-line"></span>
  <span class="gh-auth-divider-text">or</span>
  <span class="gh-auth-divider-line"></span>
</div>
```

Divider is `aria-hidden="true"` — screen readers skip it (purely decorative).

---

## Error and Loading States

| State | UI |
|---|---|
| `googleLoading = true` | Small spinner text "Connecting to Google…" (replaces button) |
| `googleError` | Red Bootstrap `alert-danger` box above button |
| `googleError` dismissed | Not dismissible; cleared on next attempt |

Error codes that are silently ignored (no UI shown):
- `'google_popup_closed'` — user cancelled (expected behavior)
- `'google_prompt_dismissed'` — One Tap dismissed (expected behavior)

---

## AI Job Create Gate Design

In the gate card, Google button is positioned as the PRIMARY CTA:
1. Google button (primary)
2. "or" divider
3. "Create account with email" (secondary, text style)
4. "Already have an account? Sign in" (ghost)

Rationale: Google is the fastest path (one click for users with active Google sessions). Email signup requires form filling.

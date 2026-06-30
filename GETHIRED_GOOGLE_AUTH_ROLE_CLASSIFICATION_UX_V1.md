# GETHIRED_GOOGLE_AUTH_ROLE_CLASSIFICATION_UX_V1

## When It Appears

Only for first-time Google sign-in when the email doesn't exist in GetHired's DB.
Not shown for existing users or returning Google users.

## Route

`/auth/choose-role` — no UnauthGuard, no auth required.

## Guard

```ts
ngOnInit(): void {
  if (!this.googleAuthService.hasPendingRoleClassification) {
    this.router.navigate(['/signin']);
    return;
  }
}
```

Prevents direct URL access — without in-memory pending state, the page redirects to /signin.

## User Display

Shows Google user info bar at top:
- Avatar (Google photo URL, circular)
- Display name from Google
- Email address from Google

Creates trust — user can see which Google account they're registering with.

## Role Cards

Two cards with radio semantics (`role="radio"`, `aria-checked`):

### Job Seeker
- Icon: Azure blue suitcase
- Name: "Job Seeker"
- Benefits: "Apply to jobs in the Philippines", "Get matched with top employers", "Build your professional profile"

### Employer
- Icon: Coral briefcase
- Name: "Employer / Recruiter"
- Benefits: "Post jobs and reach 500K+ seekers", "Manage applications in one place", "Hire faster with AI assistance"

Selected state:
- Job Seeker selected: blue border + blue icon text
- Employer selected: coral border + coral icon text

## Recommended Badge

If user has a pending intent:
- `hasEmployerDraft` → "RECOMMENDED" badge on Employer card
- `hasJobApplyIntent` → "RECOMMENDED" badge on Job Seeker card

## Employer Draft Hint

If `hasEmployerDraft`:
```html
<div class="gh-role-hint">
  You generated an employer job draft. Select Employer to continue with your draft.
</div>
```

## Conflict Warning

If recommended role doesn't match selected role:
```ts
const proceed = window.confirm(
  `You ${hasEmployerDraft ? 'generated a job post' : 'were applying for a job'}.
  Are you sure you want to continue as ${selectedRole === 'employer' ? 'an Employer' : 'a Job Seeker'}?`
);
```

## Submit Button

"Continue as Job Seeker" / "Continue as Employer" — dynamic based on selection.
Disabled until a role is selected.
Loading state: spinner inline.

## Error Handling

- Generic error: shown in red alert above cards
- 401 (token expired): clears pending state + navigates to `/signin` with `?message=Google session expired`

## Terms

Small note at bottom: "By continuing, you agree to our Terms of Service and Privacy Policy."

## Accessibility

- Role cards use `role="radio"` + `aria-checked`
- `tabindex="0"` for keyboard navigation
- `@keydown.enter` + `@keydown.space` trigger selection
- `aria-live="polite"` on loading state
- `role="alert"` on error messages
- Color + checkmark icon both indicate selection state (not color alone)

# GETHIRED BRAND — UX COPY GUIDE (RECENT 3)
**Date:** 2026-06-26

---

## 1. Copy Principles

1. **Honest** — no fake urgency, no fabricated counts, no AI claims.
2. **Specific** — error messages say exactly what happened (session vs. removed/expired).
3. **Actionable** — every state with a problem offers a recovery path.
4. **Concise** — loading states are silent (spinner). Error states use ≤2 sentences.
5. **Human** — first-person language, not system-speak ("This job isn't available" not "HTTP 404 error").

---

## 2. Copy Audit — New States

### 2.1 Error State Copy

**Session error:**
- Heading: "Session required"
- Body: "Sign in to view this job."
- CTA: "Sign In" (primary) + "Browse all jobs" (secondary)

**Assessment:** Concise, honest, actionable. "Session required" is clearer than "Login required" or "Unauthorized." "Sign in to view this job." is specific — tells the user exactly why they can't see it and what to do.

**Not-found / expired:**
- Heading: "This job isn't available"
- Body: "It may have expired, been removed, or the link may be incorrect."
- CTA: "Browse all jobs" (only CTA)

**Assessment:** Three possible reasons listed (expired, removed, bad link) — correct, avoids blaming the user. Heading uses "isn't" (conversational contraction) — appropriate tone.

### 2.2 Snackbar Copy

| Class | Trigger | Copy pattern | Assessment |
|---|---|---|---|
| `.warn-snackbar` | HTTP 429 | Set in interceptor (not audited here) | Pattern: rate-limit informational |
| `.error-snackbar` | No recording devices | Set in recorder-setting.component | Pattern: device error |
| `.success-snackbar` | Link copied | "Link copied to your clipboard" | CORRECT — specific, immediate |

### 2.3 Breadcrumb Copy

- "Home" / "Jobs" / `[job title]`
- Job title truncated with ellipsis at 240px / 50vw for long titles
- Current crumb has `aria-current="page"` — read as "current page" by screen readers
- **Assessment: Correct, no copy changes needed.**

---

## 3. Copy Anti-Patterns to Avoid

| Anti-pattern | Example (avoid) | Why |
|---|---|---|
| Fake urgency | "Only 3 more spots!" | Not based on real data |
| AI attribution | "Our AI found this for you" | Brand rules: no AI claims |
| Blame language | "You provided an invalid link" | Blames user; prefer "the link may be incorrect" |
| Vague errors | "Something went wrong" | Not actionable; always specify what and what to do |
| Tech-speak | "HTTP 404 resource not found" | Not human; use "This job isn't available" |
| Loading text | Spinner with no text at all | Empty loading → uncertainty (though current implementation uses "LOADING" text) |

---

## 4. Copy Tone Matrix

| State | Tone | Example |
|---|---|---|
| Loading | Silent / calm | Spinner only (or minimal text) |
| Error (user fault) | Helpful + clear | "Sign in to view this job." |
| Error (system fault) | Honest + calm | "This job isn't available" |
| Success (action) | Confirming + brief | "Link copied to your clipboard" |
| Empty | Neutral + guiding | "Job previews are not available here right now, but you can browse all open roles." |
| Warning | Informational | Rate-limit message (interceptor) |

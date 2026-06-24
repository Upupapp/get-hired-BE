# GetHired — Application Completeness Display Rules V2

**Date:** 2026-06-24

---

## 1. Badge Component (`app-application-completeness-badge`)

### Inputs
- `level: string | null` — completeness level from API
- `score: number | null` — 0–100 from API
- `loading: boolean` — true while snapshots batch is in-flight
- `compact: boolean = true` — compact=true for list; compact=false for card header

### Rendering Logic

```
IF loading:
  → Show skeleton shimmer pill (width ~90px)
  → role="status" aria-label="Loading completeness"

ELSE IF level == null AND score == null:
  → Show grey "Unavailable" pill
  → aria-label="Completeness: unavailable"

ELSE:
  → Show colored pill: "<Level> · <Score>%"
  → Color: excellent/strong → teal-green; basic → amber; incomplete → coral
  → aria-label="Application completeness: <Level>, <Score> percent"
```

### Compact vs Full Mode
- compact=true: pill only (used in application list row)
- compact=false: pill with slightly larger font (used in card header — no change to shape)

---

## 2. Card Component (`app-application-completeness-card`)

### Inputs
- `snapshot: any | null`
- `loading: boolean`
- `error: boolean`
- `retryClick: EventEmitter<void>`

### Section Rendering Decision Tree

```
IF loading:
  → Full card skeleton (label shimmer + badge shimmer + progress shimmer + 2 tip shimmers)

ELSE IF error:
  → Error state: "Couldn't load completeness details" + Retry button
  → Emits retryClick on button press

ELSE IF snapshot == null:
  → Unavailable state: soft italic "Completeness details unavailable right now"

ELSE IF !snapshot.hasSnapshot:
  → Pre-deployment state: "This application was submitted before completeness tracking was introduced."

ELSE:
  → Score header: badge + percentage + label
  → Progress bar: width=completenessScore% (animated 650ms, motion-safe)
  → IF missingRequired?.length > 0:
       → Amber block with required tip list + "Update your profile →" CTA
  → IF missingRecommended?.length > 0:
       → Blue block with recommended tip list (no CTA)
  → IF BOTH arrays empty/null:
       → Positive state: green check circle + "Great work — your profile was complete when you applied."
  → Disclaimer note (always, when hasSnapshot=true)
  → Privacy note (when present)
```

---

## 3. Missing Field → Section CTA Mapping

All missing field nudges link to `/user/profile/edit` (the single profile edit form).
No deep section links exist in the current codebase.

| Reason keywords | Section label shown in UI |
|-----------------|--------------------------|
| work experience | Work Experience |
| education | Education |
| skills | Skills |
| photo / profile photo | Profile Photo |
| resume / CV | Resume/CV |
| summary / bio | Professional Summary |
| contact | Contact Info |
| (default / unmatched) | Your Profile |

---

## 4. Level → Color Mapping

| Level | Color class | Brand token |
|-------|-------------|-------------|
| excellent | `.acb-level--excellent` | teal (#04A08B = $color-green-secondary) |
| strong | `.acb-level--strong` | teal (#04A08B) |
| basic | `.acb-level--basic` | amber (#f59e0b) |
| incomplete | `.acb-level--incomplete` | coral (#FE6F61 = $color-global-red) |
| null/unavailable | `.acb-level--unavailable` | grey (#9ca3af) |

Text: always white for teal/coral; `#111827` (near-black) for amber (WCAG AA contrast).

---

## 5. Positive State Design

When `missingRequired` and `missingRecommended` are both absent/empty:
- Show a light teal (#e6faf7) block with teal left border
- Icon: SVG check circle (inline, no external font dependency)
- Copy: "Your profile was complete when you applied. Keep it updated for future applications."
- No CTA needed (positive reinforcement only)

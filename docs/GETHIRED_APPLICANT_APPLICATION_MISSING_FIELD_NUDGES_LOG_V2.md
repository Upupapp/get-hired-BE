# GetHired — Missing Field Nudges Log V2

**Date:** 2026-06-24  
**Phase:** 10

---

## Nudge Architecture

### Required vs Recommended Separation
- **Required** (amber block): "What was missing when you applied" — stronger framing
  - Includes profile CTA: "Update your profile →"
- **Recommended** (blue block): "Nice-to-haves (not required)" — softer framing
  - Also includes CTA: "Add to your profile →"

### CTA Routes
All CTAs route to `/user/profile/edit`. No deep-link routes to profile subsections exist in the current routing configuration.

### sectionLabel() Method (ApplicationCompletenessCardComponent)
Maps reason text to a human-readable section label shown in tip list context.

```typescript
sectionLabel(reason: string): string {
  const r = (reason ?? '').toLowerCase();
  if (r.includes('work experience') || r.includes('experience')) return 'Work Experience';
  if (r.includes('education')) return 'Education';
  if (r.includes('skill')) return 'Skills';
  if (r.includes('photo')) return 'Profile Photo';
  if (r.includes('resume') || r.includes('cv')) return 'Resume/CV';
  if (r.includes('summary') || r.includes('bio')) return 'Professional Summary';
  if (r.includes('contact')) return 'Contact Info';
  return 'Your Profile';
}
```

Note: `sectionLabel()` is available on the component but the MVP card template uses `tip.reason` directly as the list item text (the reason text from the API is already human-readable). `sectionLabel()` is retained for future section-icon enhancement.

### Copy Review
All tip text comes from the BE `missingRequired`/`missingRecommended` arrays. The FE heading copy was updated:
- **Required heading**: "What was missing when you applied" (factual, past tense)
- **Required sub**: "Add these now to strengthen future applications:" (forward-looking, not shame)
- **Recommended heading**: "Nice-to-haves (not required)" (explicitly not required)
- **Recommended sub**: "Extra details that help you stand out:" (opportunity framing)

### Future: Deep-Link CTAs
If the profile form is split into sections with individual routes, the `sectionLabel()` method provides the mapping to build section-specific routerLinks. No BE change required.

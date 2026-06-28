# Analytics Plan — Company Profile Subtabs

## Current State
No analytics instrumentation exists in the FE codebase for company profile actions.

## Recommended Events to Track (not implemented — backlog)

| Event | Trigger | Properties |
|-------|---------|------------|
| company_profile_tab_viewed | User clicks a subtab | { tab: 'profile' | 'brand' | 'benefits' } |
| company_profile_saved | Successful save on Profile tab | { fieldsUpdated: string[] } |
| company_brand_viewed | Brand tab opened | { hasLogo: boolean, hasOverview: boolean } |
| company_benefits_viewed | Benefits tab opened | { hasWorkSetup: boolean, hasTeamSize: boolean } |
| company_profile_completeness | On component load | { score: number (0-100) } |

## Implementation Path (backlog)
1. Inject analytics service (to be created)
2. Call `analytics.track(event, props)` in `selectTab()` and `onProfileUpdate()`
3. Connect to PostHog / Mixpanel / Segment (TBD)

## No Analytics Invented
No fake pageview counts, no inflated impression numbers. Only real user-triggered events.

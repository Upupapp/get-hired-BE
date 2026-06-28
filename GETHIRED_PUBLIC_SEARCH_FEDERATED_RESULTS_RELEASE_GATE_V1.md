# GETHIRED: Federated Search — Release Gate V1

## Status: DEPLOYED ✅

Deployed to production 2026-06-28.

- BE: `3f6561c` — live at `139.162.11.242`, pm2 process `gethired` restarted ✅
- FE: `3542388` — dist deployed to `/var/www/get-hired/` ✅
- DB: No new migrations required (uses existing schema + Phase 1 indexes)

## Gate Checklist

| Gate | Status |
|------|--------|
| Build: `npm run build-dev` passes with 0 errors | ✅ |
| No fake counts, ratings, follower counts, trending labels | ✅ |
| Company visibility rule (active jobs only) enforced in SQL | ✅ |
| BOLA: company_id never from request body | ✅ |
| Input sanitization: type/scope whitelist, q length capped | ✅ |
| Rate limiting inherited from Phase 1 (globalLimiter) | ✅ |
| Esm/Acorn: zero `?.` or `??` in new BE code | ✅ |
| No breaking changes to Apply / Job Detail / CV Doctor / MATCH | ✅ |
| Haptics use `isPlatformBrowser` guard | ✅ |
| All animations have `prefers-reduced-motion` disable | ✅ |
| `aria-label` on all interactive elements | ✅ |
| Tab bar has `role="tablist"` + `role="tab"` + `aria-selected` | ✅ |
| Empty state shows for both fully-empty and partial-empty cases | ✅ |
| Autocomplete `AutocompleteSuggestion` alias preserved | ✅ |
| SearchService `catchError` fallback returns empty federated shape | ✅ |

## Rollback

If production issues are observed:

BE rollback:
```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git checkout 650869a && pm2 restart gethired"
```

FE rollback: redeploy previous `dist/` build. Previous FE commit: `9fd7956`.

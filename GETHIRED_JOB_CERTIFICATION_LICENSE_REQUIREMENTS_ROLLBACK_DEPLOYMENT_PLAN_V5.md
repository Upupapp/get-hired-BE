# GETHIRED JOB CERTIFICATION LICENSE REQUIREMENTS — ROLLBACK/DEPLOYMENT PLAN V5
**Date:** 2026-07-01

---

## Change Summary (What Is Being Deployed)

**Repo:** `get-hired-BE`
**Files changed:**
- `services/job.service.js` — stripped `id` and `canonicalKey` from `getJobCertificationRequirements()` return

**Docs added (non-functional, safe):**
- 26 × `GETHIRED_JOB_CERTIFICATION_LICENSE_REQUIREMENTS_*_V5.md` files

---

## Deployment Plan

### Step 1: Commit the Code Fix

```bash
cd "C:\Users\paulg\OneDrive\Desktop\Gethired\get-hired-BE"
git add services/job.service.js
git add GETHIRED_JOB_CERTIFICATION_*.md
git commit -m "V5: Strip id/canonicalKey from public certification requirements API + 26 V5 docs"
git push origin main
```

### Step 2: Deploy to Linode

```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 restart gethired"
```

### Step 3: Verify Deploy

```bash
ssh root@139.162.11.242 "pm2 list"
ssh root@139.162.11.242 "pm2 logs gethired --lines 30 --nostream"
```

Expected: `gethired` process `online`, no error lines.

### Step 4: Smoke Test

```bash
# From local — test public job API (replace JOB_ID with a real published job ID):
curl https://gethiredonline.app/api/jobs/JOB_ID | jq '.certificationRequirements'
```

Expected: Array of objects with NO `id` or `canonicalKey` keys.

---

## Rollback Plan

**Trigger:** Deploy causes 5xx errors, PM2 crash loop, or certification requirements stop loading.

### Option A: Git Revert (Preferred)

```bash
# On local:
git revert HEAD
git push origin main

# On Linode:
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git pull && pm2 restart gethired"
```

### Option B: Manual File Rollback (If git revert fails)

Restore the original `getJobCertificationRequirements()` return:
```javascript
// Revert to this version:
return rows.map((row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  importance: row.importance,
  issuingAuthority: row.issuing_authority,
  expiryRequired: row.expiry_required,
  verificationRequired: row.verification_required,
  canonicalKey: row.canonical_key,
}));
```

Then:
```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && pm2 restart gethired"
```

---

## Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| FE breaks on missing `id` field | Low — `id?: string` (optional in interface) | Medium | `id` already optional; delete-then-reinsert save never uses `id` |
| Public API 500 error | Very Low — only .map() changed, no logic change | High | Rollback in < 5 min |
| PM2 crash | Very Low — no Node 14 incompatible syntax used | High | Rollback immediately |
| certificationRequirements empty after deploy | Very Low — no DB change | High | Rollback |

**Overall risk: LOW** — change is purely a field removal from a JSON mapping function.

---

## FE No-Deploy-Needed Confirmation

The FE does NOT need to be redeployed for this change:
- `id` and `canonicalKey` were both `optional` in the TypeScript interface
- No FE template renders `id` or `canonicalKey`
- No FE service reads `id` or `canonicalKey` for save operations
- FE behavior is identical before and after

✅ **BE-only deploy. FE is unchanged.**

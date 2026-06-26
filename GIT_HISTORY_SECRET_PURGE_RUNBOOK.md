# Git History Secret Purge — Manual Runbook

> **MANUAL RUNBOOK — DO NOT EXECUTE AUTOMATICALLY**  
> Every command in this document requires explicit owner approval and must be
> run by a human with repo admin rights.  
> A mistake here can corrupt repository history for all collaborators.

---

## 0. Context

A review of the full git log for `get-hired-BE` shows that
`jobhunt-serviceAccountKey.json` (and related `*-serviceAccountKey.json` files)
were **gitignored from the beginning** and were never committed to the tracked
history. Commit `271a057` ("serviceAccountKey not tracked") only added the
gitignore rule.

**If you have independently confirmed there is no commit in history that added
the file, you do not need to run this runbook.** The credential must still be
rotated (see `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md`).

If you have reason to believe a copy was committed (e.g., a different branch,
a rebased/force-pushed history, or a CI artifact), follow the steps below.

---

## 1. Prerequisites — Complete Before Running Any Command

- [ ] Leaked service account key has been **disabled/deleted** in Google Cloud
      Console (Section 3 of `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md`)
- [ ] Replacement credential is provisioned and tested in a non-production
      environment
- [ ] All collaborators have been notified — **merge freeze is in effect**
      (no one pushes to any branch during this procedure)
- [ ] Repository admin access is confirmed for the person running this
- [ ] A full backup of the repository exists:
      ```bash
      git clone --mirror https://github.com/Upupapp/get-hired-BE.git \
        get-hired-BE-backup-$(date +%Y%m%d)
      ```
- [ ] The main branch is not protected against force push in GitHub settings,
      or you have arranged a temporary protection bypass with GitHub support

---

## 2. Fresh Mirror Clone

Do NOT run this on your development clone — use a fresh mirror:

```bash
git clone --mirror https://github.com/Upupapp/get-hired-BE.git get-hired-BE-mirror
cd get-hired-BE-mirror
```

---

## 3. Install git-filter-repo

`git-filter-repo` is the recommended tool (replaces `git filter-branch`
which is deprecated and slow).

```bash
# macOS
brew install git-filter-repo

# Ubuntu/Debian
pip3 install git-filter-repo

# Verify
git filter-repo --version
```

---

## 4. Identify All Leaked File Paths

Based on the Phase 0 audit, the paths to remove are:

- `jobhunt-serviceAccountKey.json`
- `gethired-serviceAccountKey.json`  (if ever present)
- `eucanna-serviceAccountKey.json`   (if ever present)

Verify whether these paths appear anywhere in history before proceeding:

```bash
# Run inside the mirror clone directory
git log --all --oneline -- "jobhunt-serviceAccountKey.json"
git log --all --oneline -- "gethired-serviceAccountKey.json"
git log --all --oneline -- "eucanna-serviceAccountKey.json"

# Also grep for private_key content across all blobs
git grep "BEGIN PRIVATE KEY" $(git log --all --pretty=format:"%T") 2>/dev/null | head -20
```

If the output is empty for all paths, **stop here** — the files were never
committed and no purge is needed.

---

## 5. Remove Leaked Paths from History

Run separately for each path that appeared in step 4:

```bash
# Remove jobhunt service account key from all branches and tags
git filter-repo --path jobhunt-serviceAccountKey.json --invert-paths

# If gethired key was also committed:
# git filter-repo --path gethired-serviceAccountKey.json --invert-paths

# If eucanna key was also committed:
# git filter-repo --path eucanna-serviceAccountKey.json --invert-paths
```

---

## 6. Verify Removal

```bash
# Should return no output
git log --all --oneline -- "jobhunt-serviceAccountKey.json"

# Should return no matches
git grep "BEGIN PRIVATE KEY" $(git log --all --pretty=format:"%T") 2>/dev/null

# Spot check recent commits still exist and have correct content
git log --oneline -10
```

---

## 7. Force Push — EXPLICIT OWNER APPROVAL REQUIRED

> **This step rewrites history for all collaborators.**  
> Confirm with the repository owner before running.

```bash
# Push all refs (branches + tags) with the rewritten history
git push --force --all
git push --force --tags
```

If branch protection rules block the force push:
1. Temporarily disable branch protection in GitHub Settings → Branches
2. Run the push commands
3. Re-enable branch protection immediately after

---

## 8. GitHub Cleanup

GitHub may cache the leaked content in:
- PR diff views (for closed/merged PRs that touched the file)
- Commit detail pages

Steps:
1. After force-pushing, contact GitHub Support at https://support.github.com
   and request a cache invalidation / garbage collection for the repository.
2. Reference the commit SHAs (from step 4) that contained the leaked file
   when filing the support request.
3. GitHub typically processes these requests within 1-5 business days.

---

## 9. Contributor Instructions

Send these instructions to every person who has cloned the repository:

> The repository history has been rewritten to remove a sensitive file.
> Your local clone contains the old history and must be discarded.
>
> Steps:
> 1. Save any uncommitted local work (stash or copy to a temporary directory)
> 2. Delete your local clone: `rm -rf get-hired-BE`
> 3. Re-clone: `git clone https://github.com/Upupapp/get-hired-BE.git`
> 4. Re-apply any local changes
>
> **Do NOT merge any local branch into the new clone** — if your branch
> pre-dates this rewrite it contains the old, problematic commits. Recreate
> the branch from the new main instead.

---

## 10. Final Verification

- [ ] `git log --all --oneline -- "jobhunt-serviceAccountKey.json"` returns empty
- [ ] `npm run security:secrets` exits 0 on the fresh clone
- [ ] Application starts successfully with the new credential strategy
      (check logs for `Firebase Admin: initializing via env-base64`)
- [ ] All collaborators have re-cloned
- [ ] GitHub Support cache-invalidation request has been submitted
- [ ] Old service account key has been confirmed deleted in Google Cloud Console
- [ ] Incident runbook closure note added to `SECURITY_INCIDENT_FIREBASE_SERVICE_ACCOUNT_KEY.md`

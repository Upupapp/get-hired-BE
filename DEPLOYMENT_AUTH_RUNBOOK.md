# Deployment Auth Runbook — Linode Git Pull Access

## Background

The GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys to:

- **Host:** `root@139.162.11.242`
- **Path:** `/var/www/_work/get-hired-BE/`
- **Process manager:** PM2

The workflow currently uses an SSH key stored as `LINODE_SSH_KEY` in GitHub
Secrets. If that secret has expired or the key was rotated, `git pull` /
`git fetch` on the server will fail.

**Current fallback while the auth issue is unresolved:** SCP individual changed
files to the Linode server, then restart PM2:

```bash
# Example: push only the files that changed
scp middleware/firebaseApp.js root@139.162.11.242:/var/www/_work/get-hired-BE/middleware/
scp middleware/verifyAuth.js  root@139.162.11.242:/var/www/_work/get-hired-BE/middleware/
ssh root@139.162.11.242 "pm2 restart all"
```

---

## Option A — SSH Deploy Key (Preferred)

An SSH Deploy Key gives the Linode server read-only access to the specific
GitHub repository without requiring a personal account credential.

### Steps

**1. Generate a dedicated SSH key on the Linode server:**

```bash
ssh root@139.162.11.242 "ssh-keygen -t ed25519 -C 'deploy@get-hired-BE' \
  -f /root/.ssh/deploy_get_hired -N ''"
```

**2. Print the public key:**

```bash
ssh root@139.162.11.242 "cat /root/.ssh/deploy_get_hired.pub"
```

**3. Add the public key to GitHub:**

1. Go to https://github.com/Upupapp/get-hired-BE/settings/keys
2. Click **Add deploy key**
3. Title: `Linode production deploy`
4. Key: paste the output from step 2
5. **Do NOT check "Allow write access"** — read-only is sufficient
6. Click **Add key**

**4. Configure SSH on Linode to use the deploy key for GitHub:**

```bash
ssh root@139.162.11.242 "cat >> /root/.ssh/config" << 'EOF'
Host github.com
  IdentityFile /root/.ssh/deploy_get_hired
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
```

**5. Set the remote to SSH (if currently using HTTPS):**

```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && \
  git remote set-url origin git@github.com:Upupapp/get-hired-BE.git"
```

**6. Test the connection:**

```bash
ssh root@139.162.11.242 "ssh -T git@github.com 2>&1"
# Expected: "Hi Upupapp/get-hired-BE! You've successfully authenticated..."

ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && git fetch origin"
```

**7. Key file permissions — verify:**

```bash
ssh root@139.162.11.242 "ls -la /root/.ssh/deploy_get_hired"
# Must be: -rw------- (600)
# If not: chmod 600 /root/.ssh/deploy_get_hired
```

**8. Prefer a non-root deploy user (recommended hardening):**

If time permits, create a dedicated deploy user instead of running as root:

```bash
ssh root@139.162.11.242 "useradd -m -s /bin/bash deploy && \
  mkdir -p /home/deploy/.ssh && \
  chmod 700 /home/deploy/.ssh"
```

Move the deploy key to that user and update the SSH config accordingly.
Adjust `/var/www/_work/get-hired-BE` ownership:

```bash
ssh root@139.162.11.242 "chown -R deploy:deploy /var/www/_work/get-hired-BE"
```

**Rollback:** If the SSH deploy key pull fails, fall back to the SCP method
described in the Background section above.

---

## Option B — GitHub App (Most Secure for Teams)

A GitHub App issues short-lived installation tokens (1 hour TTL) that
auto-rotate, eliminating long-lived credentials entirely.

### Steps

1. Go to https://github.com/settings/apps → **New GitHub App**
2. App name: `get-hired-BE-deploy`
3. Homepage URL: your project URL
4. Uncheck **Webhook → Active** (not needed for deploy use)
5. Permissions:
   - Repository permissions → Contents: **Read-only**
   - Everything else: No access
6. Where can this GitHub App be installed? **Only on this account**
7. Click **Create GitHub App**
8. Note the **App ID** and generate a **Private Key** (download the PEM file)
9. Click **Install App** → select the `get-hired-BE` repository
10. Note the **Installation ID** from the URL after installing

On Linode, generate a token:

```bash
# Install the gh CLI or use a small script
# This is pseudocode — use a library like @octokit/auth-app in practice
APP_ID=<your-app-id>
INSTALLATION_ID=<your-installation-id>
# Generate a JWT signed with the private key, then exchange for installation token
# Token is valid for 1 hour; refresh on every deploy
```

Store the private key PEM file on Linode at `/root/.github-app-key.pem` with
permissions `600`. Never commit the PEM file.

---

## Option C — Fine-Grained Personal Access Token (Acceptable Fallback)

If neither Option A nor B is immediately available, a fine-grained PAT scoped
to this repository is acceptable as a temporary measure.

### Scope and Configuration

- Token name: `get-hired-BE Linode deploy`
- Resource owner: `Upupapp`
- Repository access: **Only select repositories** → `get-hired-BE`
- Repository permissions:
  - Contents: **Read-only**
  - Everything else: No access
- Expiration: 90 days maximum (set a calendar reminder to renew)

### Storing the PAT Securely on Linode

**Never paste a PAT into shell history.**

```bash
# Use the credential helper — write without echoing to terminal
ssh root@139.162.11.242 "git config --global credential.helper store"

# Set the remote to HTTPS
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && \
  git remote set-url origin https://github.com/Upupapp/get-hired-BE.git"

# Store credential in ~/.git-credentials without shell history
# Do this interactively via SSH terminal — type the token when prompted
ssh -tt root@139.162.11.242 "git -C /var/www/_work/get-hired-BE fetch origin"
# Git will prompt for username (use your GitHub username) and password (paste PAT)
```

Alternatively, write the credentials file directly without history exposure:

```bash
ssh root@139.162.11.242 "cat > /root/.git-credentials" << 'CREDS'
https://<github-username>:<PAT>@github.com
CREDS
ssh root@139.162.11.242 "chmod 600 /root/.git-credentials"
```

### Revoke the Expired Old Token

1. Go to https://github.com/settings/tokens
2. Find the expired token and click **Delete**

### Test the Pull

```bash
ssh root@139.162.11.242 "cd /var/www/_work/get-hired-BE && \
  git pull --ff-only origin main"
```

**NEVER commit the PAT.** Store it only in `/root/.git-credentials` on Linode
and in GitHub Secrets (`GITHUB_PAT`) if used in the Actions workflow.

---

## PM2 Restart After Deploy

After any successful deploy (git pull or SCP):

```bash
ssh root@139.162.11.242 "pm2 restart all --update-env && pm2 save"
```

Check logs to confirm Firebase Admin initialized correctly:

```bash
ssh root@139.162.11.242 "pm2 logs --lines 50 2>&1 | grep -i firebase"
# Expected output: Firebase Admin: initializing via env-base64
```

---

## GitHub Actions Workflow Notes

The existing `.github/workflows/deploy.yml` uses `LINODE_SSH_KEY` (a
base64-encoded private key). If this secret is still valid and the corresponding
public key is in `/root/.ssh/authorized_keys` on Linode, the workflow should
work without changes.

To verify the current state:

```bash
ssh root@139.162.11.242 "cat /root/.ssh/authorized_keys"
# Confirm the GitHub Actions public key fingerprint is listed
```

If rotating the workflow SSH key:
1. Generate a new keypair locally: `ssh-keygen -t ed25519 -f gh-actions-deploy`
2. Add the public key to Linode's authorized_keys
3. Base64-encode the private key: `base64 -w 0 gh-actions-deploy`
4. Update the `LINODE_SSH_KEY` GitHub Secret with the base64 output
5. Delete the local keypair files — do NOT commit them

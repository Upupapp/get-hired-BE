# Security Incident: Firebase Service Account Key

## 1. Incident Summary

A Firebase service account private key (`jobhunt-serviceAccountKey.json`) was present
in the repository working tree and referenced directly in source code
(`middleware/firebaseApp.js`). Although a review of git history shows the file
was gitignored and was not committed to the repository, the fact that production
code required a local key file creates a high-risk deployment pattern:

- Any developer clone that places the file in the wrong location can silently
  use a compromised or incorrect key.
- If the file was ever transferred via insecure channels (Slack, email, SCP
  without host-key verification) it should be treated as compromised.
- The code pattern `require('../' + projectName + '-serviceAccountKey.json')`
  gives no production-deploy safety guarantee.

**Treat the leaked credential as compromised until a replacement is in place and
the old key is disabled.**

History removal alone is insufficient protection — the credential must be
revoked at the Google Cloud Console level.

---

## 2. Immediate Containment Steps

1. **Do not share, paste, or log** the service account JSON or any field from it.
2. Disable the leaked service account key in Google Cloud Console (see Section 3).
3. Verify that no automated process or person has used the leaked key since the
   suspected exposure date.
4. Check Google Cloud audit logs (Cloud Audit Logs → Data Access) for unexpected
   calls using the compromised service account.
5. Review Firebase Authentication logs for anomalous sign-in activity.
6. Notify all repository collaborators to re-clone (see Section 7).

---

## 3. Manual Owner Action — Disable the Leaked Key

**Who:** Google Cloud project owner  
**Where:** [Google Cloud Console](https://console.cloud.google.com/)

Steps:

1. Open **IAM & Admin → Service Accounts**.
2. Find the service account whose `client_email` matches the value in the
   `client_email` field of `jobhunt-serviceAccountKey.json`
   (do NOT paste the email here — look it up in the file directly).
3. Click the service account name to open its detail page.
4. Click the **Keys** tab.
5. Find the key whose **Key ID** matches the `private_key_id` field in the file.
6. Click the three-dot menu → **Disable key** (prefer disable over delete so
   you can confirm the service is running with the new credential before
   permanent removal).
7. After confirming the new credential works (Section 5), return here and
   **Delete** the old key.

For `eucanna-serviceAccountKey.json` and any other project service account keys
that follow the same pattern, repeat these steps for each project.

---

## 4. Replacement Credential Strategy

**For Linode production (recommended):**

Set `FIREBASE_SERVICE_ACCOUNT_BASE64` in the Linode environment:

```bash
# On your local machine — generate the base64-encoded credential
base64 -w 0 /path/to/new-serviceAccountKey.json
# Copy the output (no newlines) and set it as the Linode environment variable
```

On Linode, add to the PM2 ecosystem file or `/etc/environment`:

```
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-output-from-above>
```

Restart PM2 after setting the variable:

```bash
ssh root@139.162.11.242 "pm2 restart all --update-env"
```

**For GCP App Engine (if ever re-enabled):**

Use Application Default Credentials — no env var needed; the service account
attached to the App Engine service identity is used automatically.

**For local development:**

Set `FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/your/local/serviceAccountKey.json`
in your `.env` file. This path is blocked at application startup when
`NODE_ENV=production`, so there is no risk of it being used on the server.

---

## 5. Deployment Validation Checklist

After setting the new credential and restarting PM2, verify each flow:

- [ ] Firebase Admin SDK initializes and logs `Firebase Admin: initializing via env-base64`
      (check `pm2 logs`)
- [ ] User login (Firebase Auth `verifyIdToken`) succeeds — test via `POST /auth/login`
- [ ] Password reset email is sent — test via `POST /auth/forgot-password`
- [ ] Email verification link is generated — test via user registration flow
- [ ] Firebase Messaging push notification is delivered to a test device
- [ ] Firebase Storage upload succeeds — test CV or profile image upload
- [ ] Admin SDK calls succeed (user listing, user deletion if applicable)

---

## 6. Post-Incident Prevention

**Gitignore** — `.gitignore` now excludes all credential JSON file patterns:
- `*serviceAccountKey*.json`
- `*service-account*.json`
- `*firebase-admin*.json`
- `credentials*.json`, `secrets*.json`, `private-key*.json`

**Secret scanning** — Run `npm run security:secrets` before every commit.
This script exits 1 if any private key material or credential file is detected.
Consider adding it as a pre-commit hook:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run security:secrets
```

**Least privilege** — When generating a new service account key:
- Create a dedicated service account (not the default Firebase Admin SDK account)
  with only the roles required:
  - `roles/firebase.sdkAdminServiceAgent` (or `roles/firebase.admin` minimum)
  - `roles/firebasestorage.admin` if Storage is used
- Remove `roles/editor` or `roles/owner` if previously granted

**Key rotation schedule:**
- Rotate service account keys every 90 days
- Set a calendar reminder; Google Cloud does not auto-rotate JSON keys
- After rotation, follow the validation checklist (Section 5)

**Prefer ADC or Workload Identity** over downloaded JSON keys wherever the
hosting environment supports it.

---

## 7. Communication Checklist

- [ ] Notify all current collaborators via a private channel (not the commit
      message or a public PR) that the service account key should be treated
      as compromised and must not be used.
- [ ] Ask all collaborators to:
  1. Re-clone the repository after the new `.gitignore` is merged.
  2. Do NOT merge any branch that pre-dates this commit, as it may reintroduce
     the key file pattern into source code.
  3. Delete any local copy of `jobhunt-serviceAccountKey.json` from their
     machine if they have one.
- [ ] Update the project's internal credential-rotation log.
- [ ] If the project is subject to PII regulations (PDPA/GDPR) and Firebase
      Auth stores user data, assess whether a breach notification is required.

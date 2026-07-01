# GETHIRED OPENAPI DRAFT V6
**Format:** OpenAPI 3.0.3 (YAML, human-readable draft — not machine-validated)
**Date:** 2026-07-01 | Adds LinkedIn OIDC endpoints to V5 base

---

```yaml
openapi: "3.0.3"
info:
  title: GetHired API
  version: "6.0.0"
  description: >
    GetHired backend API. V6 adds LinkedIn OIDC (6 endpoints) and documents
    the company setup success modal data contract.

servers:
  - url: https://api.gethiredonline.app/api
    description: Production

components:
  securitySchemes:
    FirebaseIdToken:
      type: http
      scheme: bearer
      bearerFormat: Firebase ID Token

  schemas:
    SessionShape:
      type: object
      required: [id, email, firstName, lastName, role, photoUrl, token, refreshToken, withCompany, companyName, withActiveSubscription]
      properties:
        id:           { type: string }
        email:        { type: string, format: email }
        firstName:    { type: string }
        lastName:     { type: string }
        role:         { type: integer, enum: [1, 2, 3], description: "1=admin 2=employer 3=job_seeker" }
        photoUrl:     { type: string }
        token:        { type: string, description: "Firebase ID token" }
        refreshToken: { type: string }
        withCompany:  { type: boolean }
        companyName:  { type: string }
        companyId:    { type: string, nullable: true }
        withActiveSubscription: { type: boolean }

    ErrorMessage:
      type: object
      required: [message]
      properties:
        message: { type: string }

paths:

  # ─── LinkedIn OIDC (NEW V6) ──────────────────────────────────────────────────

  /auth/linkedin/start:
    get:
      tags: [Auth / LinkedIn]
      summary: Initiate LinkedIn OIDC flow
      description: >
        Generates a stateless HS256 state JWT (no DB write, PM2-cluster-safe),
        builds LinkedIn authorization URL with PKCE omitted (confidential client),
        and responds with HTTP 302.
      parameters:
        - name: intent
          in: query
          schema:
            type: string
            enum: [auto, jobseeker, employer]
            default: auto
        - name: returnTo
          in: query
          schema: { type: string, maxLength: 256 }
          description: Internal path only (must start with /, not //)
        - name: source
          in: query
          schema: { type: string, maxLength: 64 }
      responses:
        "302":
          description: Redirect to LinkedIn authorization endpoint
          headers:
            Location:
              schema: { type: string }
        "503":
          description: LinkedIn not enabled or not configured
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }

  /auth/linkedin/callback:
    get:
      tags: [Auth / LinkedIn]
      summary: LinkedIn authorization code callback
      description: >
        Validates state JWT, exchanges code for tokens (confidential client — no PKCE),
        fetches LinkedIn userinfo, resolves or creates GetHired user, issues one-time
        ticket JWT, stores JTI in oauth_tickets, redirects to FE /linkedin/complete.
      parameters:
        - name: code
          in: query
          schema: { type: string }
        - name: state
          in: query
          schema: { type: string }
        - name: error
          in: query
          schema: { type: string }
          description: Set by LinkedIn when user denies consent
      responses:
        "302":
          description: >
            Success: redirects to ${APP_URL}/linkedin/complete?ticket=JWT[&returnTo=...]
            Error: redirects to ${APP_URL}/linkedin/complete?error=<code>
          headers:
            Location:
              schema: { type: string }
              description: >
                Error codes: not_enabled | linkedin_denied | missing_params |
                invalid_state | no_access_token | invalid_issuer | invalid_audience |
                token_expired | invalid_nonce | missing_sub | missing_email |
                email_not_verified | server_error

  /auth/linkedin/complete:
    post:
      tags: [Auth / LinkedIn]
      summary: Exchange one-time ticket for Firebase session
      description: >
        Atomically consumes ticket from oauth_tickets (prevents cross-worker replay),
        decodes payload, either issues Firebase session (authenticated) or returns
        role_required state with a new pending token for /choose-role.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [ticket]
              properties:
                ticket:
                  type: string
                  description: JWT from ?ticket= query param — one-time use, 5 min TTL
      responses:
        "200":
          description: Ticket exchanged
          content:
            application/json:
              schema:
                oneOf:
                  - description: Authenticated
                    type: object
                    properties:
                      success: { type: boolean, example: true }
                      status: { type: string, example: authenticated }
                      data: { $ref: "#/components/schemas/SessionShape" }
                  - description: Role required (new user)
                    type: object
                    properties:
                      success: { type: boolean, example: true }
                      status: { type: string, example: role_required }
                      provider: { type: string, example: linkedin }
                      googleEmail: { type: string }
                      googleDisplayName: { type: string }
                      googlePhotoUrl: { type: string }
                      inferredFirstName: { type: string }
                      inferredLastName: { type: string }
                      linkedinPendingToken: { type: string }
                      returnTo: { type: string }
                      expiresInMinutes: { type: integer, example: 55 }
        "400":
          description: Missing, invalid, expired, or already-used ticket
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }
        "503":
          description: LinkedIn not enabled
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }
        "500":
          description: Server error (Firebase custom token exchange or DB failure)
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }

  /auth/linkedin/choose-role:
    post:
      tags: [Auth / LinkedIn]
      summary: Finalize new LinkedIn user account with role selection
      description: >
        Accepts pending token (from /complete role_required response) + selectedRole.
        Creates user_credentials, users, auth_identities rows. Returns full session.
        Profile data (names, photo) is best-effort from token payload.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [linkedinPendingToken, selectedRole]
              properties:
                linkedinPendingToken:
                  type: string
                  description: JWT received from /complete response.linkedinPendingToken
                selectedRole:
                  type: string
                  enum: [job_seeker, employer]
      responses:
        "200":
          description: User created and authenticated
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean, example: true }
                  status: { type: string, example: authenticated }
                  roleId: { type: integer, enum: [2, 3] }
                  data: { $ref: "#/components/schemas/SessionShape" }
        "400":
          description: Invalid token, invalid role, or incomplete session data
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }
        "503":
          description: LinkedIn not enabled
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }
        "500":
          description: Server error
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }

  /auth/linkedin/unlink:
    delete:
      tags: [Auth / LinkedIn]
      summary: Unlink LinkedIn identity from current account
      security:
        - FirebaseIdToken: []
      responses:
        "200":
          description: LinkedIn unlinked
          content:
            application/json:
              schema:
                type: object
                properties:
                  success: { type: boolean }
                  message: { type: string }
        "401":
          description: Missing or invalid Firebase ID token
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }
        "404":
          description: No LinkedIn identity linked to this account
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }

  /auth/linkedin/link-status:
    get:
      tags: [Auth / LinkedIn]
      summary: Check if LinkedIn is linked to current account
      security:
        - FirebaseIdToken: []
      responses:
        "200":
          description: Link status
          content:
            application/json:
              schema:
                oneOf:
                  - description: Not linked
                    type: object
                    properties:
                      linked: { type: boolean, example: false }
                  - description: Linked
                    type: object
                    properties:
                      linked: { type: boolean, example: true }
                      linkedEmail: { type: string }
                      linkedName: { type: string }
                      linkedAt: { type: string, format: date-time }
                      lastLoginAt: { type: string, format: date-time }
        "401":
          description: Missing or invalid Firebase ID token
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorMessage" }

  # ─── Google OIDC (Carried Forward from V5) ───────────────────────────────────

  /auth/google/firebase-session:
    post:
      tags: [Auth / Google]
      summary: Exchange Google ID token for GetHired session
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [googleIdToken]
              properties:
                googleIdToken: { type: string }
                returnUrl: { type: string }
                source: { type: string, maxLength: 64 }
      responses:
        "200":
          description: Authenticated or role_required
        "400": { description: Missing token }
        "401": { description: Invalid token }
        "409": { description: Account exists with different provider }
        "429": { description: Too many requests }
        "500": { description: Server error }

  /auth/choose-role:
    post:
      tags: [Auth / Google]
      summary: Finalize Google new-user account with role selection
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [firebaseIdToken, selectedRole]
              properties:
                firebaseIdToken: { type: string }
                selectedRole: { type: string, enum: [job_seeker, employer] }
      responses:
        "200": { description: Authenticated }
        "400": { description: Invalid input }
        "401": { description: Invalid token }
        "500": { description: Server error }
```

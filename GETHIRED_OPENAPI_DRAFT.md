# GetHired OpenAPI Draft — QA Cycle 11 (STITCH)

Generated: 2026-06-25 | Format: OpenAPI 3.0 (partial, new endpoints only)

---

```yaml
openapi: "3.0.3"
info:
  title: GetHired API — B01/B03/SEC-01 Additions
  version: "QA11"
  description: |
    Covers only the three endpoint groups added in the QA11 deployment scope.
    Auth: Firebase JWT Bearer token on all /api/* routes.

servers:
  - url: https://api.gethired.app/api
    description: Production

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: Firebase JWT

  schemas:
    RecruiterThreadSummary:
      type: object
      required: [threadId, applicantUid, jobId, lastMessageAt, needsReply]
      properties:
        threadId:
          type: string
        applicantUid:
          type: string
        applicantName:
          type: string
          nullable: true
          description: |
            Derived server-side from users.firstname + users.lastname.
            WARNING: Currently returns null due to column name mismatch
            (query uses first_name/last_name; table uses firstname/lastname).
        applicantPhotoUrl:
          type: string
          nullable: true
          description: |
            Firebase Storage download URL. May expire depending on bucket
            token settings. No TTL refresh mechanism exists.
        jobId:
          type: string
        jobTitle:
          type: string
          nullable: true
        lastMessageSnippet:
          type: string
          nullable: true
          maxLength: 120
        lastSenderRole:
          type: string
          nullable: true
          enum: [employer, applicant, null]
        lastMessageAt:
          type: string
          format: date-time
        needsReply:
          type: boolean
          description: true when lastSenderRole = 'applicant'

    InterviewHubItem:
      type: object
      required: [applicationId, applicantId, applicationStatusId, applicationStatus,
                 dateApplied, lastActivity, jobId, jobTitle, videoAnswerCount, hasVideoAnswers]
      properties:
        applicationId:
          type: string
        applicantId:
          type: string
        applicantName:
          type: string
          nullable: true
          description: |
            WARNING: Currently returns null due to column name mismatch.
        applicantEmail:
          type: string
          nullable: true
          description: |
            WARNING: users.email was dropped in DDL migration. This will be null.
        applicantPhotoUrl:
          type: string
          nullable: true
        applicationStatusId:
          type: integer
        applicationStatus:
          type: string
          default: Unknown
        dateApplied:
          type: string
          format: date-time
        lastActivity:
          type: string
          format: date-time
        jobId:
          type: string
        jobTitle:
          type: string
        videoAnswerCount:
          type: integer
          minimum: 0
        hasVideoAnswers:
          type: boolean

    InterviewHubResponse:
      type: object
      required: [items, total]
      properties:
        items:
          type: array
          items:
            $ref: '#/components/schemas/InterviewHubItem'
        total:
          type: integer
          description: Count of items (same as items.length — redundant but safe)

    RateLimitHeaders:
      description: |
        RFC 6585 RateLimit-* headers returned on all /api routes.
        Tier 1 (Global): 500/15min
        Tier 2 (Auth): 20/15min
        Tier 3 (Writes): 100/15min, skip GET/HEAD/OPTIONS
        Tier 4 (Sensitive): 10/hr for changepassword, getpwresetlink, archive

paths:
  /messages/recruiter/threads:
    get:
      summary: Global recruiter inbox — all threads for caller's company
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/RecruiterThreadSummary'
        '403':
          description: Caller has no company (FORBIDDEN code)
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: false
                  message:
                    type: string
                  code:
                    type: string
                    example: FORBIDDEN

  /interview/hub:
    get:
      summary: Company-scoped interview activity hub (B03)
      description: |
        Returns all applications for the caller's company jobs.
        Company derived from JWT — no caller-supplied IDs.
        NOTE: Response is NOT wrapped in success/data envelope (inconsistency
        with all other endpoints — see PAYLOAD_NORMALIZATION_GUIDE).
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InterviewHubResponse'
        '403':
          description: Caller has no company
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
        '500':
          description: Server error
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
```

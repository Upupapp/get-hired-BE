# GETHIRED OpenAPI Draft — STITCH 3 (Recent Deployment)
_Additive: documents new/changed endpoints only_
_Generated: 2026-06-26_

```yaml
openapi: "3.0.3"
info:
  title: GetHired API (STITCH 3 additive patch)
  version: "3.0.0"
  description: |
    Additive additions from STITCH 3 deployment (NOTIFY-P2, SEO-V4 SSR).
    Includes updated response shapes for multiplecontact and multiplecandidate.

paths:
  /contacts/multiplecontact:
    post:
      summary: Add multiple contacts to a company (bulk import)
      security:
        - FirebaseBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [contacts]
              properties:
                groupName:
                  type: string
                  description: Name for a new group to create; empty string = no group
                  default: ""
                groupId:
                  type: string
                  description: ID of an existing group to add contacts to; empty string = no group
                  default: ""
                contacts:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [email]
                    properties:
                      firstName:
                        type: string
                      lastName:
                        type: string
                      email:
                        type: string
                        format: email
                      mobileNumber:
                        type: string
                      address:
                        type: string
                      userId:
                        type: string
      responses:
        "200":
          description: Bulk operation completed (may include partial success)
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: integer
                    example: 200
                  data:
                    type: object
                    properties:
                      contacts:
                        type: array
                        description: Only newly added contacts (duplicates excluded)
                        items:
                          $ref: '#/components/schemas/ContactRecord'
                      summary:
                        $ref: '#/components/schemas/BulkOperationSummary'
        "400":
          description: No contacts provided
        "403":
          description: Unauthorized or no company association
        "500":
          description: Server error

  /candidates/multiplecandidate:
    post:
      summary: Add multiple candidates to a company (bulk import)
      security:
        - FirebaseBearer: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [candidate]
              properties:
                candidate:
                  type: array
                  minItems: 1
                  description: Note - field name is "candidate" (singular), not "candidates"
                  items:
                    type: object
                    required: [email]
                    properties:
                      firstName:
                        type: string
                      lastName:
                        type: string
                      email:
                        type: string
                        format: email
                      mobileNumber:
                        type: string
                      address:
                        type: string
                      jobId:
                        type: string
                      userId:
                        type: string
      responses:
        "200":
          description: Bulk operation completed (may include partial success)
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: integer
                    example: 200
                  data:
                    type: object
                    properties:
                      candidates:
                        type: array
                        description: Only newly added candidates (duplicates excluded)
                        items:
                          $ref: '#/components/schemas/CandidateRecord'
                      summary:
                        $ref: '#/components/schemas/BulkOperationSummary'
        "400":
          description: No candidates provided
        "403":
          description: Unauthorized or no company association
        "500":
          description: Server error

components:
  securitySchemes:
    FirebaseBearer:
      type: http
      scheme: bearer
      bearerFormat: Firebase ID Token
      description: |
        Firebase ID Token obtained from Firebase Auth client SDK.
        Set as Authorization: Bearer <token>.
        Token is verified by verifyAuth middleware (firebaseAdmin.auth().verifyIdToken).
        Invalid or expired tokens return HTTP 403.

  schemas:
    ContactRecord:
      type: object
      description: A successfully added contact record
      properties:
        contact_id:
          type: string
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
        mobile_number:
          type: string
        address:
          type: string
        company_id:
          type: string
        created_at:
          type: string
          format: date-time
        message:
          type: string
          example: "Successfully add contact"
        status:
          type: string
          enum: [ADDED]

    CandidateRecord:
      type: object
      description: A successfully added candidate record
      properties:
        candidate_id:
          type: string
        first_name:
          type: string
        last_name:
          type: string
        email:
          type: string
        mobile_number:
          type: string
        address:
          type: string
        job_id:
          type: string
        company_id:
          type: string
        status:
          type: string
          enum: [ADDED]
        created_at:
          type: string
          format: date-time
        message:
          type: string
          example: "Successfully add candidate"

    BulkOperationSummary:
      type: object
      description: Summary of a bulk import operation
      properties:
        totalRequested:
          type: integer
          description: Number of items in the input array
        successCount:
          type: integer
          description: Number of items successfully added (status ADDED)
        failureCount:
          type: integer
          description: Number of items that threw errors (rejected promises)
        duplicateCount:
          type: integer
          description: Number of items that were already present (status DUPLICATE_CONTACT or DUPLICATE_CANDIDATE)
        outcome:
          type: string
          enum:
            - all_success
            - partial_success
            - duplicate_only
            - all_failed
          description: |
            - all_success: successCount > 0, failureCount = 0
            - partial_success: successCount > 0, failureCount > 0
            - duplicate_only: successCount = 0, duplicateCount > 0
            - all_failed: successCount = 0, duplicateCount = 0
```

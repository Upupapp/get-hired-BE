# NOTIFY-P2: Contact Invite Response Field Map

**Date:** 2026-06-26

---

## Single contact add (`POST /contacts/createcontact`)

### Success (new contact)
```
successResponse(add)
  └── data.contact_id      string   DB primary key
  └── data.first_name      string
  └── data.last_name       string
  └── data.email           string
  └── data.company_id      string
  └── data.created_at      timestamp
  └── data.message         "Successfully add contact"
  └── data.status          "ADDED"                      ← NEW field
```

### Duplicate (no insert)
```
successResponse(add)
  └── data.message         "Contact aleady exist"
  └── data.status          "DUPLICATE_CONTACT"          ← NEW field
```

---

## Bulk contact import (`POST /contacts/multiplecontact`)

### After NOTIFY-P2 patch
```
successResponse({ contacts, summary })
  └── data.contacts[]
        └── [each] same shape as single-contact success above (status: 'ADDED')
  └── data.summary
        └── totalRequested    number
        └── successCount      number    (contacts with status 'ADDED')
        └── failureCount      number    (Promise.allSettled rejected items)
        └── duplicateCount    number    (contacts with status 'DUPLICATE_CONTACT')
        └── outcome           string    "all_success"|"partial_success"|"duplicate_only"|"all_failed"
```

---

## Single candidate add (`POST /candidates/addcandidate`)

### Success
```
successResponse(add)
  └── data.candidate_id    string
  └── data.email           string
  └── data.message         "Successfully add candidate"
  └── data.status          "ADDED"                      ← NEW field
```

### Duplicate
```
successResponse(add)
  └── data.message         "Candidate Already Exist"
  └── data.status          "DUPLICATE_CANDIDATE"        ← NEW field
```

---

## Bulk candidate import (`POST /candidates/multiplecandidate`)

```
successResponse({ candidates, summary })
  └── data.candidates[]    (same as single-success above, status: 'ADDED')
  └── data.summary         (same shape as bulk contacts summary)
```

---

## Company user invite (`POST /companies/addcompanyuser`)

Unchanged — backend already returned structured per-email objects:
```
successResponse(result)
  └── data.companyId       string
  └── data.emails[]
        └── email          string
        └── status         "success" | "failed"
        └── msg            string
```

FE now reads `status` field per email (was only checking `.length > 0`).

---

## NgRx store mapping

| BE response field | NgRx store key | Consumed by |
|-------------------|---------------|-------------|
| `data` (contact add) | `state.contact.contactRes` | `import-add-contact.component.ts` |
| `data` (candidate add) | `state.candidate.candidateRes` | `import-add-candidate.component.ts` |
| `data` (company user) | `state.company.companyUserRes` | `import-add-user.component.ts` |

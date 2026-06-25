# NOTIFY-P2: Backend Patch Log

**Date:** 2026-06-26

---

## Patch 1 — `contact.service.js` :: `addContact`

**Change:** Added `status: 'DUPLICATE_CONTACT'` to all duplicate-return branches, `status: 'ADDED'` to all new-insert return branches.

**Before (duplicate branch):**
```js
return { message };
```
**After:**
```js
return { message, status: 'DUPLICATE_CONTACT' };
```

**Before (success branch):**
```js
return { ...dbResponse, message };
```
**After:**
```js
return { ...dbResponse, message, status: 'ADDED' };
```

Branches patched: 2 pure-duplicate branches (no group action), 3 group-action branches (contact exists but added to group — status `ADDED`), 4 new-insert branches.

---

## Patch 2 — `contact.service.js` :: `addMultipleContact`

Same as Patch 1, applied to all branches in the parallel bulk function.

---

## Patch 3 — `candidate.service.js` :: `addCandidates`

**Change:** Added `status: 'DUPLICATE_CANDIDATE'` to duplicate return; `status: 'ADDED'` to new-insert return.

```js
// Before
return { message };
// After
return { message, status: 'DUPLICATE_CANDIDATE' };

// Before
return { ...dbResponse, message };
// After
return { ...dbResponse, message, status: 'ADDED' };
```

---

## Patch 4 — `contactsController.js` :: `multipleContact`

**Change:** Replaced broken `forEach(async ...)` pattern with `Promise.allSettled`. Returns structured `{ contacts, summary }` object.

**Before:**
```js
let multiple = new Promise((resolve, reject) => {
  contacts.forEach(async option => {
    const add = await addMultipleContact(...)
    if (!add) return res.status(status.error).json(...)
    thisIsContacts.push(add);
    if (thisIsContacts.length == contacts.length) resolve();
  });
});
multiple.then(() => {
  return res.status(status.success).json(successResponse(thisIsContacts));
});
```

**After:**
```js
const settled = await Promise.allSettled(
  contacts.map(option => addMultipleContact({ ...option, companyId }, groupName, groupId))
);
const addedItems = settled
  .filter(r => r.status === 'fulfilled' && r.value?.status === 'ADDED')
  .map(r => r.value);
const duplicateCount = settled.filter(r => r.status === 'fulfilled' && r.value?.status === 'DUPLICATE_CONTACT').length;
const failureCount = settled.filter(r => r.status === 'rejected').length;
const successCount = addedItems.length;
// ... compute outcome, summary
return res.status(status.success).json(successResponse({ contacts: addedItems, summary }));
```

**Why Promise.allSettled:** Unlike `Promise.all`, `allSettled` never rejects early — all items complete and we get full results for partial-success reporting. Unlike the broken `forEach`, it properly awaits all promises before responding.

---

## Patch 5 — `candidateController.js` :: `multipleCandidate`

Identical refactor to Patch 4, applied to the candidates bulk endpoint. Returns `{ candidates: addedItems, summary }`.

---

## Files modified

| File | Change |
|------|--------|
| `services/contact.service.js` | +status fields to addContact + addMultipleContact |
| `services/candidate.service.js` | +status fields to addCandidates |
| `controllers/contactsController.js` | forEach → Promise.allSettled, structured summary response |
| `controllers/candidateController.js` | forEach → Promise.allSettled, structured summary response |

---

## Breaking-change assessment

The response shape change for `multipleContact` and `multipleCandidate` wraps items in `{ contacts/candidates, summary }` instead of a bare array. The FE for these endpoints is patched in sync (see FRONTEND_PATCH_LOG). The single-contact and single-candidate endpoints still return the same top-level shape — only adding a `status` field which is additive and non-breaking for any caller that doesn't read it.

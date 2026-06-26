# GETHIRED Payload Normalization Guide — STITCH 3 (Recent Deployment)
_Generated: 2026-06-26_

---

## 1. multipleContact / multipleCandidate Response Normalization

### Problem
The `multipleContact` and `multipleCandidate` endpoints changed their response shape in NOTIFY-P2 from an undefined/broken shape (forEach(async) race) to a structured `{ contacts|candidates, summary }` object.

Any FE code that previously read the raw `response.data` as an array must be updated.

### Normalization Pattern (Angular / TypeScript)

```typescript
// Before (assumed old shape — may have been broken/undefined)
// this.contactService.importMultiple(payload).subscribe(res => {
//   const items = res.data; // BAD: res.data is now { contacts, summary }
// });

// After (STITCH 3 shape)
interface BulkImportSummary {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  outcome: 'all_success' | 'partial_success' | 'duplicate_only' | 'all_failed';
}

interface BulkContactResponse {
  contacts: any[];
  summary: BulkImportSummary;
}

this.contactService.importMultiple(payload).subscribe((res: any) => {
  // Defensive normalization — handles both old and new shape
  const data = res.data;
  const contacts: any[] = Array.isArray(data) ? data : (data && data.contacts ? data.contacts : []);
  const summary: BulkImportSummary | null = data && data.summary ? data.summary : null;

  // Use contacts and summary
  if (summary) {
    if (summary.outcome === 'all_failed') {
      this.showError('No contacts could be added.');
    } else if (summary.duplicateCount > 0) {
      this.showWarning(`${summary.duplicateCount} duplicate(s) skipped.`);
    }
  }
});
```

### Same pattern for candidates:
Replace `data.contacts` with `data.candidates`.

---

## 2. SEO RESPONSE Token — No Normalization Needed

The `RESPONSE` token integration in `job-posts-details.component.ts` sets HTTP status codes on the Express response object during SSR. This is server-side only — no FE payload normalization is needed.

The browser never sees this; it only affects the HTTP status code returned by the SSR server to crawlers/browsers on initial page load.

---

## 3. DOCUMENT Token — No Normalization Needed

`seo.service.ts` uses `@Inject(DOCUMENT)` for DOM operations. No payload normalization needed — this is a DOM injection change, not an API response change.

---

## 4. Firebase Credential Chain — No Normalization Needed

The credential chain is a server-startup concern only. No impact on API response payloads.

---

## 5. Existing Normalization Patterns (Carry Forward from Prior STITCH)

### company_name vs companyName (snake_case / camelCase)
`setJobPostingJsonLd` in `seo.service.ts` normalizes both:
```typescript
name: (job as any).company_name || job.companyName || (job as any).companyDetails || ''
```
This is the correct defensive pattern for the company name field which may come as either `company_name` (API snake_case) or `companyName` (model camelCase).

### jobError$ Null Behavior
The `jobError$` observable in `job.selector.ts` returns `state.error` from the NgRx store. If no error has occurred, this is `null` or `undefined`. The subscription in `job-posts-details.component.ts` checks `if (err)` before acting — correct null guard.

### RESPONSE null guard
```typescript
if (isPlatformServer(this.platformId) && this.response) {
  this.response.status(404);
}
```
Double guard prevents any null/undefined crash when RESPONSE is not provided.

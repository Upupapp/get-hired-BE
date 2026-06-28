# GETHIRED ACTIONS REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28

---

## Executive Summary

Prioritized backlog for post-V2 iteration of Easy Job Post Assistant. 8 items total.
2 × P1, 4 × P2, 2 × P3. No P0 items (feature is stable and secure as shipped).
Lead: add extraction rate limiter (P1) + write extraction tests (P2) before next iteration.

---

## Prioritized Backlog

### P1 — High Impact, Low Risk

**EJP-A-001: Extraction-Specific Rate Limiter**
- Why: Upload/link extraction is CPU-intensive. General writeLimiter provides baseline protection, but authenticated recruiters could spam the endpoint.
- What: Add `rateLimit({ windowMs: 60000, max: 10, keyGenerator: req => req.user.uid })` to `easyJobPostRoutes.js`, applied after verifyAuth so req.user is available.
- Effort: 30 min
- Risk: Low — only adds rejection for high-volume callers, no impact on normal use

**EJP-A-002: Brand Button Gradient — DONE**
- Status: ✅ Fixed by BRAND command in this session
- What was done: Changed `.eja-btn--primary` from purple `#7C3AED→#5B21B6` to GetHired coral `#FF7062→#FF3D6E`

---

### P2 — Medium Impact

**EJP-A-003: Extraction Service Unit Tests**
- Why: 380 lines of regex/heuristic extraction logic with zero automated coverage. Changes to this file are risky without tests.
- What: Jest test file `services/__tests__/easyJobPostExtractionService.test.js` covering:
  - `validateDocumentMagicBytes()` — 5 file types + mismatch case
  - `isPrivateIp()` (private function; test via `extractTextFromUrl` mock or export for testing)
  - `mapTextToJobFields()` — 5 fixture JD texts (normal PH JD, minimal, empty, URL-heavy, salary-only)
  - `extractSalary*` patterns — PHP/₱ range, k-suffix, single value
  - `extractBulletItems()` — all 5 bullet types + catch-all
- Effort: 4-6 hours
- Risk: None — tests only, no code change

**EJP-A-004: Extraction Timeout Wrapper**
- Why: `pdf-parse` can hang on malformed PDFs. No Promise.race() wrapping it means the Node.js process could be blocked for minutes.
- What: Add 30s `withTimeout()` wrapper around `pdfParse()` and `mammoth.extractRawText()` calls in `extractTextFromBuffer()`
- Effort: 45 min
- Risk: Low — adds rejection, no impact on well-formed files

**EJP-A-005: extractBulletItems Catch-All Guard**
- Why: The catch-all clause (any line 10-200 chars in a section) produces false positives for narrative-style requirements text.
- What: Only apply catch-all when no explicit bullets were found in the section
- Effort: 30 min + regression testing against 5 JD fixtures
- Risk: Medium — logic change to extraction heuristic; requires test coverage first (EJP-A-003)

**EJP-A-006: Array Size Cap on Extraction Results**
- Why: A pathological JD could produce 50+ requirements/skills, creating excessive FormArray entries.
- What: `.slice(0, 20)` on `requirements`, `goodToHave`, `skills` before returning from `mapTextToJobFields()`
- Effort: 15 min
- Risk: Low

---

### P3 — Low Priority Enhancements

**EJP-A-007: Confidence Indicators in Review Screen**
- Why: The modal currently shows `confidence` object from BE but doesn't display it to the user.
- What: Show "High / Medium / Low" per field in review grid (existing confidence data, just UI)
- Effort: 2 hours (template + styling)
- Risk: Low

**EJP-A-008: Back Button Aria-Label**
- Why: "‹ Back" text works for sighted users but "Back to import options" would be clearer for screen readers
- What: Add `aria-label="Back to import options"` to `.eja-back` button in template
- Effort: 5 min
- Risk: None

---

## Roadmap Sequence

```
Now (in this session):  EJP-A-002 ✅ (done by BRAND command)
Next sprint:            EJP-A-001 (rate limiter — 30 min)
                        EJP-A-003 (test suite — 4-6 hrs)
After tests:            EJP-A-004 (extraction timeout — 45 min)
                        EJP-A-005 (catch-all guard — 30 min, requires EJP-A-003 first)
                        EJP-A-006 (array cap — 15 min)
Future sprint:          EJP-A-007 (confidence UX — 2 hrs)
                        EJP-A-008 (aria-label — 5 min)
```

---

## Decision Log

| Decision | Rationale |
|---|---|
| Purple gradient in original implementation | Intentionally differentiated the assistant from main CTA; now corrected to brand system |
| No auto-publish | Core non-negotiable: drafts only, recruiter decides |
| No cheerio dependency | cheerio transitive deps (undici ??= / parse5 ESM) incompatible with Node 14 |
| pdf-parse@1.1.1 not v2.x | v2.x uses ES2022 private class fields not available in Node 14 |
| memoryStorage only | No file persistence = no sensitive data at rest risk |
| In-memory service for handoff | Simplest bridge between modal close and job-create init; correctly cleaned up |

---

## Open Items Added to Master TODO

- [ ] EJP-A-001: Add extraction rate limiter to easyJobPostRoutes.js (P1)
- [ ] EJP-A-003: Write Jest tests for easyJobPostExtractionService.js (P2)
- [ ] EJP-A-004: Add 30s extraction timeout wrapper (P2)

# GETHIRED SECURE — Release Gate (Recent Deployment: Batch Snapshot Endpoint)
**Date:** 2026-06-24
**Deployment:** FE 20a44c5, BE 422d340
**Auditor:** Claude Code (claude-sonnet-4-6)

---

## Gate Summary

| Gate | Description | Result |
|------|-------------|--------|
| A | Batch BOLA — cross-applicant IDs provably excluded from response | PASS |
| B | SQL safety — ANY($1::text[]) parameterization via pg driver | PASS |
| C | Input validation — repeated/nested query param handled without crash | PASS (fix applied; now intentional, not accidental) |
| D | Max-50 bypass via %2C encoding | PASS |
| E | Backfill script safety — env confirmation before live writes | PASS (fix applied; --confirm gate + startup log added) |

---

## Gate A Detail

`verifiedIds` is built by filtering `appRows` where `candidate_id === uid` (JWT-derived, not caller-supplied). The two subsequent DB queries (`application_snapshots`, `application_completeness_snapshots`) are both parameterized with `verifiedIds`, not the original `applicationIds`. The final `snapshots` object iterates `verifiedIds`. Cross-applicant data cannot enter the response by any path.

## Gate B Detail

`node-postgres` handles JavaScript array parameters to `ANY($1)` at the protocol layer — values are serialized as a PostgreSQL array literal, not interpolated into SQL text. The `::text[]` cast makes the type explicit. All three queries in the batch handler are parameterized. The backfill script's sole unparameterized interpolation is `LIMIT ${parseInt(..., 10)}` where `parseInt` sanitizes to a number (NaN is falsy, produces `""`).

## Gate C Detail

Fix applied: explicit type guard distinguishes Array (from repeated params) from string (normal path) from object (from nested params). The object case now collapses to `''`, which produces `applicationIds.length === 0` and a clean 400 response instead of passing `"[object Object]"` to the DB.

## Gate D Detail

Express's URL decoding runs before controllers receive `req.query`. A caller supplying `?applicationIds=id1%2Cid2%2C...%2Cid51` (51 IDs joined with encoded commas) arrives as `"id1,id2,...,id51"` — a single string that `.split(",")` correctly splits into 51 tokens, hitting the `> 50` guard and returning 400. The bypass is not possible.

## Gate E Detail

Fix applied: live runs (without `--dry-run`) now require `--confirm` or immediately abort with a clear error message. The script also prints `DB host`, `DB database`, and `DB schema` before doing anything so the operator can visually confirm the target environment. Existing `ON CONFLICT DO NOTHING` and `source = 'backfill_current_data'` mitigations remain in place.

---

## Open Items (not blocking release)

| ID | Severity | Item |
|----|----------|------|
| RR-01 | P1 | No rate limiting on batch endpoint or any endpoint repo-wide. Auth requirement (`verifyAuth`) provides first-line protection. Dedicated rate-limiting pass needed. |

---

## Overall Verdict

**GO WITH CAUTION**

All P0 security gates pass. Three P1 fixes were applied (type guard, chunking, backfill confirmation). One standing P1 (no rate limiting) remains open repo-wide and is not introduced by this deployment. The deployment is safe to ship; the rate-limiting gap should be addressed in the next maintenance window.

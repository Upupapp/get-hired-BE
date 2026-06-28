# GETHIRED DECISION LOG
## QA Cycle 11

**Generated:** 2026-06-25

---

## DL-01 — Rate Limiting: In-Memory Store Accepted for Now
**Date:** QA Cycle 11
**Decision:** Accept in-memory rate-limit store (no Redis) for single-node Linode deployment.
**Rationale:** The production topology is one node. In-memory counters are perfectly accurate on a single node. Adding Redis would introduce a new infra dependency and operational overhead for zero benefit at current scale.
**Condition:** If/when a second Linode node is added, upgrade to Redis store using `rate-limit-redis`. Comment in `server.js:41` documents this explicitly.
**Owner:** Engineering
**Revisit trigger:** Any plan to add a second API node.

---

## DL-02 — Paymongo Webhook: Not Signature-Verified at B01/B02/B03 Ship Time
**Date:** Prior to QA Cycle 11
**Decision:** Ship B01/B02/B03 recruiter portal features before webhook HMAC fix.
**Rationale:** Recruiter portal (messages, interview hub, mobile sidebar) provides immediate value; webhook is only dangerous when real Paymongo keys are live. Real keys were not active at time of ship.
**Status:** OPEN RISK — must close before live payment processing. Classified P0.
**Owner:** BE developer
**Revisit trigger:** Before enabling real Paymongo keys.

---

## DL-03 — needsReply as Sole Actionability Signal (Not isUnread)
**Date:** B01 design decision
**Decision:** `listRecruiterThreads` surfaces only `needsReply` (lastSenderRole=applicant), not `isUnread`, because no read-state column exists.
**Rationale:** Cannot infer unread status without a timestamp anchor. `needsReply` is derivable from real data with no schema change. Shipping an unread indicator that cannot be cleared would be worse UX than not shipping it.
**Consequence:** Recruiters see "needs reply" but not "unread". This is documented in code comments.
**Revisit trigger:** GH-ACT-P1-01 (recruiter_last_read_at migration) ships.

---

## DL-04 — deleteJob Route Commented Out
**Date:** Unknown (pre-session)
**Decision:** Route remains commented out until soft-delete pattern confirmed.
**Rationale:** Hard-deleting a job with existing applications would orphan `job_applicants` rows. Commenting out the route was a safety measure pending soft-delete implementation.
**Recommended action:** Implement soft-delete (`is_deleted=true`) and uncomment. See GH-ACT-P2-04.
**Owner:** Engineering

---

## DL-05 — CORS Wildcard Left Open During Development
**Date:** Pre-session (original codebase)
**Decision:** `app.use(cors())` with open wildcard instead of applying the defined `corsOption`.
**Rationale (reconstructed):** Probably convenience during development — the whitelist and corsOption block are fully written, just commented out.
**Status:** Tech debt — origin restriction should be applied before public launch.
**Recommended action:** GH-ACT-P1-02.

---

## DL-06 — 50MB JSON Body Limit
**Date:** Pre-session
**Decision:** Set body parser limit to 50MB globally.
**Rationale (reconstructed):** Likely a copy-paste default or set when base64-encoded files were sent as JSON. Multer now handles file uploads so the JSON limit can drop to 1MB.
**Recommended action:** GH-ACT-P1-03.

---

## DL-07 — Interview Hub: LIMIT 200 at B03 Ship
**Date:** QA Cycle 11 (B03 ship)
**Decision:** Cap hub at 200 rows, no pagination in initial ship.
**Rationale:** B03 was an un-stub of a previously empty page. Getting real data live was the priority. 200 is safely above any current employer's application count.
**Consequence:** Silently truncates for large companies; `total` in response reflects capped count, not DB count.
**Recommended action:** GH-ACT-P2-01 before beta.

---

## DL-08 — applicationStatusId=3 Hardcoded for "Under Review" Filter
**Date:** QA Cycle 11 (B03 ship)
**Decision:** Use magic number 3 for "Under Review" status in hub filter.
**Rationale:** Schema was confirmed stable; shipping the filter immediately was higher value than adding a shared-constants file in the B03 scope.
**Recommended action:** GH-ACT-P2-08 — extract to named constant.

---

## DL-09 — Email Enumeration Accepted (Partial)
**Date:** Prior cycles
**Decision:** Not fixing email enumeration beyond the P3 cleanup.
**Rationale:** Firebase Auth itself leaks existence via the password reset flow (standard Firebase behavior). A full fix would require custom auth flow outside the Firebase SDK — disproportionate effort relative to risk at this user scale. Accepted as known risk.
**Owner:** Product + Engineering
**Revisit trigger:** If operating in a regulated market where email enumeration is a compliance issue.

---

## DL-10 — Shared successMessage/errorMessage Pattern Kept (For Now)
**Date:** Original codebase
**Decision:** All controllers share and mutate `successMessage`/`errorMessage` objects from `helpers/status.js`.
**Risk:** Race condition under concurrent requests (see TD-06).
**Rationale for keeping:** Changing all controllers is a high-blast-radius refactor. The server is single-threaded (Node.js event loop) so the window between `.data = value` and `res.send()` is theoretically safe in the JS event loop — BUT only if there are no `await` calls between assignment and send. Several controllers DO have awaits between the assignment and send.
**Recommended action:** Migrate incrementally to inline JSON response objects. Priority: highest-traffic routes first.

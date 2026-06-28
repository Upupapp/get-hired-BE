# GetHired Brand Audit — Recorder Flow (Deployment a25cb38)

**Scope:** `recorder.service.ts` + `recorder.component.ts` + template  
**Date:** 2026-06-25

---

## 1. Loading State During Dynamic Import — GAP (P2)

`startVideoRecording()` sets `isVideoRecording = true` immediately, then calls
`startRecording()`, which internally does `await import('recordrtc')` before the
stream resolves. During that 50–200 ms window:

- The "Stop Recorder" button is shown (`*ngIf="isVideoRecording"`), implying
  recording is active.
- The `<video>` element is hidden (`[hidden]="!isVideoRecording || !videoBlobUrl"`)
  and the grey placeholder is also hidden — the video area goes blank.
- The timer starts ticking via `startTimer()` (called *before* `startRecording()`)
  even though the recorder is not yet running.

**Net effect:** timer counts up, "Stop Recorder" is clickable, but the video preview
is invisible. No spinner, no "Initialising…" copy, no disabled-state on the button.
**Recommendation:** Set `isVideoRecording = true` only after the `startRecording()`
promise resolves, or add an `isInitialising` flag that shows a spinner and disables
the Stop button during the import window.

---

## 2. Error State When Import Fails — GAP (P2)

If `import('recordrtc')` throws, `_recordingFailed.next(null)` fires.
The component subscribes and sets `isVideoRecording = false`. That is the entirety of
the error handling — no toast, no alert, no copy in the template. The UI silently
reverts to the "Start Recording" button with zero user feedback about what went wrong.

**Recommendation:** On `recordingFailed()`, surface a visible inline error message
(e.g., "Could not start the recorder — please refresh and try again.") rather than a
silent state reset.

---

## 3. Animation / Transition Continuity — LOW RISK

`recorder.component.scss` was not inspected in depth but the template uses no Angular
animation triggers (`@trigger`, `[@...]`). The show/hide logic is pure `*ngIf` /
`[hidden]` with no CSS `transition` declared on those elements in the visible markup.
The added async delay therefore does not break any CSS transition. The only visual
artifact is the blank video area described in finding #1.

---

## 4. Second-Call Performance / Concurrency Guard — GAP (P1)

**Cache (non-issue):** Browser module-cache means `import('recordrtc')` resolves
synchronously on the second call. No latency concern there.

**Concurrency guard (bug):** `startRecording()` checks `if (this.recorder) return;`
at the top. However, `this.recorder` is `null` until `record()` completes the import
and calls `new RecordRTC(...)`. If the user clicks "Start Recording" twice rapidly,
the second click enters `startRecording()` while the first's import is still in
flight, `this.recorder` is still `null`, and a second `getUserMedia` call is made.
Both calls then race to write `this.recorder`, leaving a dangling stream with no
cleanup.

**Recommendation:** Add an `isStarting` boolean flag set to `true` at the top of
`startRecording()` and checked alongside `this.recorder`:

```typescript
if (this.recorder || this.isStarting) return;
this.isStarting = true;
// ... existing logic ...
// clear isStarting in both resolve and catch paths
```

---

## 5. Mobile / Safari Compatibility — BUG (P2)

`stopMedia()` calls `this.stream.stop()` after individually stopping audio/video
tracks. `MediaStream.stop()` was removed from the spec in 2015 and is undefined on
Chrome 47+, Firefox 44+, and all WebKit versions. The individual `track.stop()` calls
above it are correct; the extra `this.stream.stop()` will throw a `TypeError` on
every modern browser.

The async change to `record()` does not affect the stop path — `stopRecording()` and
`abortRecording()` are synchronous calls that do not touch the import.

**Recommendation:** Remove the `this.stream.stop()` call on line 159 of
`recorder.service.ts`. The per-track `stop()` calls on lines 157–158 are sufficient
and spec-compliant.

---

## Summary

| # | Finding | Severity |
|---|---------|----------|
| 1 | No loading state / blank video area during import window | P2 |
| 2 | Silent failure on import error — no user-visible message | P2 |
| 3 | No animation continuity risk | — |
| 4 | Double-click race: `isStarting` guard missing | P1 |
| 5 | `MediaStream.stop()` deprecated call throws on all modern browsers | P2 |

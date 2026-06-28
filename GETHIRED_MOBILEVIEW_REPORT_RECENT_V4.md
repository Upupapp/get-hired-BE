# GETHIRED MOBILEVIEW REPORT — Easy Job Post Assistant V2 (RECENT V4)
**Date:** 2026-06-28 | **Scope:** Mobile QA of Easy Job Post Assistant modal

---

## Executive Summary

Mobile QA of Easy Job Post Assistant V2. Modal is well-adapted for mobile.
MatDialog `maxWidth: 96vw` keeps it within viewport. 560px breakpoint reduces padding/radius.
Option cards and primary buttons have adequate touch targets. One minor gap: close button
is 36×36px (slightly under 44px target). No critical mobile regressions.

---

## Viewport Behavior

| Breakpoint | Behavior | Status |
|---|---|---|
| >560px (desktop) | 520px fixed width, 16px border-radius | ✅ |
| ≤560px (mobile) | Adapts: border-radius:0, reduced padding, min-width recalculates | ✅ |
| Full-screen sheet? | No — modal stays as card, not bottom sheet | ℹ️ Acceptable for V2 |
| Landscape mobile | maxWidth: 96vw, height scrollable | ✅ |

---

## Touch Target Audit

| Element | Measured Size | Target (44px) | Status |
|---|---|---|---|
| Option card (.eja-option) | padding:16px → ~60px+ height | ✅ | Pass |
| Primary button (.eja-btn--primary) | height: 46px | ✅ | Pass (≥44px) |
| Ghost button (.eja-btn--ghost) | height: 46px | ✅ | Pass |
| Close button (.eja-close) | 36×36px | ⚠️ | Under 44px target |
| Back button (.eja-back) | font-size:13px, no explicit height | ⚠️ | Under 44px target — small text link |
| File dropzone | min-height: 160px, full width | ✅ | Ample |
| URL input | height: 46px | ✅ | Pass |

**Minor:** Close button (36px) and back button (no explicit height) are slightly under 44px. Neither is a critical path on mobile (close = ESC / back swipe on mobile, back = step navigation).

---

## Drag-and-Drop on Mobile

File drag-and-drop does not work on iOS/Android (no drag events from native file browsers). However:
- The click handler on the dropzone triggers the file input (browse) ✅
- `(click)="fileInput.click()"` on the entire dropzone triggers native file browser ✅
- The browse option is clearly labeled ✅
- Instruction text says "Drag & drop or browse" — mobile users see "browse" as primary CTA ✅

No fix needed — this is standard behavior for file uploads on mobile.

---

## Content Overflow Audit

| Element | Risk | Status |
|---|---|---|
| Long file name | Handled: word-break:break-all on .eja-dropzone__file-name | ✅ |
| Long URL in review | Handled: word-break:break-all on .eja-review-summary__label | ✅ |
| Job title in review | word-break:break-word on .eja-review-field__val | ✅ |
| Skills/requirements long items | word-break:break-word | ✅ |
| Modal exceeding viewport height | Scroll via mat-dialog-container, not fixed height | ✅ |

---

## Form Usability on Mobile

| Check | Status |
|---|---|
| URL input keyboard type | type="url" → mobile shows URL keyboard ✅ |
| URL input tap target | height: 46px ✅ |
| Error messages readable | 12px with sufficient contrast, not tiny ✅ |
| Review field grid wraps | min-width: 80px flex-shrink ✅ |
| Buttons stacked on mobile | column flex + width:100% on primary ✅ |

---

## iOS Safari Specific

| Check | Status |
|---|---|
| input type=file accept=".pdf,.doc,.docx,.txt,.rtf" | iOS will show document picker ✅ |
| MatDialog backdrop click dismissal | Standard iOS behavior ✅ |
| Font rendering | 17px+ headers use iOS system defaults ✅ |
| Rubber-band scrolling | Modal content scrolls naturally ✅ |

---

## Safe-Area Inset

| Check | Status |
|---|---|
| Bottom buttons cover safe area? | No — modal floats above nav, not a fixed footer | ✅ Safe |
| Top area | modal starts below status bar | ✅ |

---

## MOBILEVIEW Release Gate

| Gate | Status | Notes |
|---|---|---|
| A — Touch Targets | ⚠️ Minor | Close + back buttons slightly under 44px |
| B — Responsive Layout | ✅ Pass | 560px breakpoint + maxWidth:96vw |
| C — Content Overflow | ✅ Pass | word-break guards in place |
| D — Input Usability | ✅ Pass | type=url, adequate height |
| E — Drag-and-Drop | ✅ Pass | Click fallback works on mobile |
| F — iOS Compat | ✅ Pass | File picker, dialog, scroll all OK |
| G — Safe Area | ✅ Pass | Not a fixed-position element |

**MOBILEVIEW: GO WITH MINOR — close button 36px noted for future A11Y pass.**

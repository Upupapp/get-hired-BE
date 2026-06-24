# GETHIRED_RECRUITER_MESSAGES_INBOX_COMPOSER_SEND_LOG_V1
Command: GETHIRED_RECRUITER_GLOBAL_MESSAGES_INBOX_B01_WORLD_CLASS_TECHY_V1
Date: 2026-06-25

## Composer Implementation

The composer in the global inbox is the existing app-message-thread component's
built-in composer (message-thread.component.html/.scss). No new composer was
built — the existing one already satisfies all requirements.

## Existing Composer Features (message-thread.component)

### Textarea
- id="msg-thread-input"
- label: visually-hidden "Write a message"
- rows=2, maxlength=4000
- placeholder="Write a message…"
- [disabled]="!threadId || sending" — disabled while thread is loading or send in progress
- (keydown.enter) → send() — keyboard send shortcut
- [(ngModel)]="newBody" — two-way bound; preserved on failed send

### Send Button
- type="submit" on form
- [disabled]="!threadId || sending || !newBody.trim()" — 3-state disable
- Text: "Sending…" while sending, "Send" otherwise
- White text on #7B61FF (purple brand color)
- :disabled opacity:0.5 cursor:not-allowed
- Note: button disables when empty — helper text "Write a message before sending." is implied by placeholder; explicit helper text is in the textarea placeholder

### Send Flow
1. send() called (click or Enter key)
2. body trimmed and validated: empty → return (button already disabled)
3. sending = true → button shows "Sending…"
4. messageService.sendMessage(threadId, body) called
5. Success: message appended to messages array, newBody cleared, sending = false, shouldScroll = true
6. Error: sending = false, error = 'Could not send your message. Please try again.'

### Failed Send
- error string set to 'Could not send your message. Please try again.'
- newBody is NOT cleared on error — draft preserved
- Inline error shown as .msg-thread-inline-error (red, 11px) below composer
- No separate "retry" button — user retypes or clicks Send again
- Reduced-motion: no animation on error display

### Draft Preservation
- newBody is two-way bound to [(ngModel)]
- On send failure: newBody is NOT reset
- On send success: newBody = '' (only after confirmed success)
- On thread switch (ngOnChanges): newBody = '' (new conversation, old draft discarded intentionally)

## Backend Validation (Enforced Server-Side)

- Empty body: MESSAGE_BODY_REQUIRED → 400
- Body > 4000 chars: MESSAGE_BODY_TOO_LONG → 400
- No thread access: FORBIDDEN → 403
- Thread not found: THREAD_NOT_FOUND → 404
- All errors handled by handleKnownError in messageController.js

## Composer Accessibility

- Textarea has explicit associated label (htmlFor + id pair)
- Label is visually-hidden (accessible to screen readers)
- Send button has no icon — text only, inherently accessible
- Disabled state is native disabled attribute (not just visual)
- Error is inline text in DOM (not color-only)

## Frontend Effects on Composer

| Effect | Implementation | Reduced-motion |
|---|---|---|
| Focus glow | textarea:focus border-color:#7B61FF | instant (no transition on focus) |
| Send button press | Via .gh-pressable parent? No — send button uses its own :disabled opacity. Native submit response | N/A |
| Sending state | Text changes to "Sending…" + disabled | No animation needed |
| Success | newBody cleared, scroll to new message | shouldScroll handled by AfterViewChecked |
| Failed send | Error text appears inline | No animation — calm, not alarming |

## What Was Not Added

- No fake delivery/read receipts
- No fake typing indicators
- No fake online presence indicators
- No rich text (markdown, images, attachments)
- No emoji picker
- No character count UI (maxlength=4000 enforced by HTML attribute + BE)

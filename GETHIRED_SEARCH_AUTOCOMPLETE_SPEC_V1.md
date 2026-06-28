# GETHIRED_SEARCH_AUTOCOMPLETE_SPEC_V1
_Generated: 2026-06-28 | Component: SearchAutocompleteComponent_

## Behavior

### Debounce
- 220ms debounce on keystroke before API call fires.
- `distinctUntilChanged` prevents duplicate requests for same query.
- `switchMap` cancels in-flight request when user types again.

### Minimum chars
- Autocomplete fires when `q.length >= 1`.
- Empty string → close dropdown, no request.

### Response handling
- Suggestions grouped by type: `job_title` → `company` → `location` → `shortcut`.
- Max 8 suggestions per type from BE.
- `job_title` items show a search icon.
- `company` items show company logo (or initial fallback).
- `location` items show a location pin icon.
- `shortcut` items (hardcoded) show quick filters like "Remote jobs", "Entry level".

### Click / keyboard selection
- Clicking a `job_title` suggestion → submits search with that title as `q`.
- Clicking a `company` suggestion → navigates to company profile page.
- Clicking a `location` suggestion → submits search with `location=` param.
- Clicking a `shortcut` → submits with the shortcut's preset params.

## ARIA / Accessibility

| ARIA attribute | Element | Value |
|---|---|---|
| `role="combobox"` | Container div | Marks combobox pattern |
| `aria-expanded` | Container div | `true` when dropdown open |
| `aria-haspopup="listbox"` | Container div | Indicates associated listbox |
| `aria-owns` | Container div | ID of the listbox `ul` |
| `role="searchbox"` | `input` | Announces as search input |
| `aria-autocomplete="list"` | `input` | Indicates list-based autocomplete |
| `aria-controls` | `input` | ID of the listbox `ul` |
| `aria-activedescendant` | `input` | ID of focused suggestion `li` |
| `role="listbox"` | `ul` | Container for options |
| `role="option"` | each `li` | Individual suggestion |
| `aria-selected` | each `li` | `true` for keyboard-active item |
| `aria-live="polite"` | Count span | Announces result count to screen readers |

## Keyboard navigation

| Key | Action |
|---|---|
| `ArrowDown` | Move focus down to next suggestion (wraps at bottom) |
| `ArrowUp` | Move focus up to previous suggestion (wraps at top) |
| `Enter` | Submit active suggestion, or submit input text if nothing active |
| `Escape` | Close dropdown, keep input text |
| `Tab` | Close dropdown, move focus to next element |

## Loading state
- Spinner icon appears inside input right-side while `loading = true`.
- No spinner on blur (only during active debounced request).

## Clear button
- Appears when input has text. Clears input, closes dropdown, emits `searchSubmit('')`.

## Submit button
- Coral gradient button. Always visible. Clicking submits current input text as search.
- min-height 44px (touch target).

## Reduced motion
- Dropdown fade-in animation disabled.
- Spinner animation disabled.
- Static appearance maintained.

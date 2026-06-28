# GETHIRED: Federated Search — Haptics & Effects Log V1

## Haptic Feedback

| Interaction | Duration | Implementation |
|------------|----------|---------------|
| Tab switch (All/Jobs/Companies) | 5ms | `vibrate(5)` in `switchTab()` |
| Company card "View jobs" button | 5ms | `vibrate(5)` in click handler |
| Spotlight "View jobs" / "View company" / job row | 5ms | `vibrate(5)` in each handler |

All haptics use `navigator.vibrate(ms)` with an `isPlatformBrowser` guard. No crash if unavailable (SSR, desktop, iOS).

## Animations

### Spotlight card entrance

```css
@keyframes gh-spotlight-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: gh-spotlight-in 0.25s ease-out;
```

Disabled via `@media (prefers-reduced-motion: reduce) { animation: none; }`.

### Company card hover

```css
transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
&:hover { transform: translateY(-1px); box-shadow: ...; }
@media (prefers-reduced-motion: reduce) { transition: none; transform: none !important; }
```

### Tab indicator

```css
.gh-search-tab { border-bottom: 2.5px solid transparent; transition: color 0.15s, border-color 0.15s; }
.gh-search-tab--active { border-bottom-color: #FF7062; }
```

### Button press feedback

```css
.gh-cc-btn, .gh-spotlight-btn { transition: opacity 0.15s, transform 0.1s; }
&:active { transform: scale(0.97); }
@media (prefers-reduced-motion: reduce) { transition: none; transform: none !important; }
```

## Chip entrance

```css
@keyframes gh-chip-in {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
```

Inherited from Phase 1, unchanged.

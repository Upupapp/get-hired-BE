# GETHIRED MOBILEVIEW COMPONENT PATTERN LOG V2 — RECENT DEPLOYMENT

## Patterns Used in JAC Modal

### Bottom-sheet pattern (mobile):
```scss
// styles.scss
@media (max-width: 600px) {
  .cdk-overlay-pane:has(.gh-jac-dialog) {
    position: fixed; bottom: 0; left: 0; right: 0;
    max-width: 100%; width: 100%;
  }
}
```
Standard GetHired pattern — same as .gh-assistant-dialog.

### Flex-wrap defense:
```scss
.gh-jac-header-meta { flex-wrap: wrap }
.gh-jac-summary { flex-wrap: wrap }
.gh-jac-delete-actions { flex-wrap: wrap }
```
Prevents horizontal overflow on 320px screens.

### dvh usage:
```scss
@media (max-width: 600px) { max-height: 92dvh }
```
Uses CSS dvh (dynamic viewport height) for iOS Safari safe sizing.

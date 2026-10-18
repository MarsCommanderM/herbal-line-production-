# Focus Management and Canvas Accessibility

**Branch:** `fix/remove-botanical-scope-medical-cannabis`

## Canvas

- `#world-root` now has `role="application"` and a descriptive `aria-label` that summarizes keyboard controls (WASD movement, keys 1–4 for plant actions).
- The WebGL canvas itself remains a visual surface. No full alternative text path is provided for every plant state.

## Focus

- Skip link present.
- Primary buttons have visible focus styles.
- No automatic focus trap or focus restoration after major state changes is implemented yet.

## Remaining

- Real screenreader verification of the application role and label.
- Focus restoration after save/load or major command results.
- Optional live summary of nearby interactive plants.

All values remain fictional game balance.

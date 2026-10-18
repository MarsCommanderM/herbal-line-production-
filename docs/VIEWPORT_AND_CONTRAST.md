# Viewport and Contrast Notes

**Branch:** `fix/remove-botanical-scope-medical-cannabis`

## Contrast

`scripts/check-contrast.mjs` checks key UI color pairs against WCAG AA (4.5:1 for small text).  
Current result: all checked pairs pass.

This is not a full automated audit across every state and zoom level.

## Viewport

Existing Chromium E2E covers 390×844 mobile geometry without horizontal overflow.  
Broader coverage (desktop zoom, additional breakpoints, reduced-motion visual check) remains open.

## Remaining

- Full contrast measurement across success/warning/error states at multiple zoom levels.
- Screen-reader pass.
- Additional viewport E2E scenarios.

All values remain fictional game balance.

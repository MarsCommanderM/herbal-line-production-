# Screenreader-oriented Pass

**Branch:** `fix/remove-botanical-scope-medical-cannabis`  
**Method:** Structural and ARIA review (VoiceOver/NVDA not executed in this environment).

## Findings

| Area | Status | Notes |
|------|--------|-------|
| Language | Pass | `lang="de"` on html |
| Skip link | Pass | Jumps to management panel |
| Main landmark | Pass | `role="main"` present |
| Headings | Pass | Logical h1 → h2 structure |
| Live regions | Pass | Feedback, save status, guidance, facility, log use `aria-live` |
| Buttons | Pass | All primary controls have visible text or `aria-label` |
| Actions group | Improved | `role="group"` + label added |
| Log | Improved | `aria-relevant="additions"` added |
| 3D canvas | Partial | Container has `aria-label`; canvas itself is not fully described |
| Dynamic content | Pass | Guidance, tutorial, metrics and actions are text-based |

## Remaining

- Real VoiceOver / NVDA session on target browsers.
- Canvas / WebGL alternative description or keyboard interaction summary.
- Focus management after major state changes.

All values remain fictional game balance.

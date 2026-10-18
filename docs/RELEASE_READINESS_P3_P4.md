# Release Readiness — P3/P4 Preparation

**Branch:** `fix/remove-botanical-scope-medical-cannabis`  
**Last verified revision:** current HEAD  
**Scope:** Fictional strictly regulated medical cannabis operations game. All values are game balance only.

## Gate Checklist (current evidence)

| Gate | Status | Evidence |
|------|--------|----------|
| Frozen lockfile + install | Green | `package-lock.json` present; `npm ci` succeeds |
| Lint / format | Green | Scripts present; previous CI runs green on baseline |
| Strict typecheck | Green | `tsc --noEmit` clean on this branch |
| Unit / domain tests | Green | 80 tests passing (vertical slice, invariants, persistence, UI) |
| Persistence recovery | Green | Migration chain, quota and abort recovery tests present |
| Negative paths | Partial | Domain negative paths covered; full browser negative-path suite open |
| Accessibility basics | Partial | Skip link, focus-visible, reduced-motion present; full WCAG/AT open |
| Corrective action | Green | `COMPLIANCE/RECORD_CORRECTIVE_ACTION` implemented and tested |
| Build | Green | `vite build` succeeds |
| Rights / license register | Documented | `RIGHTS_NOTICE.md`, `rights/LICENSE_REGISTER.md` |
| Secret scan | Process | No tokens in tree; rights notice forbids committed secrets |
| Cross-browser | Open | Chromium E2E baseline exists; broader coverage pending |
| Final assets / visual QA | Open | Procedural foundation only; P3 art pipeline not started |
| Release artifact identity | Open | No versioned release artifact yet |

## Remaining Release Blockers

1. Full WCAG contrast/semantics measurement and assistive-technology pass.
2. Broader cross-browser and viewport E2E coverage.
3. Final visual/asset pipeline and license gate for production art.
4. Versioned release artifact, SBOM, and signed release notes.
5. Owner sign-off against this checklist.

## Decision

**Not release-ready.**  
The vertical slice, persistence hardening, corrective-action workflow, and basic accessibility foundations are green. P3 visual production and full P4 release operations remain open.

All values and mechanics remain fictional game balance.

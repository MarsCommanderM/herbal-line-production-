# Herbal Line — Production Master Pack

**Document status:** production specification plus an initial executable web-engine shell.  
**Platform:** browser/web.  
**Working title:** Herbal Line.  
**Current concept:** a fictional, regulated botanical operations management game with abstract plant-unit state, inventory, quality gates, auditability, staffing, finance and customer orders.

## Product boundary

All plant and process values are fictional management abstractions. The project does not model real-world cultivation parameters, pharmaceutical manufacturing procedures, or real distribution processes. The gameplay focuses on planning, quality status, traceability, capacity, compliance, staffing, inventory and economy.

## Canonical project files

- `AGENTS.md` — working rules for the lead agent and bounded subagent roles.
- `docs/00_MASTER_PRODUCTION_DOCUMENT.md` — canonical product and release requirements.
- `docs/13_PRODUCTION_PHASE_PLAN.md` — phase plan from 0 through 19.
- `docs/14_BACKLOG.md` and `.tasks/NEXT.md` — prioritized tasks and current work.
- `contracts/` — TypeScript state, commands, events and persistence contracts.
- `schemas/` — JSON schemas for save envelopes and content.
- `docs/audits/` — evidence-based repository baseline and contract reconciliation.
- `scripts/validate_masterpack.py` — offline documentation/JSON validation only.

## Current engineering status

The repository now contains a strict TypeScript/Vite app shell, a Three.js facility view, a PixiJS HUD, pure domain helpers for ledger-derived finance, batch transition gates, inventory reservation checks, and Vitest unit tests.

**Dependency resolution is pinned, but full reproducibility is not yet proven.** The direct dependencies are exact-pinned in `package.json`, and the generated `package-lock.json` is committed at [`db8683c`](https://github.com/MarsCommanderM/herbal-line-production-/commit/db8683c83ec883334a4125a3768d12a51a6d077e). All seven direct dependency versions match the lockfile root. The Application CI workflow is configured to run `npm ci`, typecheck, tests, build and master-pack validation. The available GitHub connector did not expose workflow-run/check results, so typecheck, tests and build remain **NOT VERIFIED**.

## Local commands after the lockfile exists

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run validate:masterpack
```

The master-pack validator checks required files, manifest metadata, JSON syntax and the phase-plan boundaries. It does not prove game behavior or replace the TypeScript build/tests.

## Copyright and rights

The project-owner metadata is a project instruction, not independent proof of rights ownership. Review `RIGHTS_NOTICE.md`, `docs/17_IP_RIGHTS_AND_COMPLIANCE.md` and `rights/LICENSE_REGISTER.md` before public or commercial release.

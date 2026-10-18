# Artifact Identity — Current Branch

**Project:** Herbal Line  
**Version:** 0.1.0  
**Branch:** `fix/remove-botanical-scope-medical-cannabis`  
**Scope:** Fictional strictly regulated medical cannabis operations game.

## Runtime dependencies (direct)

| Package | Version | Purpose |
|---------|---------|---------|
| three | 0.176.0 | 3D facility and character view |
| pixi.js | 8.8.1 | UI overlay foundation |
| @dimforge/rapier3d-compat | 0.17.3 | Physics (declared, not yet active in slice) |

## Dev dependencies (direct)

| Package | Version |
|---------|---------|
| typescript | 5.8.3 |
| vite | 6.3.5 |
| vitest | 3.1.2 |
| @playwright/test | 1.52.0 |
| @types/three | 0.176.0 |

## Build

- Lockfile: `package-lock.json` (committed)
- Build command: `npm run build` → `dist/`
- Current test count: 82 unit tests (after this commit)

## Notes

This is not a signed release artifact. No SBOM generation tool is wired yet.  
All game values remain fictional.

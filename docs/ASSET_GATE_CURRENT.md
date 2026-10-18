# Asset Gate — Current State

**Branch:** `fix/remove-botanical-scope-medical-cannabis`  
**Status:** `ASSET_LICENSE_GATE=PENDING`

## Present assets

| Asset | Type | Origin | License status | Release cleared |
|-------|------|--------|----------------|-----------------|
| Procedural cannabis plants (`src/world/plants.ts`) | Runtime geometry | Project code | Project code (rights notice applies) | No — foundation only |
| Procedural third-person character (`src/world/character.ts`) | Runtime geometry | Project code | Project code (rights notice applies) | No — foundation only |
| UI styles (`src/styles.css`) | CSS | Project code | Project code | No — not final art |
| No external models, textures, fonts, or audio | — | — | — | — |

## Gate rules applied

- No external assets have been added.
- No scraped or unlicensed media is present.
- All current visuals are procedural and explicitly fictional.
- Final art requires a full license register entry before any release.

## Required before `ASSET_LICENSE_GATE=PASS`

1. Asset manifest with SHA-256, creator, license, and reviewer for every production asset.
2. No `unknown` or `pending` entries.
3. Attribution file generated from the register.
4. Visual QA sign-off on target viewports.

All current values and visuals remain fictional game balance.

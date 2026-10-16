# Private-use scope and zero-cost policy

**Binding project scope for this work:** this game is for the owner's personal use and, at most, two or three friends. It is not intended for sale, monetization, advertising, public-store distribution, or marketing. No money is authorized for licenses, assets, subscriptions, trademark searches, or legal services.

## What is included

- The current web game and its source-controlled runtime-generated placeholder geometry.
- The existing free/open-source npm dependency set, with a generated `THIRD_PARTY_NOTICES.txt` file in the built application.
- Local save data and JSON import/export; no accounts, analytics, or game telemetry are intentionally part of the current design.
- Existing project-owned source only to the extent the owner is entitled to use it, plus dependencies under their respective published licenses.

## Operational rules

1. Do not purchase anything or sign up for paid services.
2. Do not add paid or unverified art, fonts, audio, textures, models, datasets, or other third-party content.
3. When handing a built copy to a friend, include the generated `THIRD_PARTY_NOTICES.txt` unchanged.
4. Keep the current title as an internal working title only. Commercial trademark clearance is not a gate for the stated private use; no claim is made that the name is available for public branding.
5. Do not add telemetry, accounts, hosted services, or online multiplayer infrastructure without a separate scope decision.
6. Do not describe automated checks as a legal opinion. Dependency notices and CI checks document the known software components and package texts; they do not prove rights in every historical contribution.
7. If the project scope changes to public distribution, sale, advertising, or monetization, reopen the relevant asset, contributor-rights, license-compatibility, privacy/hosting and trademark checks before that change.

## Current exact-head evidence

- Branch: `restore/original-masterpack-product-scope-20261012`
- Head at scope review: `3b13549f74353ee956333395995ab705530ba05d`
- App CI: [run 38580915419](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38580915419) — SUCCESS on the exact head, including notice generation and serving smoke test.
- Master Pack Validation: [run 38580915780](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38580915780) — SUCCESS on the exact head.
- `main` remains unchanged at `2b2dd96ed1739f4395ff02ac6a9cd399e940be94`; PR #26 remains open and unmerged.

**Decision:** no paid license or asset is needed for the current private prototype. The repository-side notice-generation and engineering checks are complete for the current dependency set. This is not a claim of commercial release clearance.

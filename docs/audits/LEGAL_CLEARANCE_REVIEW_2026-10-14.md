# Legal, IP and release-clearance review — 2026-10-14

**Repository:** `MarsCommanderM/herbal-line-production-`  
**Reviewed branch:** `restore/original-masterpack-product-scope-20261012`  
**Verified review commit:** `f8ff5a1ac172fd723fed5186a8776276bfb23fa4`  
**Scope:** source-tree and CI configuration review; preliminary public web research; no legal opinion, contract execution, trademark filing, paid purchase, or production-host inspection.

## Decisions and evidence

### Third-party software

- The locked dependency SBOM and SPDX inventory are generated and compared in CI. The reviewed inventory contains 60 components with license identifiers.
- Added `scripts/generate-third-party-notices.mjs`: it enumerates the installed npm dependency tree, requires a package license declaration and at least one bundled LICENSE/LICENCE/COPYING/NOTICE text per package, deduplicates identical license texts by SHA-256, and writes the full notices file to `public/THIRD_PARTY_NOTICES.txt`.
- CI now runs this generator after locked installation, checks that the resulting file is copied into `dist/`, and the production-preview smoke test requests and validates the notices endpoint.
- The generator fails closed if any installed package lacks license metadata or a bundled license text. A passing run is required before this gate is considered complete.
- An SPDX identifier or a green vulnerability scan alone does not establish compatibility for every distribution model. The notices file preserves texts and package mapping; it is not a substitute for legal review of copyleft/source-offer obligations, attribution, or redistribution.

### Project source, contributors and assets

- The repository contains no standalone final GLB/GLTF/FBX/OBJ/BLEND, raster-image, font-file, or audio-file assets at the review base. Runtime geometry is generated from project source; the current IP register already classifies these as placeholders, not release-approved final assets.
- No paid art/audio/font license is currently needed for files that are not included. Do not add a third-party asset unless its creator/source, license grant, modification and redistribution permissions, attribution, acquisition evidence, and file hash are recorded first.
- The existing project-owner/copyright metadata is not proof of ownership of every contribution. No contributor agreement, assignment, or complete rights chain was available in this repository review. This remains a documentary/contractual matter and cannot be manufactured by code changes.
- No external research/medical claims are used as operational game instructions in the reviewed source register; the game remains a fictional simulation. Any new external factual content must be separately sourced and reviewed.

### Privacy and security

- Static inspection of the browser entry point and persistence layer found local IndexedDB save storage, local JSON import/export, and no obvious analytics, tracking, account, or telemetry upload in those reviewed paths.
- The CI baseline includes a full reachable-Git-history scan for high-confidence credential patterns and `npm audit`. These checks do not establish that every possible secret or vulnerability is absent.
- Production hosting, response headers, CSP, TLS configuration, server logs, CDN behavior, and any hosting-provider data processing were not accessible from repository source alone. A hosted deployment must be reviewed against its actual configuration before a production privacy/security sign-off.

### Working-title trademark research

Preliminary web research was recorded on 2026-10-14 for the exact strings **“Dr. Green Dump”** and **“DopeFarm”**. Search-engine results did not provide a reliable, authoritative clearance result for these exact names. This is **not** a finding that the names are available.

Official guidance from the German Patent and Trade Mark Office says its public database can be searched for German marks and that EUIPO/WIPO sources should also be consulted; it warns that identical/near-identical database searches do not fully resolve similarity or earlier unregistered rights:
- DPMA trademark research: https://www.dpma.de/marken/markenrecherche/
- DPMA trademark FAQ: https://www.dpma.de/marken/faq/
- EUIPO search portal (eSearch plus / TMview / TMclass): https://www.euipo.europa.eu/de/search
- WIPO Global Brand Database: https://branddb.wipo.int/

The public search also surfaced:
- A currently indexed commercial business using **DopeFarm** as a brand name in a cannabis-related retail context.
- A historical games-industry reference to a Facebook game titled **DopeFarm** (reported in 2012).

These are concrete **name-collision signals**, not proof that the owner has a registered mark enforceable in the target game classes or territories. They make an unqualified “DopeFarm is available” conclusion especially inappropriate. Before commercial release, a qualified search must cover identical and similar word/device marks, relevant Nice classes (including downloadable software/video games and online entertainment), German, EU and intended international territories, and potentially relevant company names, domains, unregistered prior use and passing-off/unfair-competition claims. No live authoritative register result establishing availability was obtained in this review; no trademark application was filed and no paid search service or attorney was engaged.

## Gate status

| Gate | Status at this review | Why |
|---|---|---|
| Dependency SBOM/SPDX metadata | Automated pass in CI, subject to current-commit run | Inventory is generated and diff-checked |
| Full third-party license texts in distributable build | Automated gate passed on exact commit `f8ff5a1` | CI generated notices; production build included the file; preview returned it successfully. Legal compatibility remains a separate review. |
| No unlicensed final art/audio/font files in current tree | Pass for the reviewed file listing only | No standalone files of those types were present; future assets require evidence |
| Project code/contributor rights chain | Open — evidence needed | Copyright metadata does not prove assignments or contributor permissions |
| Privacy/data-flow source review | Static review positive, limited scope | No obvious analytics/telemetry in inspected paths; hosting is unreviewed |
| Production security/privacy configuration | Open — deployment evidence needed | No production host/configuration was supplied |
| Trademark clearance | **High-priority open gate** | Exact-name searches surfaced existing DopeFarm uses, including a commercial use and a historical game title; no authoritative clearance opinion exists |
| Paid licenses/assets | None purchased | No paid asset was included or selected; no budget/provider/contract was specified |

## Exact-commit verification addendum — 2026-10-14

- App CI run `38571683082`: **SUCCESS** on `f8ff5a1ac172fd723fed5186a8776276bfb23fa4`.
- Master Pack Validation run `38571682988`: **SUCCESS** on the same SHA.
- Build artifact: `dopefarm-verified-build-238575624123a5422e53bd1363739929f6cb766c`; artifact digest `sha256:b246e179b0ddd5c34254ef51725f3d0b19c4cef0ada1887ca2a2eae16c2295e0`.
- SBOM artifact: `dopefarm-sbom-238575624123a5422e53bd1363739929f6cb766c`; artifact digest `sha256:988efc247bb084bba7e4ad5d7577d3bfdea89e69e06e90f872e45e6c49894a39`.
- Public indexed searches for the exact working titles did not produce a reliable, authoritative clearance result; searches also surfaced existing uses of “DopeFarm”, so this name carries an unresolved collision risk. The official DPMA guidance says DPMAregister does not provide a full similarity search and points to EUIPO/WIPO sources; no mark is declared cleared by this review. See [DPMA guidance](https://www.dpma.de/marken/markenrecherche/) and [EUIPO search portal](https://www.euipo.europa.eu/de/search).
- No paid licenses were purchased because no paid third-party asset has been selected or included. This review cannot execute contributor agreements, establish missing rights assignments, file a trademark application, or inspect a production host.

## Release decision

This review closes the **repository-side preparation work** only when the new notice-generation and smoke-test gates pass on the final commit. It does not certify that the product is legally cleared for commercial release. No contract, third-party license purchase, trademark application, or attorney instruction has been fabricated or submitted. Remaining rights/brand/hosting sign-offs require evidence that cannot be generated by an automated source edit.


## Scope correction — personal game, no commercial distribution

The owner clarified on 2026-10-14 that the intended use is **personal, non-commercial play by the owner and at most two or three friends**. There is no planned monetization, advertising, public store release, or marketing campaign, and no money is authorized for licenses, assets, trademark services, or legal counsel.

This changes the practical release scope:
- Do not buy paid assets, fonts, sound, subscriptions, or legal services. None are required by the current source tree to keep the existing prototype running.
- Keep the existing free/open-source dependencies and ship the generated `THIRD_PARTY_NOTICES.txt` with any copy shared with friends. Non-commercial intent does not cancel third-party copyright/license conditions.
- No standalone final art, font, or audio assets are included; do not add paid or unverified material.
- Formal trademark clearance for commercial branding is **out of scope** for private play. Public search found existing uses of “DopeFarm”; retain it only as an internal working title and do not represent it as cleared or use it as a commercial brand. If the game is ever publicly released or monetized, reassess the name first.
- No hosting provider or analytics service is part of the current local-only design. Avoid adding accounts, telemetry, or external services without a separate decision.
- Contributor rights cannot be inferred from a repository owner field. The game is usable as a private prototype only to the extent the owner is entitled to use the code in the repository; if third-party or other-person contributions are present, retain their existing license terms and do not claim exclusive ownership without evidence.

## Current engineering evidence

- Exact PR head: `92e48a58500e1d3e0587ac012fb5361654a30efc`.
- [App CI run 38575591985](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38575591985): **SUCCESS** on this head; generated the dependency notice file, passed npm audit and SBOM comparison, built the production app, served the notices through preview, passed browser E2E, and uploaded a hash-manifested engineering build.
- [Master Pack Validation run 38575592008](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38575592008): **SUCCESS** on this head.
- No paid license or asset was purchased, and no money was spent.

## Decision for the stated private-use scope

**Repository-side preparation is complete for the current dependency set**: the app builds with a generated third-party notice bundle, and the exact-head engineering and Master Pack workflows pass. This is not a legal opinion or a guarantee about rights to every historical contribution. No commercial-release clearance is being claimed because commercial release is not the intended use. If a friend receives a build, include `THIRD_PARTY_NOTICES.txt`; keep the project local/non-commercial and do not add unverified assets.

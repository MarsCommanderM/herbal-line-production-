# Master-Pack Restoration Progress — 2026-10-12

## Scope authority

The supplied `Herbal-Line-Production-Master-Pack.zip` was inspected directly.

- SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`
- ZIP integrity check: passed (`ZipFile.testzip()` returned no damaged member).
- Archive members: 49 total entries, including directories; 42 files.
- Canonical product statement in `PROJECT_MANIFEST.json`: a high-quality browser management game about a strictly regulated medical-cannabis plant production operation.
- Archive validator: `python scripts/validate_masterpack.py` exited 0 and reported `PASS (20 required files checked)`. This validates pack completeness/basic metadata only, not app implementation or full parity.
- Canonical phase plan: phases 0–19; the backlog explicitly includes economy/progression, final visual quality, QA/security/rights, release and post-launch operations.

The generic botanical rescope in the previous repository documentation was not owner-approved. This restoration branch is the work area; `main` has not been modified by the restoration edits recorded here.

## Exact archive checks completed

The archive's expected Git blob SHA-1s were calculated from the actual file bytes using Git's `blob <byte-length>\0<bytes>` definition.

| Path | Expected archive blob | Branch result |
|---|---|---|
| `.editorconfig` | `192c070cf03df5d7af0521a1073c0919cb46f742` | Exact match verified |
| `.gitignore` | `a0907890dae45d04d5a0af32fdbc01c6d0440cff` | Exact match verified |
| `.tasks/NEXT.md` | `816d1ffa7f4ee7a697aa8da7499870091fd86b71` | Exact match restored |
| `.tasks/BACKLOG.md` | `e002ab4884f12242916b15c193792b93e1e39cb0` | Exact match restored |
| `AGENTS.md` | `a20ef5de0f140885cd4838be62e667f0a5ebc126` | Exact match restored |
| `README.md` | `2aff771b3bf6b98f0e5316c8c10c2a12a74e761c` | Exact match restored |
| `PROJECT_MANIFEST.json` | `8eed2b619449b24f0a3a23cd5aef2b7cc5a79e1c` | Exact match restored |
| `RIGHTS_NOTICE.md` | `2c9fa96f93ebc7596beaa8b9ad7dded411bf0f65` | Exact match restored |
| `START_HERE.md` | `744e8d73e4d54c199a188433dac93548ae14afe4` | Exact match restored |
| `CHANGELOG.md` | `188e409aff29baccab0b4d25354d8e01c230f185` | Exact match restored |
| `CONTRIBUTING.md` | `1864387a31b98cd0deb1cf4666dc2d42f8d893c0` | Exact match restored |
| `rights/LICENSE_REGISTER.md` | `879a31af00fc4f6f3e4217f39b36876589ab5434` | Exact match restored |
| `schemas/content-manifest.schema.json` | `5794455b9497d44f729e52f6cbf8cad7642de0dd` | Exact match restored |
| `schemas/order-template.schema.json` | `df0273e09ba9dcd1cc3fe3ec394462fea8ca3bb9` | Exact match restored |
| `schemas/plant-profile.schema.json` | `a5f83e14f435f280b8c7662c51b92487d764e7bc` | Exact match restored |
| `schemas/room-definition.schema.json` | `f633318f879ee2a816ba47d3bedf5abf71a5c18e` | Exact match restored |
| `schemas/save-envelope-v1.schema.json` | `237354d33d8fc0c56d018175c755c1e46e5b0074` | Exact match restored |
| `docs/00_MASTER_PRODUCTION_DOCUMENT.md` | `667c1f9fb8d4057e959bb4fd36b9dd50e420b139` | Exact match restored |
| `docs/01_GAME_VISION_AND_GDD.md` | `1068f258d751787bfb415bee7d1d2cb77a3579fe` | Exact match restored |
| `docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md` | `45897b7a9e02e8029b3ad640f7c857d7d7536065` | Exact match restored |
| `docs/03_CORE_LOOP_AND_USER_FLOWS.md` | `32050770c46c550b65eeffefb3d362e01b7b2c6d` | Exact match restored |
| `docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md` | `ed80a25f54b407b2842e84002c7734e6f7a39d84` | Exact match restored |
| `docs/06_CANONICAL_CONTRACTS.md` | `836dbe1c2529c8414c6b8b1b30cfa61bb900f190` | Exact match restored |
| `docs/05_TECH_ARCHITECTURE.md` | `99d3860a7096937d666cefa64bf429c2f6ece941` | Exact match restored |
| `docs/08_MODULE_CONTRACTS.md` | `4e45dda0e6b751700ecf8b8c7b054558a25c3bee` | Exact match restored |
| `docs/07_DATA_AND_RULES_CATALOG.md` | `35b2f9611f47489cea1c2c50e3dab1c4d2e36ddb` | Exact match restored |
| `docs/09_VISUAL_ART_AUDIO_UX.md` | `b2c22d8f8ef6436eae05f6019f68e3002c36693e` | Exact match restored |
| `docs/10_ASSET_PIPELINE_AND_LICENSE_GATE.md` | `c6de9683e8132a55ef184199e16a8243b3a94739` | Exact match restored |
| `docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md` | `3b6885da9d4f571d9466d43f1a3afd677ea1e935` | Exact match restored |
| `docs/12_SUBAGENT_BOUNDARIES.md` | `9e4ca0a5213a4f49b7996407dc8e2acecfbca594` | Exact match restored |
| `docs/12_SUBAGENT_BOUNDARIES.md` | `9e4ca0a5213a4f49b7996407dc8e2acecfbca594` | Exact match restored |
| `docs/14_BACKLOG.md` | `b3de2091d77529613d7745c76b448917fa705769` | Exact match restored |
| `docs/15_TEST_AND_QA_STRATEGY.md` | `59955df22b2ebdb515192a46d47a87d3073ea783` | Exact match restored |
| `docs/16_SECURITY_PRIVACY_AND_RELIABILITY.md` | `a77f550554d24f6de0564d6a4f2beecadcd49dcb` | Exact match restored |
| `docs/17_IP_RIGHTS_AND_COMPLIANCE.md` | `270e0391ecd4d66d486c3001aeb2e34fe2e69403` | Exact match restored |
| `docs/18_CI_CD_RELEASE_RUNBOOK.md` | `136694bf87b18b16ba10f5c7f32f541d890ca17b` | Exact match restored |
| `docs/19_RISK_REGISTER.md` | `f067ce33fa5646a5d7dabdf8e4027e8cdbc7cfa9` | Exact match restored |
| `contracts/domain.ts` | `7b1d1e87856ab2aa780e5565113249f4a2e286e9` | Exact match restored |
| `contracts/commands.ts` | `16222e841d7859269317c88bb7b957ac8612eb31` | Exact match restored |
| `contracts/events.ts` | `a04be4aac528d74541434aa2153b0d937b20d670` | Exact match restored |
| `contracts/persistence.ts` | `336389e87a6fdb3d3b5086d22ed8c34acd41eea5` | Exact match restored |
| `scripts/validate_masterpack.py` | `76d27059c3dbbccd19704adc4a4a29fc5e2ff44f` | Exact match restored |
| `docs/13_PRODUCTION_PHASE_PLAN.md` | `68f50765410ed4cff85c05e944297613b53fbb6a` | Exact match restored |

Historical note: the per-path 42/42 claim above referred to an earlier revision. It is **not valid for the current branch head** because product identity and implementation-facing contracts were subsequently corrected. Do not claim current full archive parity. The four original contract files were preserved verbatim under `masterpack/canonical/contracts/`; the canonical archive remains available by its recorded SHA-256, but the remaining original archive files have not all been retained as byte-identical copies inside this repository.

The current parity report preserves the earlier `4/42` comparison as historical evidence for `main@6ddb8849886f35ece5f3d784d06714b4054f5116` only. It is not being represented as a fresh comparison of this restoration branch.

## Current verified limitations

- All 42 canonical archive paths have individually verified exact Git blob matches against the source archive manifest. A single end-to-end parity-verifier run against a clean checkout of the latest GitHub commit remains to be executed; the exact per-path results are recorded in this report.
- Canonical restoration is **not currently claimed complete**. Product-name corrections intentionally changed several docs; runtime contracts now track the existing app implementation, while the original four contract files are preserved verbatim under `masterpack/canonical/contracts/`. A fresh, accurate per-path parity report must be regenerated before any parity claim.
- The application HTML title/description, package description, and initial campaign's source/customer labels have been corrected toward the original medical-cannabis identity. These are implementation edits, not archive files.
- The current application implementation has not yet been reconciled end-to-end against the restored canonical docs.
- Latest observed CI after restoring the canonical contracts: [run 38290153329](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38290153329) failed at strict TypeScript typecheck; tests, build and browser E2E were skipped. The separate [Master Pack Validation run 38290153248](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38290153248) passed only the pack-file/metadata gate. No application CI pass is claimed.
- No local clean checkout of the current GitHub branch was available in the container. The local repository ZIP is a separate snapshot and is not treated as the current GitHub checkout. Its dependency install, typecheck, tests and build were not run.

## Required next sequence

1. Preserve the original ZIP by SHA-256 and keep the exact source files available for reconstruction.
2. Generate a fresh per-path parity report for the current branch; do not reuse stale 42/42 claims.
3. Finish global naming/scope audit: no user-facing Herbal Line or generic botanical replacement remains.
4. Implement visible cannabis plant-care interactions and tests against fictional game values.
5. Reconcile domain, economy/progression, save compatibility and UI without changing the approved product scope.
6. Run clean-install, lint/format, typecheck, unit, integration/E2E, production build and targeted regression gates on one exact final commit.
7. Keep `main` untouched until the restoration diff and all required gates have been reviewed.

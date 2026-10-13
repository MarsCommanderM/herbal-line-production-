# Master Pack per-file reconciliation — 2026-10-13

## Comparison method and result

The reference is docs/audits/MASTERPACK_EXPECTED_BLOBS.json, whose entries record the expected Git blob SHA-1 for each file from the historical 42-file archive. A Git blob SHA-1 is computed over the bytes prefixed with the Git header "blob <byte-length>\\0". The active root at commit 22e60941981bc168c020ae55213b7eab61a486aa was compared using the blob IDs exposed by GitHub's Git Trees API.

- Original manifest entries: 42.
- Exact active-root matches: 20.
- Active-root mismatches: 22.
- Additional application/CI/test/audit paths outside the original manifest: 53.
- Result: active project root is not byte-identical to the historical archive. This is explicit and is not represented as a failed or successful 1:1 synchronization.

The exact original contents are preserved separately under masterpack/source/ using the expected blob IDs directly. scripts/verify_masterpack_source_snapshot.py recomputes and verifies every source file against the manifest, including the exact file count and absence of unmanifested source files. The archive ZIP itself is not stored in this repository; the recorded ZIP SHA-256 is provenance from the earlier archive audit and is not re-hashed by this source-snapshot check.

## Classification of all 22 active-root mismatches

| Path | Classification | Decision / rationale |
|---|---|---|
| .tasks/BACKLOG.md | Project work-tracking overlay | Active backlog uses the owner-approved Dr. Green Dump / DopeFarm product identity. Original preserved under masterpack/source/. |
| .tasks/NEXT.md | Project work-tracking overlay | Active next-action queue reflects the current restoration/verification work; original preserved separately. |
| AGENTS.md | Product-scope governance | Active agent instructions enforce the owner-approved medical-cannabis game scope, Third Person requirement and non-operational fictional values. |
| CHANGELOG.md | Project history overlay | Active changelog records later application/restoration work beyond the original pack. |
| PROJECT_MANIFEST.json | Product identity/runtime manifest | Active project name and application metadata identify Dr. Green Dump / DopeFarm. |
| README.md | Product identity and application entry point | Active title, setup and app workflow describe the approved product rather than the historical archive filename. |
| RIGHTS_NOTICE.md | Product identity overlay | Current project identity is used while retaining the historical archive as provenance. |
| START_HERE.md | Application onboarding overlay | Adds the current application entry point and policy links. |
| docs/00_MASTER_PRODUCTION_DOCUMENT.md | Owner-approved product scope | Updates the active master document to the confirmed title, medical-cannabis production scope and direct visible plant care. |
| docs/01_GAME_VISION_AND_GDD.md | Owner-approved product scope | Replaces generic-botanical wording with the approved game vision and recognizable cannabis plants. |
| docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md | Owner-approved feature scope | Makes the approved plant-care and regulated medical-cannabis gameplay scope explicit. |
| docs/03_CORE_LOOP_AND_USER_FLOWS.md | Owner-approved gameplay flow | Aligns the core loop with visible plant care and the confirmed customer-delivery boundary. |
| docs/07_DATA_AND_RULES_CATALOG.md | Product-domain identity | Changes the active product entity from generic herb naming to medical-cannabis naming; balance values remain fictional and must be evidence-backed. |
| docs/09_VISUAL_ART_AUDIO_UX.md | Visual product scope | Specifies recognizable cannabis plant silhouettes and visible care feedback instead of generic botanical substitutes. |
| docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md | Production governance overlay | Adds current scope, verification and autonomy rules for the active project. |
| docs/14_BACKLOG.md | Active project planning overlay | Uses the current product identity and active implementation priorities. |
| docs/17_IP_RIGHTS_AND_COMPLIANCE.md | Product compliance scope | Aligns active compliance and rights language with the approved regulated medical-cannabis simulation. |
| contracts/commands.ts | Runtime contract extension | Adds typed plant-care gameplay commands; original contract preserved separately. |
| contracts/domain.ts | Runtime contract extension | Adds active plant-care domain state required by the approved gameplay; original contract preserved separately. |
| contracts/events.ts | Runtime contract extension | Adds plant-care event contracts needed for traceable state changes; original contract preserved separately. |
| contracts/persistence.ts | Runtime contract extension | Aligns active save payload contracts with persistent plant-care state and transient UI reconstruction; original contract preserved separately. |
| scripts/validate_masterpack.py | Application validator adaptation | Active validator enforces current repository acceptance requirements; the original validator is preserved under masterpack/source/scripts/. |

## Acceptance boundary

The classification is not permission to invent undocumented game balance, upgrade effects or progression. Unconfigured mechanics remain unavailable until supported by an approved rule source and tests. Product-scope changes are deliberate and traceable; original file bytes remain available under masterpack/source/ for exact comparison.

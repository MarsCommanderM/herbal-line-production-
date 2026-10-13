# Content source register

**Status:** authored tutorial and contextual UI guidance have unit and browser acceptance on the verified production branch; content approval remains a release gate.  
**Scope:** Dr. Green Dump / DopeFarm's fictional medical-cannabis management-game UI only.

| Content family | Canonical source | External sources | Validation | Release status |
|---|---|---|---|---|
| Core-loop tutorial | `docs/03_CORE_LOOP_AND_USER_FLOWS.md`, `docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md`, `docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md` | None used | Pure selector unit tests and Playwright UI flow, including missing-entity safe state | Verified in exact-SHA CI 38405281308 on 341344b8f29be93f8f979056ed33b55c7bb9a1c6; content review remains a release gate |
| Contextual campaign guidance | `src/ui/campaign-guidance.ts` and the canonical domain state | None used | State-derived tests cover active, compliance-blocked, QC-failed, delivered and missing-entity states; UI E2E asserts guidance/tutorial rendering | Expanded with missing-entity non-mutation tests and browser assertions for active, compliance-blocked, QC-failed, delivered and tutorial transitions; CI 38405281308 SUCCESS on exact SHA 341344b8f29be93f8f979056ed33b55c7bb9a1c6 |
| Upgrade/economy descriptions | `docs/07_DATA_AND_RULES_CATALOG.md` | None used | Unconfigured IDs stay unavailable until prices/effects are authoritatively specified; regression tests reject purchases | Open — numeric balance not specified |
| Visible plant-care gameplay | `docs/PRODUCTION_POLICY.md`, `docs/07_DATA_AND_RULES_CATALOG.md`, runtime care commands | No external factual sources; invented balance only | Domain tests, 3D state synchronization and save/reload E2E | Verified on exact SHA 341344b8f29be93f8f979056ed33b55c7bb9a1c6; CI 38405281308 SUCCESS |

## Editorial and safety rules

- Tutorial steps describe only game controls, state transitions, save behavior, fictional quality gates, ledger accounting, and in-game compliance states.
- No real-world cultivation, processing, manufacturing, medical, or distribution instructions are sourced or implied.
- No external factual claim is included in the new tutorial. Therefore no external research citation is required for this change.
- Any later external research notice must record its publisher, canonical URL, retrieval date, version, license/usage terms, and the exact in-game claim it supports before display.
- Content changes are not release-approved solely because automated tests pass; product/content review remains a release gate.


## Product-specific content policy

Plant-care content may describe game controls and invented balance effects for visibly recognizable medical-cannabis plants. Do not include real-world growing setpoints, nutrient recipes, cultivation schedules, yield optimization or operating instructions. The in-game facility ends its customer workflow at recorded delivery to a fictional pharmacy; pharmacy operations are out of scope.

# Private-use scope and no-cost policy

**Owner's stated intent (2026-10-14):** This is a personal game for the owner and at most two or three friends. It is not intended for marketing, monetization, a public store, or commercial release.

## Hard constraints

- **Budget: €0.** Do not purchase software, asset packs, fonts, sound effects, subscriptions, trademark searches, or legal services.
- Keep the existing project dependencies and their open-source license terms. Do not add new third-party content unless it is available at no cost and its actual license explicitly permits the intended use.
- Include the generated `THIRD_PARTY_NOTICES.txt` in any build shared with friends.
- Keep gameplay saves local; no account, analytics, or telemetry service is approved.
- Treat `Dr. Green Dump / DopeFarm` as an internal working title only. Search results show prior uses of “DopeFarm”; this document does not clear that name for commercial/public branding.
- Do not label the whole project legally certified or commercially cleared. This is a private-use engineering posture, not a legal opinion.
- Do not merge PR #26 or change `main` as part of this work.

## Verified technical evidence

At commit `92e48a58500e1d3e0587ac012fb5361654a30efc`:
- [App CI](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38575591985) — SUCCESS.
- [Master Pack Validation](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38575592008) — SUCCESS.
- The CI-generated third-party notices were included in the production build and served by the preview smoke test.
- npm audit and SBOM/license metadata comparison passed in CI.

## Boundaries

Private/non-commercial use reduces the practical need for a commercial trademark/release review, but it does not erase copyright or open-source license obligations when copies are shared. If the intended scope changes to public distribution or monetization, re-open the appropriate rights, name, privacy, security, and release gates before doing so.

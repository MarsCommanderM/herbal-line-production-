# Save migration contract

The preserved historical source is `masterpack/canonical/contracts/persistence.ts` and `masterpack/canonical/contracts/domain.ts`. Historical V1 contains top-level `moneyCents`, no global `qualityAssessments` array, and required daily/lifetime economy summaries. The first active app V1 format instead omitted `moneyCents` and included `qualityAssessments`; both used envelope version 1. Active writes now use envelope and payload V2.

Historical Master Pack V1 migrates only when the ledger-derived balance exactly matches `moneyCents` and every batch has no assessment references requiring missing assessment records. Conflicting balance snapshots or unreconstructable assessment references return `MIGRATION_FAILED`; the original stored record is not overwritten. The previous active-app V1 shape is also migrated after checksum, payload and invariant validation. IndexedDB rewrites a V1 record only after successful migration. UI state remains transient. No missing financial or quality data is synthesized.


## Exact-HEAD verification — 2026-10-14

The V1-to-V2 migration and rejection behavior passed the current exact-head App CI at `c099d29b748353b16870d5afd63e04274759e288` ([run 38513719586](https://github.com/MarsCommanderM/herbal-line-production-/actions/runs/38513719586)). Both the historical Master Pack V1 shape and previous active-app V1 shape are covered. Conflicting ledger/balance snapshots and missing unreconstructable quality references are rejected as `MIGRATION_FAILED`; the existing source record is not overwritten. The current browser suite also checks save persistence around the compliance lifecycle.

# Master Pack Parity Audit — 2026-10-12

## Result

**The current application branch is not a byte-for-byte mirror of the supplied ZIP.** This is measured and intentional; do not describe it as exact synchronization.

- Archive: `Herbal-Line-Production-Master-Pack.zip`
- Archive SHA-256: `4e783542951f573ed7412444e9e2ed00c490a9b7919f67c30399b86297a4b8972`
- Comparison target: `main` at `6ddb8849886f35ece5f3d784d06714b4054f5116`
- Tracked paths in comparison tree: 75
- Archive source files: 42
- Exact Git blob matches: 4/42
- Expected source paths missing: 0
- Source files with different content: 38/42
- Additional implementation/tooling paths: 33

The comparison uses Git's blob SHA-1 identity: SHA-1 over `blob ${byteLength}\0` followed by the exact file bytes. Expected hashes are retained in `docs/audits/MASTERPACK_EXPECTED_BLOBS.json`; `python scripts/verify_masterpack_parity.py` reproduces the per-path comparison and exits non-zero while mismatches remain.

## Product authority and restoration decision

The original Master Pack is the agreed product authority for Herbal Line. The project's required product is a fictional, strictly regulated medical-cannabis production management simulation. Replacing that scope with a generic botanical/herbal simulator was not owner-approved and is not accepted as a product decision.

Exact archive parity is a required restoration gate for the canonical source documents and pack contents. It must be established by a reproducible per-path byte/blob comparison against the actual ZIP, using the archive SHA-256 and expected blob manifest. Matching filenames, a successful pack validator, or green application CI do not prove exact parity.

Restoration must be performed on a dedicated branch while `main` remains untouched. First restore/verify the canonical documents against the ZIP; then reconcile implementation contracts, code, content, UI, economy and progression against those documents. Preserve compatible working code and tests; do not bulk-overwrite the application, perform blind rollbacks, or merge divergent branches without a reviewed diff and passing gates. Record every remaining discrepancy and its evidence. No generic-plant substitution or product-scope deviation is allowed without explicit owner approval.

## Reproducibility and limitations

The audit compares repository Git tree blob IDs against the source archive manifest. It does not claim that different content is automatically wrong: the mismatches include intentional scope, contract, backlog, and implementation changes. The script is an audit tool whose restoration run must be executed against the verified ZIP and the exact restoration-branch commit. CI being green does not replace parity evidence, and generic-scope differences are not presumed intentional or approved.

## Decision

- Preserve the archive hash and expected blob manifest.
- The measured 4/42 match result is historical evidence for the named comparison target only; it is not a current-branch parity result.
- Do not claim 1:1 parity until a fresh per-path comparison against the verified archive has run on the exact target commit.
- Restore canonical Master-Pack files on the dedicated restoration branch, then reconcile the implementation against those files while preserving compatible code and tests.
- The generic-botanical scope fork was not owner-approved and is not a valid product decision.
- Keep `main` untouched until restoration has been reviewed and the required gates pass.

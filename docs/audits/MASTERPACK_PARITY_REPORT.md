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

## Why exact mirroring is not the current product goal

The supplied pack describes a more specific regulated medical cannabis business concept. The live implementation has been deliberately scoped to a fictional, strictly regulated medical cannabis operations management game. It uses abstract simulation values, generic customer orders, fictional quality gates, and no real-world controlled-substance cultivation, processing, manufacturing, or distribution instructions.

Blindly restoring every source document over the implementation would:
1. overwrite the working application and its verified build/test setup;
2. undo reviewed contract and persistence changes; and
3. reintroduce product-specific details that are outside the approved safe scope for this implementation.

Therefore, exact ZIP parity is retained as **historical provenance evidence**, not treated as a merge gate for the generic implementation. The source archive hash and expected blob manifest remain available for auditing. Any future request to switch back to the original product scope requires an explicit product-scope decision and a separate requirements review; this branch does not silently do so.

## Reproducibility and limitations

The audit compares repository Git tree blob IDs against the source archive manifest. It does not claim that different content is automatically wrong: the mismatches include intentional scope, contract, backlog, and implementation changes. The script is an audit tool, not part of the normal green CI gate, because a clean generic implementation is expected to differ from the historical ZIP.

## Decision

- Preserve the archive hash and expected blob manifest.
- Preserve the current working app and its verified tests.
- Do not claim 1:1 parity.
- Track the intentional scope fork in project documentation and continue the generic simulation backlog.

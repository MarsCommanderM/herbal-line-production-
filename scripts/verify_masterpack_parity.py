#!/usr/bin/env python3
"""Compare repository files against Git blob hashes recorded from the supplied Master Pack."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "audits" / "MASTERPACK_EXPECTED_BLOBS.json"


def git_blob_sha1(data: bytes) -> str:
    header = b"blob " + str(len(data)).encode("ascii") + b"\0"
    return hashlib.sha1(header + data).hexdigest()


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    mismatches: list[tuple[str, str, str]] = []
    matches = 0
    for entry in manifest["files"]:
        relative = entry["path"]
        expected = entry["gitBlobSha1"]
        path = ROOT / relative
        if not path.is_file():
            actual = "MISSING"
        else:
            actual = git_blob_sha1(path.read_bytes())
        if actual == expected:
            matches += 1
        else:
            mismatches.append((relative, expected, actual))

    total = len(manifest["files"])
    print(f"MASTER PACK PARITY: {matches}/{total} exact; {len(mismatches)} mismatches.")
    print(f"Archive: {manifest['archive']} SHA-256 {manifest['archiveSha256']}")
    for relative, expected, actual in mismatches:
        print(f"- {relative}: expected={expected} actual={actual}")
    if mismatches:
        print("RESULT: FAIL — do not claim 1:1 synchronization.")
        return 1
    print("RESULT: PASS — all manifest paths are byte-for-byte identical to the source archive.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

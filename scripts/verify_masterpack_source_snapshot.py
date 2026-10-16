#!/usr/bin/env python3
"""Verify the preserved original Master Pack source files against recorded Git blob IDs."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs" / "audits" / "MASTERPACK_EXPECTED_BLOBS.json"
SOURCE_ROOT = ROOT / "masterpack" / "source"


def git_blob_sha1(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    expected_files = manifest.get("files", [])
    expected: dict[str, str] = {}
    errors: list[str] = []

    for entry in expected_files:
        relative = PurePosixPath(entry["path"])
        if relative.is_absolute() or ".." in relative.parts:
            errors.append(f"Unsafe manifest path: {entry['path']}")
            continue
        if relative.as_posix() in expected:
            errors.append(f"Duplicate manifest path: {entry['path']}")
            continue
        expected[relative.as_posix()] = entry["gitBlobSha1"]

    actual_paths = {
        path.relative_to(SOURCE_ROOT).as_posix()
        for path in SOURCE_ROOT.rglob("*")
        if path.is_file()
    }
    missing = sorted(set(expected) - actual_paths)
    extra = sorted(actual_paths - set(expected))
    mismatched: list[tuple[str, str, str]] = []

    for relative, expected_sha in sorted(expected.items()):
        source_path = SOURCE_ROOT.joinpath(*PurePosixPath(relative).parts)
        if not source_path.is_file():
            continue
        actual_sha = git_blob_sha1(source_path.read_bytes())
        if actual_sha != expected_sha:
            mismatched.append((relative, expected_sha, actual_sha))

    if missing:
        errors.append("Missing source files: " + ", ".join(missing))
    if extra:
        errors.append("Unmanifested source files: " + ", ".join(extra))
    if mismatched:
        errors.extend(
            f"Blob mismatch {path}: expected {expected_sha}, got {actual_sha}"
            for path, expected_sha, actual_sha in mismatched
        )

    if errors:
        print("Master Pack source snapshot: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        "Master Pack source snapshot: PASS "
        f"({len(expected)} exact files; manifest archive SHA-256: {manifest['archiveSha256']})"
    )
    print("Note: this verifies the recorded per-file Git blob identities, not the ZIP container hash.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

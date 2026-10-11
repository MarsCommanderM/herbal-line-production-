#!/usr/bin/env python3
"""Offline completeness and basic consistency checks for the Herbal Line master pack."""
from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md", "AGENTS.md", "PROJECT_MANIFEST.json", "RIGHTS_NOTICE.md",
    "START_HERE.md", "docs/00_MASTER_PRODUCTION_DOCUMENT.md",
    "docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md", "docs/12_SUBAGENT_BOUNDARIES.md",
    "docs/13_PRODUCTION_PHASE_PLAN.md", "docs/14_BACKLOG.md",
    "docs/15_TEST_AND_QA_STRATEGY.md", "docs/18_CI_CD_RELEASE_RUNBOOK.md",
    ".tasks/NEXT.md", ".tasks/BACKLOG.md", "rights/LICENSE_REGISTER.md",
    "contracts/commands.ts", "contracts/domain.ts", "contracts/events.ts",
    "contracts/persistence.ts", "schemas/save-envelope-v1.schema.json",
]

def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file():
            errors.append(f"missing required file: {rel}")
    manifest_path = ROOT / "PROJECT_MANIFEST.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for key in ("projectId", "title", "platform", "language", "productDescription", "releaseStandard"):
                if not manifest.get(key):
                    errors.append(f"manifest field is empty or missing: {key}")
            if manifest.get("title") != "Herbal Line":
                errors.append("manifest title does not match expected project title")
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"manifest cannot be parsed: {exc}")
    for path in (ROOT / "docs").glob("*.md"):
        if path.stat().st_size < 100:
            errors.append(f"suspiciously small documentation file: {path.relative_to(ROOT)}")
    if errors:
        print("MASTER PACK VALIDATION: FAILED")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"MASTER PACK VALIDATION: PASS ({len(REQUIRED)} required files checked)")
    print("Scope: package completeness and basic metadata only; does not validate the future game implementation.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

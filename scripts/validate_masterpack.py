#!/usr/bin/env python3
"""Offline completeness and basic consistency checks for the Herbal Line master pack.

This checks documentation/contract artifact integrity only. It does not build or test the game.
"""
from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md", "AGENTS.md", "PROJECT_MANIFEST.json", "RIGHTS_NOTICE.md",
    "START_HERE.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "docs/00_MASTER_PRODUCTION_DOCUMENT.md", "docs/01_GAME_VISION_AND_GDD.md",
    "docs/02_FEATURE_SCOPE_AND_RELEASE_CONTENT.md", "docs/03_CORE_LOOP_AND_USER_FLOWS.md",
    "docs/04_DOMAIN_MODEL_AND_STATE_MACHINES.md", "docs/05_TECH_ARCHITECTURE.md",
    "docs/06_CANONICAL_CONTRACTS.md", "docs/07_DATA_AND_RULES_CATALOG.md",
    "docs/08_MODULE_CONTRACTS.md", "docs/09_VISUAL_ART_AUDIO_UX.md",
    "docs/10_ASSET_PIPELINE_AND_LICENSE_GATE.md", "docs/11_AUTONOMOUS_AGENT_PLAYBOOK.md",
    "docs/12_SUBAGENT_BOUNDARIES.md", "docs/13_PRODUCTION_PHASE_PLAN.md",
    "docs/14_BACKLOG.md", "docs/15_TEST_AND_QA_STRATEGY.md",
    "docs/16_SECURITY_PRIVACY_AND_RELIABILITY.md", "docs/17_IP_RIGHTS_AND_COMPLIANCE.md",
    "docs/18_CI_CD_RELEASE_RUNBOOK.md", "docs/19_RISK_REGISTER.md",
    ".tasks/NEXT.md", ".tasks/BACKLOG.md", "rights/LICENSE_REGISTER.md",
    "contracts/commands.ts", "contracts/domain.ts", "contracts/events.ts",
    "contracts/persistence.ts", "schemas/content-manifest.schema.json",
    "schemas/order-template.schema.json", "schemas/plant-profile.schema.json",
    "schemas/room-definition.schema.json", "schemas/save-envelope-v1.schema.json",
    "schemas/balance.schema.json", "src/data/balance.json",
]
JSON_FILES = ["PROJECT_MANIFEST.json", "src/data/balance.json"] + [
    str(p.relative_to(ROOT)) for p in sorted((ROOT / "schemas").glob("*.json"))
] if (ROOT / "schemas").exists() else ["PROJECT_MANIFEST.json"]

def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file():
            errors.append(f"missing required file: {rel}")
    parsed_json: dict[str, object] = {}
    for rel in JSON_FILES:
        path = ROOT / rel
        if not path.is_file():
            errors.append(f"missing JSON file: {rel}")
            continue
        try:
            parsed_json[rel] = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"invalid JSON in {rel}: {exc}")
    balance = parsed_json.get("src/data/balance.json")
    if isinstance(balance, dict):
        if balance.get("schemaVersion") != 1 or not balance.get("balanceVersion"):
            errors.append("balance config must declare schemaVersion=1 and a non-empty balanceVersion")
        economy = balance.get("economy")
        if not isinstance(economy, dict) or not isinstance(economy.get("utilityRateCentsPerUnitHour"), int) or not isinstance(economy.get("operatingHoursPerCampaignDay"), int):
            errors.append("balance config economy rates must be integers")
        quality = balance.get("quality")
        if not isinstance(quality, dict) or not isinstance(quality.get("releaseThreshold"), int) or not isinstance(quality.get("reviewThreshold"), int) or not isinstance(quality.get("contaminationPenaltyMultiplier"), (int, float)):
            errors.append("balance config quality rules are incomplete")
        upgrades = balance.get("upgrades")
        if not isinstance(upgrades, list):
            errors.append("balance config upgrades must be an array")
        else:
            ids = [item.get("id") for item in upgrades if isinstance(item, dict)]
            if len(ids) != len(upgrades) or any(not isinstance(item, str) or not item for item in ids) or len(set(ids)) != len(ids):
                errors.append("balance config upgrade entries must have unique non-empty IDs")
    manifest = parsed_json.get("PROJECT_MANIFEST.json")
    if isinstance(manifest, dict):
        for key in ("projectId", "title", "platform", "language", "productDescription", "releaseStandard"):
            if not manifest.get(key):
                errors.append(f"manifest field is empty or missing: {key}")
        if manifest.get("title") != "Herbal Line":
            errors.append("manifest title does not match expected project title")
    for path in (ROOT / "docs").glob("*.md") if (ROOT / "docs").exists() else []:
        if path.stat().st_size < 100:
            errors.append(f"suspiciously small documentation file: {path.relative_to(ROOT)}")
    phase_plan = ROOT / "docs/13_PRODUCTION_PHASE_PLAN.md"
    if phase_plan.is_file():
        phase_text = phase_plan.read_text(encoding="utf-8")
        for phase in ("Phase 0", "Phase 19"):
            if phase not in phase_text:
                errors.append(f"phase plan missing required boundary: {phase}")
    if errors:
        print("MASTER PACK VALIDATION: FAILED")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"MASTER PACK VALIDATION: PASS ({len(REQUIRED)} required files; {len(JSON_FILES)} JSON documents parsed)")
    print("Scope: documentation/package completeness and JSON syntax only; this does not validate or build the game.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Offline package completeness plus strict validation of the balance JSON schema subset.

This script validates documentation/package artifacts. It does not build or test the game.
The balance schema validator intentionally fails closed when an unsupported schema keyword is added.
"""
from __future__ import annotations

import json
import math
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

SUPPORTED_SCHEMA_KEYWORDS = {
    "$schema", "title", "type", "additionalProperties", "required", "properties",
    "const", "minLength", "minimum", "maximum", "items", "uniqueItems",
}


def validate_json_schema(instance: object, schema: object, path: str = "$") -> list[str]:
    """Validate all schema keywords currently used by schemas/balance.schema.json."""
    if not isinstance(schema, dict):
        return [f"{path}: schema must be an object"]
    errors: list[str] = []
    unsupported = set(schema) - SUPPORTED_SCHEMA_KEYWORDS
    if unsupported:
        errors.append(f"{path}: unsupported schema keywords: {', '.join(sorted(unsupported))}")
        return errors

    expected = schema.get("type")
    if expected is not None:
        type_matches = {
            "object": isinstance(instance, dict),
            "array": isinstance(instance, list),
            "string": isinstance(instance, str),
            "integer": isinstance(instance, int) and not isinstance(instance, bool),
            "number": (
                (isinstance(instance, int) and not isinstance(instance, bool))
                or (isinstance(instance, float) and math.isfinite(instance))
            ),
            "boolean": isinstance(instance, bool),
        }.get(expected)
        if type_matches is None:
            errors.append(f"{path}: unsupported schema type {expected!r}")
            return errors
        if not type_matches:
            errors.append(f"{path}: expected {expected}")
            return errors

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{path}: must equal constant {schema['const']!r}")

    if isinstance(instance, str):
        min_length = schema.get("minLength")
        if isinstance(min_length, int) and len(instance) < min_length:
            errors.append(f"{path}: length must be at least {min_length}")

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if isinstance(instance, float) and not math.isfinite(instance):
            errors.append(f"{path}: number must be finite")
        else:
            if "minimum" in schema and instance < schema["minimum"]:
                errors.append(f"{path}: must be at least {schema['minimum']}")
            if "maximum" in schema and instance > schema["maximum"]:
                errors.append(f"{path}: must be at most {schema['maximum']}")

    if isinstance(instance, dict):
        required = schema.get("required", [])
        if not isinstance(required, list) or any(not isinstance(key, str) for key in required):
            errors.append(f"{path}: schema required must be an array of strings")
        else:
            for key in required:
                if key not in instance:
                    errors.append(f"{path}: missing required field {key}")

        properties = schema.get("properties", {})
        if not isinstance(properties, dict):
            errors.append(f"{path}: schema properties must be an object")
            return errors

        additional = schema.get("additionalProperties", True)
        if additional is False:
            for key in instance.keys() - properties.keys():
                errors.append(f"{path}: unexpected property {key}")
        elif additional is not True:
            errors.append(f"{path}: unsupported additionalProperties schema")

        for key, property_schema in properties.items():
            if key in instance:
                errors.extend(validate_json_schema(instance[key], property_schema, f"{path}.{key}"))

    if isinstance(instance, list):
        item_schema = schema.get("items")
        if item_schema is not None:
            for index, item in enumerate(instance):
                errors.extend(validate_json_schema(item, item_schema, f"{path}[{index}]"))
        if schema.get("uniqueItems") is True:
            serialized = [
                json.dumps(item, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=True)
                for item in instance
            ]
            if len(serialized) != len(set(serialized)):
                errors.append(f"{path}: items must be unique")

    return errors


def validate_balance_relationships(balance: object) -> list[str]:
    """Validate cross-field rules not represented in the portable JSON Schema."""
    if not isinstance(balance, dict):
        return []

    errors: list[str] = []
    quality = balance.get("quality")
    if isinstance(quality, dict):
        release = quality.get("releaseThreshold")
        review = quality.get("reviewThreshold")
        if (
            isinstance(release, int) and not isinstance(release, bool)
            and isinstance(review, int) and not isinstance(review, bool)
            and review > release
        ):
            errors.append("balance quality reviewThreshold cannot exceed releaseThreshold")

    upgrades = balance.get("upgrades")
    if not isinstance(upgrades, list):
        return errors

    ids: list[str] = []
    dependency_by_id: dict[str, str | None] = {}
    for index, upgrade in enumerate(upgrades):
        if not isinstance(upgrade, dict):
            continue
        upgrade_id = upgrade.get("id")
        if not isinstance(upgrade_id, str) or not upgrade_id:
            continue
        if upgrade_id in ids:
            errors.append(f"balance upgrades[{index}] duplicates ID {upgrade_id}")
        ids.append(upgrade_id)

        prerequisite = upgrade.get("prerequisiteUpgradeId")
        if prerequisite is None:
            dependency_by_id[upgrade_id] = None
        elif isinstance(prerequisite, str):
            dependency_by_id[upgrade_id] = prerequisite

    id_set = set(ids)
    for upgrade_id, prerequisite in dependency_by_id.items():
        if prerequisite is not None and prerequisite not in id_set:
            errors.append(f"balance upgrade {upgrade_id} references missing prerequisite {prerequisite}")
        if prerequisite == upgrade_id:
            errors.append(f"balance upgrade {upgrade_id} cannot depend on itself")

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(upgrade_id: str) -> None:
        if upgrade_id in visiting:
            errors.append(f"balance upgrade prerequisite cycle includes {upgrade_id}")
            return
        if upgrade_id in visited:
            return
        visiting.add(upgrade_id)
        prerequisite = dependency_by_id.get(upgrade_id)
        if prerequisite in dependency_by_id:
            visit(prerequisite)
        visiting.remove(upgrade_id)
        visited.add(upgrade_id)

    for upgrade_id in dependency_by_id:
        visit(upgrade_id)
    return errors


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
    balance_schema = parsed_json.get("schemas/balance.schema.json")
    if balance is not None and balance_schema is not None:
        errors.extend(validate_json_schema(balance, balance_schema, "src/data/balance.json"))
        errors.extend(validate_balance_relationships(balance))

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
    print("Scope: documentation/package completeness, JSON syntax, and balance-schema consistency; this does not validate or build the game.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

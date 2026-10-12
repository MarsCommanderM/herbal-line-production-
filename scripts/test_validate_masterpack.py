from __future__ import annotations

import copy
import json
import unittest

from scripts.validate_masterpack import ROOT, validate_balance_relationships, validate_json_schema


class BalanceSchemaValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.balance = json.loads((ROOT / "src/data/balance.json").read_text(encoding="utf-8"))
        cls.schema = json.loads((ROOT / "schemas/balance.schema.json").read_text(encoding="utf-8"))

    def test_canonical_balance_matches_schema_and_dependency_rules(self) -> None:
        self.assertEqual(validate_json_schema(self.balance, self.schema, "balance"), [])
        self.assertEqual(validate_balance_relationships(self.balance), [])

    def test_schema_rejects_missing_required_fields_and_unknown_properties(self) -> None:
        missing = copy.deepcopy(self.balance)
        del missing["upgrades"][0]["costCents"]
        self.assertTrue(any("missing required field costCents" in error for error in validate_json_schema(missing, self.schema)))

        unknown = copy.deepcopy(self.balance)
        unknown["unexpected"] = True
        self.assertTrue(any("unexpected property unexpected" in error for error in validate_json_schema(unknown, self.schema)))

    def test_schema_rejects_out_of_range_values_and_duplicate_items(self) -> None:
        invalid_range = copy.deepcopy(self.balance)
        invalid_range["upgrades"][0]["utilityReductionPercent"] = 101
        self.assertTrue(any("must be at most 100" in error for error in validate_json_schema(invalid_range, self.schema)))

        duplicate_item = copy.deepcopy(self.balance)
        duplicate_item["upgrades"].append(copy.deepcopy(duplicate_item["upgrades"][0]))
        self.assertTrue(any("items must be unique" in error for error in validate_json_schema(duplicate_item, self.schema)))

    def test_schema_rejects_values_above_javascript_safe_integer_precision(self) -> None:
        too_large_rate = copy.deepcopy(self.balance)
        too_large_rate["economy"]["utilityRateCentsPerUnitHour"] = 9007199254740992
        rate_errors = validate_json_schema(too_large_rate, self.schema)
        self.assertTrue(any("must be at most 9007199254740991" in error for error in rate_errors))

        too_large_cost = copy.deepcopy(self.balance)
        too_large_cost["upgrades"][0]["costCents"] = 9007199254740992
        cost_errors = validate_json_schema(too_large_cost, self.schema)
        self.assertTrue(any("must be at most 9007199254740991" in error for error in cost_errors))

    def test_relationships_reject_duplicate_ids_and_missing_prerequisites(self) -> None:
        duplicate_id = copy.deepcopy(self.balance)
        duplicate_id["upgrades"][1]["id"] = duplicate_id["upgrades"][0]["id"]
        self.assertTrue(any("duplicates ID" in error for error in validate_balance_relationships(duplicate_id)))

        missing_prerequisite = copy.deepcopy(self.balance)
        missing_prerequisite["upgrades"][1]["prerequisiteUpgradeId"] = "unknown-upgrade"
        self.assertTrue(any("references missing prerequisite" in error for error in validate_balance_relationships(missing_prerequisite)))

    def test_relationships_reject_cycles_and_inconsistent_quality_thresholds(self) -> None:
        cycle = copy.deepcopy(self.balance)
        cycle["upgrades"][0]["prerequisiteUpgradeId"] = cycle["upgrades"][1]["id"]
        self.assertTrue(any("prerequisite cycle" in error for error in validate_balance_relationships(cycle)))

        inconsistent_quality = copy.deepcopy(self.balance)
        inconsistent_quality["quality"]["reviewThreshold"] = 90
        self.assertTrue(any("reviewThreshold cannot exceed releaseThreshold" in error for error in validate_balance_relationships(inconsistent_quality)))


if __name__ == "__main__":
    unittest.main()

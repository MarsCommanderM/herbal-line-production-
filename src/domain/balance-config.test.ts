import { describe, expect, it } from 'vitest';
import { GAME_BALANCE, parseGameBalanceConfig } from './balance-config';
import { ECONOMY_UPGRADES } from './upgrades';

function cloneConfig(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(GAME_BALANCE)) as Record<string, unknown>;
}

function objectField(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const field = value[key];
  if (typeof field !== 'object' || field === null || Array.isArray(field)) {
    throw new Error(key + ' fixture is not an object');
  }
  return field as Record<string, unknown>;
}

function upgradeArray(value: Record<string, unknown>): Record<string, unknown>[] {
  const upgrades = value['upgrades'];
  if (!Array.isArray(upgrades)) throw new Error('upgrades fixture is not an array');
  return upgrades.map((upgrade) => {
    if (typeof upgrade !== 'object' || upgrade === null || Array.isArray(upgrade)) {
      throw new Error('upgrade fixture is not an object');
    }
    return upgrade as Record<string, unknown>;
  });
}

describe('versioned fictional balance configuration', () => {
  it('keeps confirmed economy and quality rules in one runtime source', () => {
    expect(GAME_BALANCE).toMatchObject({
      schemaVersion: 1,
      balanceVersion: 'fictional-game-balance-v1',
      economy: { utilityRateCentsPerUnitHour: 125, operatingHoursPerCampaignDay: 24 },
      quality: { releaseThreshold: 75, reviewThreshold: 60, contaminationPenaltyMultiplier: 0.5 },
    });
  });

  it('preserves only upgrades with explicit implemented prices and effects', () => {
    expect(ECONOMY_UPGRADES.map(({ id, costCents, utilityReductionPercent, prerequisiteUpgradeId }) => ({
      id, costCents, utilityReductionPercent, prerequisiteUpgradeId,
    }))).toEqual([
      { id: 'energy-efficiency-1', costCents: 250_000, utilityReductionPercent: 20, prerequisiteUpgradeId: undefined },
      { id: 'energy-efficiency-2', costCents: 150_000, utilityReductionPercent: 10, prerequisiteUpgradeId: 'energy-efficiency-1' },
    ]);
    expect(ECONOMY_UPGRADES.some((upgrade) => upgrade.id === 'sensor_pack_1' || upgrade.id === 'drying_rack_1')).toBe(false);
  });

  it('rejects missing and unexpected configuration fields', () => {
    const missing = cloneConfig();
    delete missing['balanceVersion'];
    expect(() => parseGameBalanceConfig(missing)).toThrow(/missing required field balanceVersion/);

    const unexpected = cloneConfig();
    unexpected['silentDefault'] = true;
    expect(() => parseGameBalanceConfig(unexpected)).toThrow(/unexpected field silentDefault/);
  });

  it('rejects invalid monetary values and inconsistent quality thresholds', () => {
    const badMoney = cloneConfig();
    const upgrades = upgradeArray(badMoney);
    if (upgrades[0]) upgrades[0]['costCents'] = -1;
    expect(() => parseGameBalanceConfig(badMoney)).toThrow(/costCents.*allowed range/);

    const badQuality = cloneConfig();
    const quality = objectField(badQuality, 'quality');
    quality['reviewThreshold'] = 90;
    expect(() => parseGameBalanceConfig(badQuality)).toThrow(/reviewThreshold cannot exceed releaseThreshold/);
  });

  it('rejects duplicate IDs, missing prerequisites and dependency cycles', () => {
    const duplicate = cloneConfig();
    const duplicatedUpgrades = upgradeArray(duplicate);
    const first = duplicatedUpgrades[0];
    const second = duplicatedUpgrades[1];
    if (!first || !second) throw new Error('Baseline upgrade fixtures are incomplete.');
    second['id'] = first['id'];
    expect(() => parseGameBalanceConfig(duplicate)).toThrow(/must be unique/);

    const missingDependency = cloneConfig();
    const missingDependencyUpgrades = upgradeArray(missingDependency);
    const dependent = missingDependencyUpgrades[1];
    if (!dependent) throw new Error('Dependent upgrade fixture is missing.');
    dependent['prerequisiteUpgradeId'] = 'not-defined';
    expect(() => parseGameBalanceConfig(missingDependency)).toThrow(/references unknown upgrade/);

    const cycle = cloneConfig();
    const cycleUpgrades = upgradeArray(cycle);
    const cycleFirst = cycleUpgrades[0];
    const cycleSecond = cycleUpgrades[1];
    if (!cycleFirst || !cycleSecond) throw new Error('Baseline upgrade fixtures are incomplete.');
    cycleFirst['prerequisiteUpgradeId'] = cycleSecond['id'];
    expect(() => parseGameBalanceConfig(cycle)).toThrow(/prerequisite dependency cycle/);
  });
});

import { describe, expect, it } from 'vitest';
import { GAME_BALANCE } from './balance-config';
import { ECONOMY_UPGRADES } from './upgrades';

describe('versioned fictional balance configuration', () => {
  it('keeps confirmed economy and quality rules in one runtime source', () => {
    expect(GAME_BALANCE).toMatchObject({
      schemaVersion: 1,
      balanceVersion: 'fictional-game-balance-v1',
      economy: { utilityRateCentsPerUnitHour: 125, operatingHoursPerCampaignDay: 24 },
      quality: { releaseThreshold: 75, reviewThreshold: 60, contaminationPenaltyMultiplier: 0.5 },
    });
  });

  it('preserves only the two upgrades with explicit implemented prices and effects', () => {
    expect(ECONOMY_UPGRADES.map(({ id, costCents, utilityReductionPercent, prerequisiteUpgradeId }) => ({ id, costCents, utilityReductionPercent, prerequisiteUpgradeId }))).toEqual([
      { id: 'energy-efficiency-1', costCents: 250_000, utilityReductionPercent: 20, prerequisiteUpgradeId: undefined },
      { id: 'energy-efficiency-2', costCents: 150_000, utilityReductionPercent: 10, prerequisiteUpgradeId: 'energy-efficiency-1' },
    ]);
    expect(ECONOMY_UPGRADES.some((upgrade) => upgrade.id === 'sensor_pack_1' || upgrade.id === 'drying_rack_1')).toBe(false);
  });
});

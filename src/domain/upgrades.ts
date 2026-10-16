import type { GameState, MoneyCents } from '../../contracts/domain';

/**
 * The source pack names these upgrade IDs but does not assign prices, effects,
 * prerequisites or unlock rules. They remain unavailable until those game-only
 * balance values are explicitly approved and versioned.
 */
export const SENSOR_PACK_UPGRADE_ID = 'sensor_pack_1';
export const DRYING_RACK_UPGRADE_ID = 'drying_rack_1';

export interface EconomyUpgradeDefinition {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
  prerequisiteUpgradeId?: string;
}

/** Intentionally empty: no unapproved numeric upgrade definitions are active. */
export const ECONOMY_UPGRADES: readonly EconomyUpgradeDefinition[] = [];

export function getEconomyUpgradeDefinition(id: string): EconomyUpgradeDefinition | undefined {
  return ECONOMY_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function isEconomyUpgradePurchased(
  state: Pick<GameState, 'upgrades'>,
  upgradeId: string,
): boolean {
  return state.upgrades.some((upgrade) => upgrade.id === upgradeId && upgrade.unlocked && upgrade.purchasedAt !== null);
}

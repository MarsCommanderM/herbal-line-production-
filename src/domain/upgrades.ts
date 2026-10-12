import type { GameState, MoneyCents } from '../../contracts/domain';
import { GAME_BALANCE } from './balance-config';

export const ENERGY_EFFICIENCY_UPGRADE_ID = GAME_BALANCE.upgrades[0].id;
export const ENERGY_EFFICIENCY_UPGRADE_2_ID = GAME_BALANCE.upgrades[1].id;

export interface EconomyUpgradeDefinition {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
  prerequisiteUpgradeId?: string;
}

export const ECONOMY_UPGRADES: readonly EconomyUpgradeDefinition[] = GAME_BALANCE.upgrades.map((upgrade) => ({
  ...upgrade,
  costCents: upgrade.costCents as MoneyCents,
}));

export function getEconomyUpgradeDefinition(id: string): EconomyUpgradeDefinition | undefined {
  return ECONOMY_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function isEconomyUpgradePurchased(
  state: Pick<GameState, 'upgrades'>,
  upgradeId: string,
): boolean {
  return state.upgrades.some((upgrade) => upgrade.id === upgradeId && upgrade.unlocked && upgrade.purchasedAt !== null);
}

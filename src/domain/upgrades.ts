import type { GameState, MoneyCents } from '../../contracts/domain';
import { GAME_BALANCE } from './balance-config';

function requiredUpgradeId(id: string): string {
  const upgrade = GAME_BALANCE.upgrades.find((item) => item.id === id);
  if (!upgrade) throw new Error('Required balance upgrade is missing: ' + id);
  return upgrade.id;
}

export const ENERGY_EFFICIENCY_UPGRADE_ID = requiredUpgradeId('energy-efficiency-1');
export const ENERGY_EFFICIENCY_UPGRADE_2_ID = requiredUpgradeId('energy-efficiency-2');

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

import type { GameState, MoneyCents } from '../../contracts/domain';

export const ENERGY_EFFICIENCY_UPGRADE_ID = 'energy-efficiency-1';

export interface EconomyUpgradeDefinition {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
}

export const ECONOMY_UPGRADES: readonly EconomyUpgradeDefinition[] = [
  {
    id: ENERGY_EFFICIENCY_UPGRADE_ID,
    label: 'Energieeffizienz I',
    description: 'Senkt die fiktiven Energiekosten dauerhaft um 20 Prozent.',
    costCents: 250_000 as MoneyCents,
    utilityReductionPercent: 20,
  },
];

export function getEconomyUpgradeDefinition(id: string): EconomyUpgradeDefinition | undefined {
  return ECONOMY_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function isEconomyUpgradePurchased(
  state: Pick<GameState, 'upgrades'>,
  upgradeId: string,
): boolean {
  return state.upgrades.some((upgrade) => upgrade.id === upgradeId && upgrade.unlocked && upgrade.purchasedAt !== null);
}

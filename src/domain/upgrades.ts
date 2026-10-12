import type { GameState, MoneyCents } from '../../contracts/domain';

export const ENERGY_EFFICIENCY_UPGRADE_ID = 'energy-efficiency-1';
export const ENERGY_EFFICIENCY_UPGRADE_2_ID = 'energy-efficiency-2';

export interface EconomyUpgradeDefinition {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
  prerequisiteUpgradeId?: string;
}

export const ECONOMY_UPGRADES: readonly EconomyUpgradeDefinition[] = [
  {
    id: ENERGY_EFFICIENCY_UPGRADE_ID,
    label: 'Energieeffizienz I',
    description: 'Senkt die fiktiven Energiekosten dauerhaft um 20 Prozent.',
    costCents: 250_000 as MoneyCents,
    utilityReductionPercent: 20,
  },
  {
    id: ENERGY_EFFICIENCY_UPGRADE_2_ID,
    label: 'Energieeffizienz II',
    description: 'Reduziert die verbleibenden fiktiven Energiekosten zusätzlich um 10 Prozent.',
    costCents: 150_000 as MoneyCents,
    utilityReductionPercent: 10,
    prerequisiteUpgradeId: ENERGY_EFFICIENCY_UPGRADE_ID,
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

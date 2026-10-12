import type { MoneyCents } from '../../contracts/domain';
import balance from '../data/balance.json';

export interface BalanceUpgradeConfig {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
  prerequisiteUpgradeId?: string;
}

export interface GameBalanceConfig {
  schemaVersion: 1;
  balanceVersion: string;
  economy: {
    utilityRateCentsPerUnitHour: number;
    operatingHoursPerCampaignDay: number;
  };
  quality: {
    releaseThreshold: number;
    reviewThreshold: number;
    contaminationPenaltyMultiplier: number;
  };
  upgrades: BalanceUpgradeConfig[];
}

export const GAME_BALANCE = balance as GameBalanceConfig;

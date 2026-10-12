import type { EconomyState, GameState, LedgerEntry, MoneyCents, EntityId, SimulationMinute } from '../../contracts/domain';
import { ENERGY_EFFICIENCY_UPGRADE_ID, isEconomyUpgradePurchased } from './upgrades';

export interface LedgerTotals {
  revenueCents: number;
  expenseCents: number;
  penaltiesCents: number;
  investmentsCents: number;
  refundsCents: number;
  balanceCents: number;
}

function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

/** Derives the current balance from the opening balance and immutable ledger entries. */
export function getBalanceCents(economy: EconomyState): MoneyCents {
  assertNonNegativeSafeInteger(economy.openingBalanceCents, 'openingBalanceCents');
  let balance: number = economy.openingBalanceCents;
  for (const entry of economy.ledger) {
    assertNonNegativeSafeInteger(entry.amountCents, 'ledger.amountCents');
    switch (entry.account) {
      case 'revenue':
      case 'refund':
        balance += entry.amountCents;
        break;
      case 'expense':
      case 'penalty':
      case 'investment':
        balance -= entry.amountCents;
        break;
      default: {
        const exhaustive: never = entry.account;
        throw new TypeError(`Unsupported ledger account: ${String(exhaustive)}`);
      }
    }
    if (!Number.isSafeInteger(balance)) {
      throw new RangeError('Ledger balance exceeded safe integer precision');
    }
  }
  return balance as MoneyCents;
}

/** Calculates ledger totals without maintaining duplicate mutable summary fields. */
export function getLedgerTotals(entries: readonly LedgerEntry[]): Omit<LedgerTotals, 'balanceCents'> {
  const totals = {
    revenueCents: 0,
    expenseCents: 0,
    penaltiesCents: 0,
    investmentsCents: 0,
    refundsCents: 0,
  };
  for (const entry of entries) {
    assertNonNegativeSafeInteger(entry.amountCents, 'ledger.amountCents');
    switch (entry.account) {
      case 'revenue': totals.revenueCents += entry.amountCents; break;
      case 'expense': totals.expenseCents += entry.amountCents; break;
      case 'penalty': totals.penaltiesCents += entry.amountCents; break;
      case 'investment': totals.investmentsCents += entry.amountCents; break;
      case 'refund': totals.refundsCents += entry.amountCents; break;
      default: {
        const exhaustive: never = entry.account;
        throw new TypeError(`Unsupported ledger account: ${String(exhaustive)}`);
      }
    }
  }
  for (const [field, value] of Object.entries(totals)) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`Ledger total ${field} exceeded safe integer precision`);
  }
  return totals;
}

export interface DailyOperatingCosts {
  staffWagesCents: number;
  utilitiesCents: number;
  totalCents: number;
}

export const UTILITY_RATE_CENTS_PER_UNIT_HOUR = 125;
export const OPERATING_HOURS_PER_CAMPAIGN_DAY = 24;

/** Pure fictional game-balance model. Only unlocked rooms consume utility units. */
export function calculateDailyOperatingCosts(state: Pick<GameState, 'staff' | 'rooms' | 'upgrades'>): DailyOperatingCosts {
  let staffWagesCents = 0;
  for (const staff of state.staff) {
    assertNonNegativeSafeInteger(Number(staff.wageCentsPerDay), 'staff.wageCentsPerDay');
    staffWagesCents += Number(staff.wageCentsPerDay);
  }

  let powerUnitsPerHour = 0;
  for (const room of state.rooms) {
    if (!room.unlocked) continue;
    if (!Number.isSafeInteger(room.powerUnitsPerHour) || room.powerUnitsPerHour < 0) {
      throw new RangeError('room.powerUnitsPerHour must be a non-negative safe integer');
    }
    powerUnitsPerHour += room.powerUnitsPerHour;
  }

  const baseUtilitiesCents = powerUnitsPerHour * OPERATING_HOURS_PER_CAMPAIGN_DAY * UTILITY_RATE_CENTS_PER_UNIT_HOUR;
  const utilitiesCents = isEconomyUpgradePurchased(state, ENERGY_EFFICIENCY_UPGRADE_ID)
    ? Math.floor(baseUtilitiesCents * 80 / 100)
    : baseUtilitiesCents;
  const totalCents = staffWagesCents + utilitiesCents;
  for (const [field, value] of Object.entries({ staffWagesCents, utilitiesCents, totalCents })) {
    assertNonNegativeSafeInteger(value, field);
  }
  return { staffWagesCents, utilitiesCents, totalCents };
}

/** Creates idempotent ledger postings for a completed campaign day. */
export function createDailyOperatingLedgerEntries(
  state: Pick<GameState, 'staff' | 'rooms' | 'economy' | 'upgrades'>,
  completedDay: number,
  simulationMinute: SimulationMinute,
): LedgerEntry[] {
  if (!Number.isSafeInteger(completedDay) || completedDay < 1) {
    throw new RangeError('completedDay must be a positive safe integer');
  }
  const costs = calculateDailyOperatingCosts(state);
  const existingKeys = new Set(state.economy.ledger.map((entry) => entry.idempotencyKey));
  const entries: LedgerEntry[] = [];
  const postings = [
    { suffix: 'wages', amount: costs.staffWagesCents, reasonCode: 'DAILY_STAFF_WAGES' },
    { suffix: 'utilities', amount: costs.utilitiesCents, reasonCode: 'DAILY_UTILITIES' },
  ] as const;

  for (const posting of postings) {
    const idempotencyKey = 'operating-costs:day:' + completedDay + ':' + posting.suffix;
    if (existingKeys.has(idempotencyKey)) continue;
    entries.push({
      id: ('ledger-day-' + completedDay + '-' + posting.suffix) as EntityId,
      simulationMinute,
      account: 'expense',
      amountCents: posting.amount as MoneyCents,
      referenceId: null,
      reasonCode: posting.reasonCode,
      idempotencyKey,
    });
  }
  return entries;
}

export interface ProjectedEconomyDay {
  dayOffset: number;
  openingBalanceCents: number;
  expectedRevenueCents: number;
  operatingCostsCents: number;
  closingBalanceCents: number;
}

/**
 * Pure scenario projection. Revenue is an explicit scenario input; the default assumes no future sales.
 * This is game-balance tooling, not a real-world financial estimate.
 */
export function projectCampaignBalance(
  state: Pick<GameState, 'staff' | 'rooms' | 'economy' | 'upgrades'>,
  days: number,
  expectedDailyRevenueCents = 0,
): ProjectedEconomyDay[] {
  if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
    throw new RangeError('days must be a safe integer between 1 and 3650');
  }
  assertNonNegativeSafeInteger(expectedDailyRevenueCents, 'expectedDailyRevenueCents');
  const operatingCostsCents = calculateDailyOperatingCosts(state).totalCents;
  let balance = Number(getBalanceCents(state.economy));
  const projection: ProjectedEconomyDay[] = [];

  for (let dayOffset = 1; dayOffset <= days; dayOffset += 1) {
    const openingBalanceCents = balance;
    balance += expectedDailyRevenueCents - operatingCostsCents;
    if (!Number.isSafeInteger(balance)) throw new RangeError('Projected balance exceeded safe integer precision');
    projection.push({
      dayOffset,
      openingBalanceCents,
      expectedRevenueCents: expectedDailyRevenueCents,
      operatingCostsCents,
      closingBalanceCents: balance,
    });
  }
  return projection;
}

/** Number of full days before funds are exhausted under a fixed daily revenue scenario; null means no net burn. */
export function getCashRunwayDays(
  state: Pick<GameState, 'staff' | 'rooms' | 'economy' | 'upgrades'>,
  expectedDailyRevenueCents = 0,
): number | null {
  assertNonNegativeSafeInteger(expectedDailyRevenueCents, 'expectedDailyRevenueCents');
  const dailyNetBurn = calculateDailyOperatingCosts(state).totalCents - expectedDailyRevenueCents;
  if (dailyNetBurn <= 0) return null;
  const balance = Number(getBalanceCents(state.economy));
  if (balance <= 0) return 0;
  return Math.floor(balance / dailyNetBurn);
}

export type FinancialHealth = 'stable' | 'watch' | 'critical';

/** Game-only distress indicator based on current cash and zero-revenue runway. */
export function getFinancialHealth(
  state: Pick<GameState, 'staff' | 'rooms' | 'economy' | 'upgrades'>,
): FinancialHealth {
  const balance = Number(getBalanceCents(state.economy));
  if (balance < 0) return 'critical';
  const runway = getCashRunwayDays(state);
  if (runway !== null && runway < 7) return 'critical';
  if (runway !== null && runway < 30) return 'watch';
  return 'stable';
}

import { describe, expect, it } from 'vitest';
import type { EconomyState, LedgerEntry, MoneyCents, EntityId, SimulationMinute } from '../../contracts/domain';
import { calculateDailyOperatingCosts, createDailyOperatingLedgerEntries, getBalanceCents, getCashRunwayDays, getLedgerTotals, projectCampaignBalance } from './finance';
import { createInitialGameState } from './initial-state';

const id = (value: string) => value as EntityId;
const minute = (value: number) => value as SimulationMinute;
const cents = (value: number) => value as MoneyCents;

function entry(account: LedgerEntry['account'], amount: number, suffix: string): LedgerEntry {
  return {
    id: id(`entry-${suffix}`),
    simulationMinute: minute(10),
    account,
    amountCents: cents(amount),
    referenceId: null,
    reasonCode: `test.${suffix}`,
    idempotencyKey: `key-${suffix}`,
  };
}

describe('ledger-derived finance', () => {
  it('derives balance from the opening balance and postings', () => {
    const economy: EconomyState = {
      openingBalanceCents: cents(100_000),
      ledger: [
        entry('revenue', 25_000, 'revenue'),
        entry('expense', 5_500, 'expense'),
        entry('penalty', 1_000, 'penalty'),
        entry('investment', 10_000, 'investment'),
        entry('refund', 500, 'refund'),
      ],
    };
    expect(getBalanceCents(economy)).toBe(109_000);
  });

  it('derives totals without mutable summary fields', () => {
    expect(getLedgerTotals([entry('revenue', 100, 'r'), entry('expense', 30, 'e')])).toEqual({
      revenueCents: 100,
      expenseCents: 30,
      penaltiesCents: 0,
      investmentsCents: 0,
      refundsCents: 0,
    });
  });

  it('rejects invalid ledger amounts', () => {
    expect(() => getLedgerTotals([entry('expense', -1, 'negative')])).toThrow(RangeError);
    expect(() => getLedgerTotals([entry('revenue', Number.MAX_SAFE_INTEGER + 1, 'unsafe')])).toThrow(RangeError);
  });

  it('calculates deterministic fictional daily wages and utility costs', () => {
    const state = createInitialGameState();
    expect(calculateDailyOperatingCosts(state)).toEqual({
      staffWagesCents: 64_000,
      utilitiesCents: 24_000,
      totalCents: 88_000,
    });
  });

  it('creates idempotent daily expense postings with stable keys and IDs', () => {
    const state = createInitialGameState();
    const postings = createDailyOperatingLedgerEntries(state, 1, minute(1440));
    expect(postings).toHaveLength(2);
    expect(postings.map((item) => item.reasonCode)).toEqual(['DAILY_STAFF_WAGES', 'DAILY_UTILITIES']);
    expect(postings.map((item) => item.idempotencyKey)).toEqual([
      'operating-costs:day:1:wages',
      'operating-costs:day:1:utilities',
    ]);
    expect(postings.reduce((sum, item) => sum + Number(item.amountCents), 0)).toBe(88_000);

    const withPostings = { ...state, economy: { ...state.economy, ledger: postings } };
    expect(createDailyOperatingLedgerEntries(withPostings, 1, minute(1440))).toEqual([]);
    expect(createDailyOperatingLedgerEntries(withPostings, 2, minute(2880))).toHaveLength(2);
  });

  it('projects a 30-day zero-revenue scenario without mutating the live ledger', () => {
    const state = createInitialGameState();
    const projection = projectCampaignBalance(state, 30);
    expect(projection).toHaveLength(30);
    expect(projection[0]).toEqual({
      dayOffset: 1,
      openingBalanceCents: 25_000_000,
      expectedRevenueCents: 0,
      operatingCostsCents: 88_000,
      closingBalanceCents: 24_912_000,
    });
    expect(projection[29]?.closingBalanceCents).toBe(22_360_000);
    expect(state.economy.ledger).toEqual([]);
  });

  it('models explicit daily revenue and estimates cash runway without hiding distress', () => {
    const state = createInitialGameState();
    expect(projectCampaignBalance(state, 30, 100_000).at(-1)?.closingBalanceCents).toBe(25_360_000);
    expect(getCashRunwayDays(state)).toBe(284);
    expect(getCashRunwayDays(state, 100_000)).toBeNull();

    const lowFunds = { ...state, economy: { ...state.economy, openingBalanceCents: cents(1) } };
    expect(getCashRunwayDays(lowFunds)).toBe(0);
  });

  it('rejects invalid forecast horizons and revenue assumptions', () => {
    const state = createInitialGameState();
    expect(() => projectCampaignBalance(state, 0)).toThrow(RangeError);
    expect(() => projectCampaignBalance(state, 3651)).toThrow(RangeError);
    expect(() => projectCampaignBalance(state, 3, -1)).toThrow(RangeError);
    expect(() => getCashRunwayDays(state, Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it('allows a negative balance as a detectable state instead of hiding it', () => {
    const economy: EconomyState = { openingBalanceCents: cents(100), ledger: [entry('expense', 101, 'overdrawn')] };
    expect(getBalanceCents(economy)).toBe(-1);
  });
});

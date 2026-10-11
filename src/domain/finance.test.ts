import { describe, expect, it } from 'vitest';
import type { EconomyState, LedgerEntry, MoneyCents, EntityId, SimulationMinute } from '../../contracts/domain';
import { getBalanceCents, getLedgerTotals } from './finance';

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

  it('allows a negative balance as a detectable state instead of hiding it', () => {
    const economy: EconomyState = { openingBalanceCents: cents(100), ledger: [entry('expense', 101, 'overdrawn')] };
    expect(getBalanceCents(economy)).toBe(-1);
  });
});

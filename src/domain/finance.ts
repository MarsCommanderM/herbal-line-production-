import type { EconomyState, LedgerEntry, MoneyCents } from '../../contracts/domain';

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

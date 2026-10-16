import { describe, expect, it } from 'vitest';
import type { ComplianceState } from '../../contracts/domain';
import { reserveInventory, transitionBatch } from './transitions';

const compliance = (licenseStatus: ComplianceState['licenseStatus'], blockedOperationCodes: string[] = []) => ({
  licenseStatus,
  blockedOperationCodes,
});

describe('fictional batch transitions', () => {
  it('rejects illegal transitions', () => {
    expect(transitionBatch('created', 'released', {
      qualityDecision: 'pass', traceComplete: true, compliance: compliance('valid'),
    })).toEqual({ ok: false, error: 'INVALID_TRANSITION' });
  });

  it('requires pass decision and complete trace before release', () => {
    expect(transitionBatch('awaiting_qc', 'released', {
      qualityDecision: 'review', traceComplete: true, compliance: compliance('valid'),
    })).toEqual({ ok: false, error: 'QUALITY_GATE_FAILED' });
    expect(transitionBatch('awaiting_qc', 'released', {
      qualityDecision: 'pass', traceComplete: false, compliance: compliance('valid'),
    })).toEqual({ ok: false, error: 'TRACEABILITY_INCOMPLETE' });
  });

  it('blocks release during suspended or recovery review status', () => {
    for (const status of ['suspended', 'recovery_review'] as const) {
      expect(transitionBatch('awaiting_qc', 'released', {
        qualityDecision: 'pass', traceComplete: true, compliance: compliance(status),
      })).toEqual({ ok: false, error: 'COMPLIANCE_BLOCKED' });
    }
  });

  it('permits release only when all fictional gates pass', () => {
    expect(transitionBatch('awaiting_qc', 'released', {
      qualityDecision: 'pass', traceComplete: true, compliance: compliance('valid'),
    })).toEqual({ ok: true, status: 'released' });
  });
});

describe('inventory reservation', () => {
  const lot = { quantityAvailable: 12, quantityReserved: 2, status: 'released' as const };

  it('reserves within free quantity and preserves disposition status', () => {
    expect(reserveInventory(lot, 4)).toEqual({
      ok: true,
      reservation: { quantityAvailable: 12, quantityReserved: 6, status: 'released' },
    });
  });

  it('allows a previously reserved lot to receive an additional reservation while preserving status', () => {
    expect(reserveInventory({ ...lot, quantityReserved: 5, status: 'reserved' }, 3)).toEqual({
      ok: true,
      reservation: { quantityAvailable: 12, quantityReserved: 8, status: 'reserved' },
    });
  });

  it('rejects over-allocation without mutating the source', () => {
    expect(reserveInventory(lot, 11)).toEqual({ ok: false, error: 'INSUFFICIENT_STOCK' });
    expect(lot.quantityReserved).toBe(2);
  });

  it('rejects non-released lots and invalid quantities', () => {
    expect(reserveInventory({ ...lot, status: 'held' }, 1)).toEqual({ ok: false, error: 'LOT_NOT_RELEASED' });
    expect(reserveInventory(lot, 0)).toEqual({ ok: false, error: 'INVALID_QUANTITY' });
  });
});

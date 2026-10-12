import type { BatchStatus, ComplianceState } from '../../contracts/domain';

export type QualityDecision = 'pass' | 'fail' | 'review';
export type BatchTransitionError =
  | 'INVALID_TRANSITION'
  | 'QUALITY_GATE_FAILED'
  | 'TRACEABILITY_INCOMPLETE'
  | 'COMPLIANCE_BLOCKED';

export type TransitionResult =
  | { ok: true; status: BatchStatus }
  | { ok: false; error: BatchTransitionError };

const TRANSITIONS: Readonly<Record<BatchStatus, readonly BatchStatus[]>> = {
  created: ['queued', 'rejected', 'quarantined'],
  queued: ['processing', 'rejected', 'quarantined'],
  processing: ['awaiting_qc', 'rejected', 'quarantined'],
  awaiting_qc: ['released', 'rejected', 'quarantined'],
  released: [],
  rejected: [],
  quarantined: [],
};

export interface BatchTransitionContext {
  qualityDecision?: QualityDecision;
  traceComplete?: boolean;
  compliance: Pick<ComplianceState, 'licenseStatus' | 'blockedOperationCodes'>;
}

/** Pure transition gate. It changes no state and uses only fictional game rules. */
export function transitionBatch(
  current: BatchStatus,
  next: BatchStatus,
  context: BatchTransitionContext,
): TransitionResult {
  if (!TRANSITIONS[current].includes(next)) return { ok: false, error: 'INVALID_TRANSITION' };

  if (next === 'released') {
    if (context.qualityDecision !== 'pass') return { ok: false, error: 'QUALITY_GATE_FAILED' };
    if (context.traceComplete !== true) return { ok: false, error: 'TRACEABILITY_INCOMPLETE' };
    if (
      context.compliance.licenseStatus === 'suspended' ||
      context.compliance.licenseStatus === 'recovery_review' ||
      context.compliance.blockedOperationCodes.includes('BATCH/RELEASE')
    ) {
      return { ok: false, error: 'COMPLIANCE_BLOCKED' };
    }
  }
  return { ok: true, status: next };
}

export interface InventoryReservation {
  quantityAvailable: number;
  quantityReserved: number;
  status: 'held' | 'released' | 'reserved' | 'depleted' | 'expired' | 'rejected';
}

export type ReservationResult =
  | { ok: true; reservation: InventoryReservation }
  | { ok: false; error: 'INVALID_QUANTITY' | 'LOT_NOT_RELEASED' | 'INSUFFICIENT_STOCK' };

/** Reserves abstract inventory atomically without changing its disposition status. */
export function reserveInventory(
  lot: InventoryReservation,
  quantity: number,
): ReservationResult {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return { ok: false, error: 'INVALID_QUANTITY' };
  if (lot.status !== 'released' && lot.status !== 'reserved') return { ok: false, error: 'LOT_NOT_RELEASED' };
  if (
    !Number.isSafeInteger(lot.quantityAvailable) ||
    !Number.isSafeInteger(lot.quantityReserved) ||
    lot.quantityAvailable < 0 ||
    lot.quantityReserved < 0 ||
    lot.quantityReserved > lot.quantityAvailable
  ) return { ok: false, error: 'INSUFFICIENT_STOCK' };
  const free = lot.quantityAvailable - lot.quantityReserved;
  if (quantity > free) return { ok: false, error: 'INSUFFICIENT_STOCK' };
  return { ok: true, reservation: { ...lot, quantityReserved: lot.quantityReserved + quantity } };
}

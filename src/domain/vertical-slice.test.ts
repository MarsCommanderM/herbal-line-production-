import { describe, expect, it } from 'vitest';
import type { CommandId, EntityId, Score0To100 } from '../../contracts/domain';
import type { VerticalSliceCommand } from './vertical-slice';
import { createInitialGameState } from './initial-state';
import { applyVerticalSliceCommand, getCampaignBalance } from './vertical-slice';

const entity = (value: string): EntityId => value as EntityId;
const commandId = (value: string): CommandId => value as CommandId;
let commandSequence = 0;

function dispatch(
  state: ReturnType<typeof createInitialGameState>,
  type: VerticalSliceCommand['type'],
  payload: Record<string, unknown> = {},
) {
  commandSequence += 1;
  const command = {
    commandId: commandId('test-command-' + commandSequence),
    actorId: state.player.id,
    expectedRevision: state.revision,
    type,
    ...payload,
  } as VerticalSliceCommand;
  return applyVerticalSliceCommand(state, command);
}

function applyOk(
  state: ReturnType<typeof createInitialGameState>,
  type: VerticalSliceCommand['type'],
  payload: Record<string, unknown> = {},
) {
  const result = dispatch(state, type, payload);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

function progressToReleasedInventory() {
  let state = createInitialGameState();
  state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
  state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
  state = applyOk(state, 'BATCH/CREATE', {
    batchId: entity('batch-001'),
    plantIds: [entity('plant-001')],
    profileId: 'fictional-botanical-batch',
  });
  state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
  state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-001'), machineId: entity('machine-processing-001') });
  state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-001'), assessmentId: entity('assessment-001') });
  state = applyOk(state, 'BATCH/RELEASE', { batchId: entity('batch-001') });
  return state;
}

describe('botanical operations vertical slice', () => {
  it('completes fictional stage, batch, QC, stock, buyer order, and delivery flow', () => {
    let state = progressToReleasedInventory();
    expect(state.batches[0]?.status).toBe('released');
    expect(state.qualityAssessments[0]?.decision).toBe('pass');
    expect(state.inventoryLots[0]?.quantityAvailable).toBe(6);
    expect(state.inventoryLots[0]?.status).toBe('released');

    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', {
      orderId: entity('order-buyer-001'),
      lotIds: [entity('inventory-batch-001')],
    });
    expect(state.inventoryLots[0]?.quantityReserved).toBe(6);
    state = applyOk(state, 'DELIVERY/CREATE', {
      deliveryId: entity('delivery-001'),
      orderId: entity('order-buyer-001'),
      routeId: 'fictional-route-local-01',
    });
    state = applyOk(state, 'DELIVERY/DISPATCH', { deliveryId: entity('delivery-001') });
    state = applyOk(state, 'DELIVERY/CONFIRM', {
      deliveryId: entity('delivery-001'),
      proofCode: 'RX-ACK-001',
    });

    expect(state.orders[0]?.status).toBe('delivered');
    expect(state.deliveries[0]?.status).toBe('delivered');
    expect(state.inventoryLots[0]?.quantityAvailable).toBe(0);
    expect(state.inventoryLots[0]?.quantityReserved).toBe(0);
    expect(state.inventoryLots[0]?.status).toBe('depleted');
    expect(state.economy.ledger).toHaveLength(1);
    expect(getCampaignBalance(state)).toBe(25_850_000);
  });

  it('does not post revenue twice when delivery confirmation is repeated', () => {
    let state = progressToReleasedInventory();
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', { orderId: entity('order-buyer-001'), lotIds: [entity('inventory-batch-001')] });
    state = applyOk(state, 'DELIVERY/CREATE', { deliveryId: entity('delivery-001'), orderId: entity('order-buyer-001'), routeId: 'route-01' });
    state = applyOk(state, 'DELIVERY/DISPATCH', { deliveryId: entity('delivery-001') });
    state = applyOk(state, 'DELIVERY/CONFIRM', { deliveryId: entity('delivery-001'), proofCode: 'RX-ACK-001' });
    const revision = state.revision;
    const repeated = dispatch(state, 'DELIVERY/CONFIRM', { deliveryId: entity('delivery-001'), proofCode: 'RX-ACK-001' });
    expect(repeated.ok).toBe(true);
    if (!repeated.ok) throw new Error(repeated.error.message);
    expect(repeated.state.revision).toBe(revision);
    expect(repeated.state.economy.ledger).toHaveLength(1);
  });

  it('rejects a stale command without changing the state', () => {
    const state = createInitialGameState();
    const command = {
      commandId: commandId('stale-command'),
      actorId: state.player.id,
      expectedRevision: 99,
      type: 'PLANT/ADVANCE_FICTIONAL_STEP',
      plantId: entity('plant-001'),
    } as VerticalSliceCommand;
    const result = applyVerticalSliceCommand(state, command);
    expect(result).toEqual({ ok: false, state, error: { code: 'STALE_REVISION', message: 'Der Spielstand wurde zwischenzeitlich geändert.' } });
  });

  it('blocks release when the saved QC decision is review', () => {
    let state = createInitialGameState();
    state = {
      ...state,
      plants: state.plants.map((plant) => ({ ...plant, qualityPotential: 62 as Score0To100 })),
    };
    state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
    state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-low-quality'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-low-quality'), roomId: entity('room-processing-01') });
    state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-low-quality'), machineId: entity('machine-processing-001') });
    state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-low-quality'), assessmentId: entity('assessment-low-quality') });
    expect(state.qualityAssessments[0]?.decision).toBe('review');
    const result = dispatch(state, 'BATCH/RELEASE', { batchId: entity('batch-low-quality') });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Release should have been blocked.');
    expect(result.error.code).toBe('QUALITY_GATE_FAILED');
    expect(result.state.inventoryLots).toHaveLength(0);
  });

  it('rejects a batch after unresolved QC and frees its room occupancy', () => {
    let state = createInitialGameState();
    state = {
      ...state,
      plants: state.plants.map((plant) => ({ ...plant, qualityPotential: 62 as Score0To100 })),
    };
    state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
    state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-reject'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-reject'), roomId: entity('room-processing-01') });
    state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-reject'), machineId: entity('machine-processing-001') });
    state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-reject'), assessmentId: entity('assessment-reject') });

    const qualityRoomBefore = state.rooms.find((room) => room.kind === 'quality')?.occupied;
    const rejected = applyOk(state, 'BATCH/REJECT', { batchId: entity('batch-reject'), reasonCode: 'QUALITY_REVIEW_NOT_ACCEPTED' });
    const batch = rejected.batches.find((item) => item.id === entity('batch-reject'));
    expect(batch?.status).toBe('rejected');
    expect(batch?.currentRoomId).toBeNull();
    expect(batch?.holdReason).toBe('QUALITY_REVIEW_NOT_ACCEPTED');
    expect(rejected.inventoryLots).toHaveLength(0);
    expect(rejected.rooms.find((room) => room.kind === 'quality')?.occupied).toBe(Math.max(0, (qualityRoomBefore ?? 0) - 1));

    const release = dispatch(rejected, 'BATCH/RELEASE', { batchId: entity('batch-reject') });
    expect(release.ok).toBe(false);
    if (release.ok) throw new Error('Rejected batch must not be released.');
    expect(release.error.code).toBe('INVALID_TRANSITION');

    const duplicate = dispatch(rejected, 'BATCH/REJECT', { batchId: entity('batch-reject'), reasonCode: 'SECOND_ATTEMPT' });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('Rejected batch must be terminal.');
    expect(duplicate.error.code).toBe('INVALID_TRANSITION');
  });

  it('requires a documented reason for batch rejection', () => {
    let state = createInitialGameState();
    state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
    state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-reason'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
    const result = dispatch(state, 'BATCH/REJECT', { batchId: entity('batch-reason'), reasonCode: 'x' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('A short rejection reason must be rejected.');
    expect(result.error.code).toBe('INVALID_PAYLOAD');
    expect(result.state).toEqual(state);
  });

  it('keeps inventory and order unchanged when allocation is insufficient', () => {
    let state = progressToReleasedInventory();
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
    state = {
      ...state,
      orders: state.orders.map((order) => ({ ...order, requestedQuantity: 99 })),
    };
    const result = dispatch(state, 'ORDER/ALLOCATE', { orderId: entity('order-buyer-001'), lotIds: [entity('inventory-batch-001')] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Allocation should have failed.');
    expect(result.error.code).toBe('INSUFFICIENT_STOCK');
    expect(result.state.inventoryLots[0]?.quantityReserved).toBe(0);
    expect(result.state.orders[0]?.status).toBe('accepted');
  });
  it('reassigns staff atomically and rejects incompatible room roles', () => {
    const initial = createInitialGameState();
    const moved = applyOk(initial, 'FACILITY/ASSIGN_STAFF', {
      staffId: entity('staff-operations-001'),
      roomId: entity('room-storage-01'),
    });
    expect(moved.staff.find((staff) => staff.id === entity('staff-operations-001'))?.assignedRoomId).toBe(entity('room-storage-01'));
    expect(moved.rooms.find((room) => room.id === entity('room-production-01'))?.assignedStaffIds).not.toContain(entity('staff-operations-001'));
    expect(moved.rooms.find((room) => room.id === entity('room-storage-01'))?.assignedStaffIds).toContain(entity('staff-operations-001'));

    const invalid = dispatch(moved, 'FACILITY/ASSIGN_STAFF', {
      staffId: entity('staff-quality-001'),
      roomId: entity('room-production-01'),
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) throw new Error('Quality staff must not be assigned to a production room.');
    expect(invalid.error.code).toBe('PRECONDITION_FAILED');
    expect(invalid.state).toEqual(moved);
  });

  it('requires a maintenance specialist and returns a maintained machine to idle', () => {
    const initial = createInitialGameState();
    const started = applyOk(initial, 'MACHINE/START_MAINTENANCE', { machineId: entity('machine-processing-001') });
    expect(started.machines[0]?.status).toBe('maintenance');
    expect(started.machines[0]?.activeJobId).toBeNull();

    const completed = applyOk(started, 'MACHINE/COMPLETE_MAINTENANCE', { machineId: entity('machine-processing-001') });
    expect(completed.machines[0]?.status).toBe('idle');
    expect(completed.machines[0]?.condition).toBe(100);
    expect(completed.logs.at(-1)?.code).toBe('MACHINE_MAINTENANCE_COMPLETED');
  });

  it('blocks maintenance during an active job and blocks machine moves while busy', () => {
    let state = createInitialGameState();
    state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
    state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-active'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-active'), roomId: entity('room-processing-01') });
    state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-active'), machineId: entity('machine-processing-001') });

    for (const [type, payload] of [
      ['MACHINE/START_MAINTENANCE', { machineId: entity('machine-processing-001') }],
      ['FACILITY/MOVE_MACHINE', { machineId: entity('machine-processing-001'), roomId: entity('room-production-01') }],
    ] as const) {
      const result = dispatch(state, type, payload);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Busy machines cannot be maintained or moved.');
      expect(result.error.code).toBe('PRECONDITION_FAILED');
      expect(result.state).toEqual(state);
    }
  });

  it('refuses to commit a command when facility invariants are already invalid', () => {
    const initial = createInitialGameState();
    const invalid = {
      ...initial,
      rooms: initial.rooms.map((room) => room.id === entity('room-production-01')
        ? { ...room, occupied: room.capacity + 1 }
        : room),
    };
    const result = dispatch(invalid, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Invalid facility state must not be committed.');
    expect(result.error.code).toBe('PRECONDITION_FAILED');
    expect(result.state).toEqual(invalid);
  });

  it('keeps facility invariants valid after the full campaign batch transition sequence', () => {
    const state = progressToReleasedInventory();
    expect(state.rooms.every((room) => Number.isSafeInteger(room.occupied) && room.occupied >= 0 && room.occupied <= room.capacity)).toBe(true);
    expect(state.machines.every((machine) => machine.status !== 'active' || machine.activeJobId !== null)).toBe(true);
  });

});

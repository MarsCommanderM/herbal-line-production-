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
    profileId: 'fictional-medical-cannabis-batch',
  });
  state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
  state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-001'), machineId: entity('machine-processing-001') });
  state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-001'), assessmentId: entity('assessment-001') });
  state = applyOk(state, 'BATCH/RELEASE', { batchId: entity('batch-001') });
  return state;
}

describe('medical cannabis operations vertical slice', () => {
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

  it('applies fictional plant-care settings, logs the change and rejects malformed settings atomically', () => {
    const initial = createInitialGameState();
    const cared = applyOk(initial, 'PLANT/CARE_ACTION', { plantId: entity('plant-001'), action: 'light', setting: 'low' });
    expect(cared.plants[0]?.care?.lightLevel).toBe('low');
    expect(cared.plants[0]?.stressIndex).toBeGreaterThan(initial.plants[0]!.stressIndex);
    expect(cared.logs.at(-1)?.code).toBe('PLANT_CARE_ACTION');
    expect(cared.revision).toBe(initial.revision + 1);

    const malformed = dispatch(initial, 'PLANT/CARE_ACTION', { plantId: entity('plant-001'), action: 'light', setting: 'extreme' });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.state).toBe(initial);
  });

  it('blocks visible plant care while the license is suspended without mutating campaign state', () => {
    const initial = createInitialGameState();
    const blockedState = {
      ...initial,
      compliance: { ...initial.compliance, licenseStatus: 'suspended' as const },
    };
    const result = dispatch(blockedState, 'PLANT/CARE_ACTION', {
      plantId: entity('plant-001'),
      action: 'water',
      setting: 'balanced',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Plant care must be blocked while the license is suspended.');
    expect(result.error.code).toBe('COMPLIANCE_BLOCKED');
    expect(result.state).toBe(blockedState);
    expect(result.state.plants).toEqual(initial.plants);
    expect(result.state.logs).toEqual(initial.logs);
    expect(result.state.revision).toBe(initial.revision);
  });

  it('cuts and sets a fictional propagation cutting with traceable parent linkage and room-capacity accounting', () => {
    let state = applyOk(createInitialGameState(), 'PLANT/CARE_ACTION', { plantId: entity('plant-001'), action: 'take_cutting' });
    expect(state.plants[0]?.care?.cuttingsTaken).toBe(1);
    state = applyOk(state, 'PLANT/CARE_ACTION', { plantId: entity('plant-001'), action: 'set_cutting' });
    const cutting = state.plants.find((plant) => plant.propagatedFromPlantId === entity('plant-001'));
    expect(cutting).toBeDefined();
    expect(cutting?.stage).toBe('active');
    expect(state.rooms.find((room) => room.id === entity('room-production-01'))?.occupied).toBe(2);
    expect(state.ui.selectedEntityId).toBe(cutting?.id);
    expect(state.plants[0]?.care?.cuttingsSet).toBe(1);
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

  it('refuses to commit a command that would preserve an invalid state invariant', () => {
    const initial = createInitialGameState();
    const invalidState = {
      ...initial,
      rooms: initial.rooms.map((room) => room.kind === 'storage' ? { ...room, occupied: room.capacity + 1 } : room),
    };
    const result = dispatch(invalidState, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('A command must not commit on top of an invalid state.');
    expect(result.error.code).toBe('PRECONDITION_FAILED');
    expect(result.state).toBe(invalidState);
    expect(result.state.plants[0]?.stage).toBe('active');
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
  it('offers one-time distress support only after cash is exhausted and restores runway', () => {
    const initial = createInitialGameState();
    const premature = dispatch(initial, 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT');
    expect(premature.ok).toBe(false);
    if (premature.ok) throw new Error('Support must not be available while the campaign has positive funds.');
    expect(premature.error.code).toBe('PRECONDITION_FAILED');
    expect(premature.state).toBe(initial);

    const noOpeningFunds = {
      ...initial,
      economy: { ...initial.economy, openingBalanceCents: 0 as typeof initial.economy.openingBalanceCents },
    };
    const exhausted = applyOk(noOpeningFunds, 'TIME/END_DAY');
    expect(getCampaignBalance(exhausted)).toBe(-88_000);

    const support = dispatch(exhausted, 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT');
    expect(support.ok).toBe(true);
    if (!support.ok) throw new Error(support.error.message);
    const grant = support.state.economy.ledger.at(-1);
    expect(grant?.account).toBe('grant');
    expect(grant?.amountCents).toBe(2_500_000);
    expect(grant?.idempotencyKey).toBe('distress-support:campaign-1');
    expect(getCampaignBalance(support.state)).toBe(2_412_000);
    expect(support.events.map((event) => event.type)).toEqual(['economy.distress_support_granted', 'finance.ledger_posted']);
    expect(support.state.ui.notifications.at(-1)?.code).toBe('DISTRESS_SUPPORT_GRANTED');

    const repeated = dispatch(support.state, 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT');
    expect(repeated.ok).toBe(false);
    if (repeated.ok) throw new Error('Distress support must be one-time only.');
    expect(repeated.error.code).toBe('DUPLICATE_COMMAND');
    expect(repeated.state.economy.ledger).toHaveLength(3);
  });

  it('keeps upgrades unavailable until their fictional balance definitions are approved', () => {
    const initial = createInitialGameState();
    for (const upgradeId of ['sensor_pack_1', 'drying_rack_1', 'energy-efficiency-1', 'energy-efficiency-2']) {
      const result = dispatch(initial, 'UPGRADE/PURCHASE', { upgradeId });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('An upgrade without an approved balance definition must not be purchasable.');
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.state).toBe(initial);
      expect(result.state.economy.ledger).toEqual([]);
    }
  });

  it('ends a campaign day, advances to the next 08:00, and posts wages and utilities once', () => {
    const initial = createInitialGameState();
    const result = dispatch(initial, 'TIME/END_DAY');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.state.time.day).toBe(2);
    expect(result.state.time.minuteOfDay).toBe(480);
    expect(result.state.time.totalMinutes).toBe(1440);
    expect(result.state.economy.ledger).toHaveLength(2);
    expect(result.state.economy.ledger.map((entry) => entry.reasonCode)).toEqual(['DAILY_STAFF_WAGES', 'DAILY_UTILITIES']);
    expect(getCampaignBalance(result.state)).toBe(24_912_000);
    expect(result.events.map((event) => event.type)).toEqual(['time.day_ended', 'finance.ledger_posted', 'finance.ledger_posted']);
    expect(result.state.ui.notifications.at(-1)?.code).toBe('DAILY_SETTLEMENT');
  });

  it('does not duplicate an already posted day settlement and allows a negative balance to remain visible', () => {
    const initial = createInitialGameState();
    const first = applyOk(initial, 'TIME/END_DAY');
    const second = applyOk(first, 'TIME/END_DAY');
    expect(second.economy.ledger).toHaveLength(4);
    expect(new Set(second.economy.ledger.map((entry) => entry.idempotencyKey)).size).toBe(4);

    const lowFunds = {
      ...initial,
      economy: { ...initial.economy, openingBalanceCents: 1 as typeof initial.economy.openingBalanceCents },
    };
    const overdrawn = applyOk(lowFunds, 'TIME/END_DAY');
    expect(getCampaignBalance(overdrawn)).toBe(-87_999);
    expect(overdrawn.ui.notifications.at(-1)?.level).toBe('danger');
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

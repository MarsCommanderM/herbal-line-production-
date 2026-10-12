import { describe, expect, it } from 'vitest';
import type { CommandId, EntityId, MoneyCents, Score0To100 } from '../../contracts/domain';
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

function progressToCreatedBatch() {
  let state = createInitialGameState();
  state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
  state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
  state = applyOk(state, 'BATCH/CREATE', {
    batchId: entity('batch-001'),
    plantIds: [entity('plant-001')],
    profileId: 'fictional-botanical-batch',
  });
  return state;
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

  it('posts one late-delivery penalty atomically with revenue and inventory settlement', () => {
    let state = progressToReleasedInventory();
    state = {
      ...state,
      orders: state.orders.map((order) => order.id === entity('order-buyer-001')
        ? { ...order, dueAt: -1 as typeof order.dueAt }
        : order),
    };
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', { orderId: entity('order-buyer-001'), lotIds: [entity('inventory-batch-001')] });
    state = applyOk(state, 'DELIVERY/CREATE', { deliveryId: entity('delivery-late-001'), orderId: entity('order-buyer-001'), routeId: 'route-late-01' });
    state = applyOk(state, 'DELIVERY/DISPATCH', { deliveryId: entity('delivery-late-001') });

    const delivered = dispatch(state, 'DELIVERY/CONFIRM', {
      deliveryId: entity('delivery-late-001'), proofCode: 'ACK-LATE-001',
    });
    expect(delivered.ok).toBe(true);
    if (!delivered.ok) throw new Error(delivered.error.message);
    expect(delivered.state.economy.ledger).toHaveLength(2);
    expect(delivered.state.economy.ledger.map((entry) => ({ account: entry.account, amountCents: Number(entry.amountCents), reasonCode: entry.reasonCode }))).toEqual([
      { account: 'revenue', amountCents: 850_000, reasonCode: 'order.fulfilled' },
      { account: 'penalty', amountCents: 50_000, reasonCode: 'order.late_delivery' },
    ]);
    expect(getCampaignBalance(delivered.state)).toBe(25_800_000);
    expect(delivered.events.filter((event) => event.type === 'finance.ledger_posted').map((event) => event.type === 'finance.ledger_posted' ? event.account : '')).toEqual(['revenue', 'penalty']);

    const repeated = dispatch(delivered.state, 'DELIVERY/CONFIRM', {
      deliveryId: entity('delivery-late-001'), proofCode: 'ACK-LATE-001',
    });
    expect(repeated.ok).toBe(true);
    if (!repeated.ok) throw new Error(repeated.error.message);
    expect(repeated.state.economy.ledger).toHaveLength(2);
    expect(getCampaignBalance(repeated.state)).toBe(25_800_000);
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
  it('purchases a known room atomically and records the investment in the ledger', () => {
    const initial = createInitialGameState();
    const result = dispatch(initial, 'ROOM/PURCHASE', {
      roomId: entity('room-expansion-001'), definitionId: 'production_room_small',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const room = result.state.rooms.find((item) => item.id === entity('room-expansion-001'));
    expect(room).toMatchObject({ definitionId: 'production_room_small', kind: 'production', capacity: 6, occupied: 0, unlocked: true });
    expect(result.state.economy.ledger).toHaveLength(1);
    expect(result.state.economy.ledger[0]).toMatchObject({
      account: 'investment', amountCents: 200_000, referenceId: entity('room-expansion-001'),
      idempotencyKey: 'room:room-expansion-001:purchase',
    });
    expect(getCampaignBalance(result.state)).toBe(24_800_000);
    expect(result.events.map((event) => event.type)).toEqual(['room.purchased']);

    const duplicate = dispatch(result.state, 'ROOM/PURCHASE', {
      roomId: entity('room-expansion-001'), definitionId: 'production_room_small',
    });
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('Duplicate room purchase should be rejected.');
    expect(duplicate.error.code).toBe('DUPLICATE_COMMAND');
    expect(duplicate.state).toBe(result.state);
  });

  it('rejects unknown room definitions and unaffordable purchases without mutating state', () => {
    const initial = createInitialGameState();
    const unknown = dispatch(initial, 'ROOM/PURCHASE', {
      roomId: entity('room-expansion-001'), definitionId: 'unlisted-room',
    });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) throw new Error('Unknown room definition should be rejected.');
    expect(unknown.error.code).toBe('INVALID_PAYLOAD');
    expect(unknown.state).toBe(initial);

    const lowFunds = { ...initial, economy: { ...initial.economy, openingBalanceCents: 1_000 as MoneyCents } };
    const unaffordable = dispatch(lowFunds, 'ROOM/PURCHASE', {
      roomId: entity('room-expansion-001'), definitionId: 'production_room_small',
    });
    expect(unaffordable.ok).toBe(false);
    if (unaffordable.ok) throw new Error('Unaffordable room purchase should be rejected.');
    expect(unaffordable.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(unaffordable.state).toBe(lowFunds);
    expect(unaffordable.state.economy.ledger).toHaveLength(0);
  });

  it('enforces room capacity bounds before queueing a batch', () => {
    const initial = progressToCreatedBatch();
    const full = {
      ...initial,
      rooms: initial.rooms.map((room) => room.id === entity('room-processing-01') ? { ...room, occupied: room.capacity } : room),
    };
    const result = dispatch(full, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Full room should reject a new batch.');
    expect(result.error.code).toBe('CAPACITY_EXCEEDED');
    expect(result.state).toBe(full);
  });

  it('requires an operational room and machine before processing can start', () => {
    let state = progressToCreatedBatch();
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
    const degraded = { ...state, machines: state.machines.map((machine) => ({ ...machine, condition: 10 as Score0To100 })) };
    const result = dispatch(degraded, 'BATCH/START_PROCESSING', {
      batchId: entity('batch-001'), machineId: entity('machine-processing-001'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Degraded machine should not start processing.');
    expect(result.error.code).toBe('PRECONDITION_FAILED');
    expect(result.state).toBe(degraded);
    expect(result.state.machines[0]?.status).toBe('idle');
  });

  it('keeps room occupancy balanced across queue, quality, storage, and delivery', () => {
    let state = progressToCreatedBatch();
    expect(state.rooms.find((room) => room.id === entity('room-processing-01'))?.occupied).toBe(0);
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
    expect(state.rooms.find((room) => room.id === entity('room-processing-01'))?.occupied).toBe(1);
    state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-001'), machineId: entity('machine-processing-001') });
    state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-001'), assessmentId: entity('assessment-occupancy-001') });
    expect(state.rooms.find((room) => room.id === entity('room-processing-01'))?.occupied).toBe(0);
    expect(state.rooms.find((room) => room.id === entity('room-quality-01'))?.occupied).toBe(1);
    state = applyOk(state, 'BATCH/RELEASE', { batchId: entity('batch-001') });
    expect(state.rooms.find((room) => room.id === entity('room-quality-01'))?.occupied).toBe(0);
    expect(state.rooms.find((room) => room.id === entity('room-storage-01'))?.occupied).toBe(6);
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', { orderId: entity('order-buyer-001'), lotIds: [entity('inventory-batch-001')] });
    state = applyOk(state, 'DELIVERY/CREATE', { deliveryId: entity('delivery-occupancy-001'), orderId: entity('order-buyer-001'), routeId: 'route-occupancy' });
    state = applyOk(state, 'DELIVERY/DISPATCH', { deliveryId: entity('delivery-occupancy-001') });
    state = applyOk(state, 'DELIVERY/CONFIRM', { deliveryId: entity('delivery-occupancy-001'), proofCode: 'ACK-OCCUPANCY-001' });
    expect(state.rooms.find((room) => room.id === entity('room-storage-01'))?.occupied).toBe(0);
  });

  it('rejects processing when the machine-room relationship is inconsistent', () => {
    let state = progressToCreatedBatch();
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-001'), roomId: entity('room-processing-01') });
    const inconsistent = {
      ...state,
      machines: state.machines.map((machine) => machine.id === entity('machine-processing-001')
        ? { ...machine, roomId: entity('room-production-01') }
        : machine),
    };
    const result = dispatch(inconsistent, 'BATCH/START_PROCESSING', {
      batchId: entity('batch-001'), machineId: entity('machine-processing-001'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('A machine in another room must not process this batch.');
    expect(result.error.code).toBe('INVALID_TRANSITION');
    expect(result.state).toBe(inconsistent);
  });

  it('enforces maintenance role, exclusive assignment, and a complete maintenance lifecycle', () => {
    const initial = createInitialGameState();
    const wrongRole = dispatch(initial, 'STAFF/ASSIGN', {
      assignmentId: entity('assignment-wrong-role'), staffId: entity('staff-operations-001'),
      taskCode: 'MACHINE/MAINTENANCE', entityId: entity('machine-processing-001'),
    });
    expect(wrongRole.ok).toBe(false);
    if (wrongRole.ok) throw new Error('Operations staff must not receive maintenance work.');
    expect(wrongRole.error.code).toBe('PRECONDITION_FAILED');
    expect(wrongRole.state).toBe(initial);

    const assigned = dispatch(initial, 'STAFF/ASSIGN', {
      assignmentId: entity('assignment-maintenance-001'), staffId: entity('staff-maintenance-001'),
      taskCode: 'MACHINE/MAINTENANCE', entityId: entity('machine-processing-001'),
    });
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) throw new Error(assigned.error.message);
    expect(assigned.state.staff.find((item) => item.id === entity('staff-maintenance-001'))?.activeAssignmentId).toBe(entity('assignment-maintenance-001'));
    expect(assigned.state.rooms.find((item) => item.id === entity('room-processing-01'))?.assignedStaffIds).toContain(entity('staff-maintenance-001'));

    const doubleAssigned = dispatch(assigned.state, 'STAFF/ASSIGN', {
      assignmentId: entity('assignment-maintenance-002'), staffId: entity('staff-maintenance-001'),
      taskCode: 'MACHINE/MAINTENANCE', entityId: entity('machine-processing-001'),
    });
    expect(doubleAssigned.ok).toBe(false);
    if (doubleAssigned.ok) throw new Error('Staff with an active assignment must not be double-assigned.');
    expect(doubleAssigned.error.code).toBe('PRECONDITION_FAILED');
    expect(doubleAssigned.state).toBe(assigned.state);

    const started = dispatch(assigned.state, 'MACHINE/START_MAINTENANCE', {
      machineId: entity('machine-processing-001'), assignmentId: entity('assignment-maintenance-001'),
    });
    expect(started.ok).toBe(true);
    if (!started.ok) throw new Error(started.error.message);
    expect(started.state.machines[0]?.status).toBe('maintenance');

    const completed = dispatch(started.state, 'MACHINE/COMPLETE_MAINTENANCE', {
      machineId: entity('machine-processing-001'), assignmentId: entity('assignment-maintenance-001'),
    });
    expect(completed.ok).toBe(true);
    if (!completed.ok) throw new Error(completed.error.message);
    expect(completed.state.machines[0]).toMatchObject({ status: 'idle', condition: 100, activeJobId: null });
    expect(completed.state.staff.find((item) => item.id === entity('staff-maintenance-001'))).toMatchObject({ energy: 85, activeAssignmentId: null });
    expect(completed.state.assignments[0]).toMatchObject({ status: 'completed', progress: 100 });
    expect(completed.events.map((event) => event.type)).toEqual(['machine.maintenance_completed', 'staff.assignment_completed']);
  });

  it('does not create a dead-end maintenance assignment for a machine already active', () => {
    const initial = createInitialGameState();
    const activeMachineState = {
      ...initial,
      machines: initial.machines.map((machine) => machine.id === entity('machine-processing-001')
        ? { ...machine, condition: 50 as Score0To100, status: 'active' as const, activeJobId: entity('batch-active-001') }
        : machine),
    };
    const result = dispatch(activeMachineState, 'STAFF/ASSIGN', {
      assignmentId: entity('assignment-maintenance-active'), staffId: entity('staff-maintenance-001'),
      taskCode: 'MACHINE/MAINTENANCE', entityId: entity('machine-processing-001'),
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('An active machine must not receive a maintenance assignment.');
    expect(result.error.code).toBe('INVALID_TRANSITION');
    expect(result.state).toBe(activeMachineState);
    expect(result.state.assignments).toHaveLength(0);
    expect(result.state.staff.find((item) => item.id === entity('staff-maintenance-001'))?.activeAssignmentId).toBeNull();
  });

  it('requires corrective action and a clean audit before clearing a severe compliance block', () => {
    const recorded = dispatch(createInitialGameState(), 'COMPLIANCE/RECORD_VIOLATION', {
      violationId: entity('violation-simulated-001'), code: 'SIMULATED_TRACE_GAP', severity: 'high',
      relatedEntityIds: [entity('plant-001')], operationCodes: ['BATCH/RELEASE'],
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) throw new Error(recorded.error.message);
    expect(recorded.state.compliance.licenseStatus).toBe('suspended');
    expect(recorded.state.compliance.blockedOperationCodes).toContain('BATCH/RELEASE');
    const corrective = dispatch(recorded.state, 'COMPLIANCE/RESOLVE_VIOLATION', {
      violationId: entity('violation-simulated-001'), resolutionCode: 'CORRECTIVE_ACTION_VERIFIED',
    });
    expect(corrective.ok).toBe(true);
    if (!corrective.ok) throw new Error(corrective.error.message);
    expect(corrective.state.compliance.licenseStatus).toBe('suspended');
    expect(corrective.state.compliance.violations[0]?.resolvedAt).toBe(0);
    const audited = dispatch(corrective.state, 'COMPLIANCE/START_AUDIT', { auditId: entity('audit-simulated-001') });
    expect(audited.ok).toBe(true);
    if (!audited.ok) throw new Error(audited.error.message);
    expect(audited.state.compliance.licenseStatus).toBe('valid');
    expect(audited.state.compliance.blockedOperationCodes).toEqual([]);
    expect(audited.state.compliance.risk).toBe(0);
    expect(audited.state.compliance.auditDueAt).toBe(1440);
    expect(audited.events.map((event) => event.type)).toEqual(['compliance.audit_completed', 'compliance.license_changed']);
  });

  it('keeps unresolved severe findings suspended after an audit', () => {
    const recorded = dispatch(createInitialGameState(), 'COMPLIANCE/RECORD_VIOLATION', {
      violationId: entity('violation-open-001'), code: 'SIMULATED_UNRESOLVED_GAP', severity: 'critical',
      relatedEntityIds: [entity('plant-001')], operationCodes: ['BATCH/RELEASE', 'DELIVERY/DISPATCH'],
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) throw new Error(recorded.error.message);
    const audited = dispatch(recorded.state, 'COMPLIANCE/START_AUDIT', { auditId: entity('audit-open-001') });
    expect(audited.ok).toBe(true);
    if (!audited.ok) throw new Error(audited.error.message);
    expect(audited.state.compliance.licenseStatus).toBe('suspended');
    expect(audited.state.compliance.blockedOperationCodes).toEqual(['BATCH/RELEASE', 'DELIVERY/DISPATCH']);
    expect(audited.state.compliance.risk).toBe(35);
  });

  it('rejects an invalid corrective-action code without mutating state', () => {
    const recorded = dispatch(createInitialGameState(), 'COMPLIANCE/RECORD_VIOLATION', {
      violationId: entity('violation-code-001'), code: 'SIMULATED_MINOR_GAP', severity: 'medium',
      relatedEntityIds: [entity('plant-001')], operationCodes: ['BATCH/RELEASE'],
    });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) throw new Error(recorded.error.message);
    const result = dispatch(recorded.state, 'COMPLIANCE/RESOLVE_VIOLATION', {
      violationId: entity('violation-code-001'), resolutionCode: 'no',
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Invalid corrective action should be rejected.');
    expect(result.error.code).toBe('INVALID_PAYLOAD');
    expect(result.state).toBe(recorded.state);
  });

});

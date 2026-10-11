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

describe('medical cannabis campaign vertical slice', () => {
  it('completes fictional stage, batch, QC, stock, pharmacy order, and delivery flow', () => {
    let state = progressToReleasedInventory();
    expect(state.batches[0]?.status).toBe('released');
    expect(state.qualityAssessments[0]?.decision).toBe('pass');
    expect(state.inventoryLots[0]?.quantityAvailable).toBe(6);
    expect(state.inventoryLots[0]?.status).toBe('released');

    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-pharmacy-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', {
      orderId: entity('order-pharmacy-001'),
      lotIds: [entity('inventory-batch-001')],
    });
    expect(state.inventoryLots[0]?.quantityReserved).toBe(6);
    state = applyOk(state, 'DELIVERY/CREATE', {
      deliveryId: entity('delivery-001'),
      orderId: entity('order-pharmacy-001'),
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
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-pharmacy-001') });
    state = applyOk(state, 'ORDER/ALLOCATE', { orderId: entity('order-pharmacy-001'), lotIds: [entity('inventory-batch-001')] });
    state = applyOk(state, 'DELIVERY/CREATE', { deliveryId: entity('delivery-001'), orderId: entity('order-pharmacy-001'), routeId: 'route-01' });
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
    state = applyOk(state, 'BATCH/REJECT', { batchId: entity('batch-low-quality'), reasonCode: 'QUALITY_GATE_NOT_ACCEPTED' });
    expect(state.batches[0]?.status).toBe('rejected');
    expect(state.inventoryLots).toHaveLength(0);
  });

  it('keeps inventory and order unchanged when allocation is insufficient', () => {
    let state = progressToReleasedInventory();
    state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-pharmacy-001') });
    state = {
      ...state,
      orders: state.orders.map((order) => ({ ...order, requestedQuantity: 99 })),
    };
    const result = dispatch(state, 'ORDER/ALLOCATE', { orderId: entity('order-pharmacy-001'), lotIds: [entity('inventory-batch-001')] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Allocation should have failed.');
    expect(result.error.code).toBe('INSUFFICIENT_STOCK');
    expect(result.state.inventoryLots[0]?.quantityReserved).toBe(0);
    expect(result.state.orders[0]?.status).toBe('accepted');
  });
});

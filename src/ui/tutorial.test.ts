import { describe, expect, it } from 'vitest';
import type { GameState, Score0To100, SimulationMinute } from '../../contracts/domain';
import { createInitialGameState } from '../domain/initial-state';
import { getTutorialProgress } from './tutorial';

const minute = (value: number) => value as SimulationMinute;
const entity = (value: string) => value as GameState['player']['id'];

function stateWithBatch(status: GameState['batches'][number]['status']): GameState {
  const state = createInitialGameState();
  const plant = state.plants[0];
  const processingRoom = state.rooms.find((room) => room.kind === 'processing');
  const qualityRoom = state.rooms.find((room) => room.kind === 'quality');
  const storageRoom = state.rooms.find((room) => room.kind === 'storage');
  if (!plant || !processingRoom || !qualityRoom || !storageRoom) throw new Error('Initial tutorial fixture is incomplete.');

  const currentRoomId = status === 'created' ? null
    : status === 'released' ? storageRoom.id
    : status === 'awaiting_qc' ? qualityRoom.id
    : processingRoom.id;
  const batch: GameState['batches'][number] = {
    id: entity('tutorial-batch'),
    profileId: 'fictional-tutorial',
    sourceLotIds: [plant.sourceLotId],
    plantIds: [plant.id],
    quantity: 6,
    qualityScore: status === 'released' ? 80 as Score0To100 : null,
    status,
    createdAt: minute(0),
    updatedAt: minute(0),
    currentRoomId,
    inventoryLotIds: [],
    assessmentIds: [],
    trace: [],
    holdReason: status === 'rejected' || status === 'quarantined' ? 'FICTIONAL_TEST_BLOCK' : null,
  };
  return { ...state, batches: [batch] };
}

describe('state-derived core-loop tutorial', () => {
  it('starts at step one without mutating campaign state', () => {
    const state = createInitialGameState();
    const before = structuredClone(state);
    expect(getTutorialProgress(state)).toMatchObject({ step: 1, total: 6, status: 'active', title: 'Simulation und Zustand' });
    expect(state).toEqual(before);
  });

  it('does not skip production steps when an order is accepted early', () => {
    const state = createInitialGameState();
    const order = state.orders[0];
    if (!order) throw new Error('Initial order is missing.');
    const accepted = { ...state, orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'accepted' as const } : item) };
    expect(getTutorialProgress(accepted)).toMatchObject({ step: 1, status: 'active', title: 'Simulation und Zustand' });
  });

  it('advances to the unit-to-batch step when the simulation milestone is ready', () => {
    const state = createInitialGameState();
    const plant = state.plants[0];
    if (!plant) throw new Error('Initial plant is missing.');
    const ready = { ...state, plants: state.plants.map((item) => item.id === plant.id ? { ...item, stage: 'ready_for_harvest' as const } : item) };
    expect(getTutorialProgress(ready)).toMatchObject({ step: 2, status: 'active', title: 'Einheit in den Prozess überführen' });
  });

  it('maps batch lifecycle stages to the matching tutorial step', () => {
    expect(getTutorialProgress(stateWithBatch('created')).step).toBe(3);
    expect(getTutorialProgress(stateWithBatch('queued')).step).toBe(3);
    expect(getTutorialProgress(stateWithBatch('processing')).step).toBe(4);
    expect(getTutorialProgress(stateWithBatch('awaiting_qc')).step).toBe(4);
    expect(getTutorialProgress(stateWithBatch('released')).step).toBe(5);
  });

  it('pauses the tutorial for a suspended or recovery-review license', () => {
    const state = createInitialGameState();
    state.compliance.licenseStatus = 'suspended';
    expect(getTutorialProgress(state)).toMatchObject({ step: 1, status: 'blocked', title: 'Einführung pausiert: Compliance' });
    state.compliance.licenseStatus = 'recovery_review';
    expect(getTutorialProgress(state).status).toBe('blocked');
  });

  it('pauses after terminal batch rejection or quarantine', () => {
    expect(getTutorialProgress(stateWithBatch('rejected'))).toMatchObject({ step: 4, status: 'blocked' });
    expect(getTutorialProgress(stateWithBatch('quarantined'))).toMatchObject({ step: 4, status: 'blocked' });
  });

  it('marks the tutorial complete only after delivery is confirmed', () => {
    const state = createInitialGameState();
    const order = state.orders[0];
    if (!order) throw new Error('Initial order is missing.');
    const delivered = { ...state, orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'delivered' as const } : item) };
    expect(getTutorialProgress(delivered)).toMatchObject({ step: 6, total: 6, status: 'complete', title: 'Kampagnenziel erreicht' });
  });

  it('keeps the first step safe and non-mutating when campaign entities are absent', () => {
    const state = createInitialGameState();
    state.plants = [];
    state.batches = [];
    state.orders = [];
    const before = structuredClone(state);

    expect(getTutorialProgress(state)).toMatchObject({
      step: 1,
      total: 6,
      status: 'active',
      title: 'Simulation und Zustand',
    });
    expect(state).toEqual(before);
  });

});

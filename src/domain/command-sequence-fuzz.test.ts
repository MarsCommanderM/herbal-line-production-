import { describe, expect, it } from 'vitest';
import type { CommandId, EntityId, GameState } from '../../contracts/domain';
import type { VerticalSliceCommand } from './vertical-slice';
import { createInitialGameState } from './initial-state';
import { validateFacilityInvariants } from './facility';
import { validateGameStateInvariants } from './invariants';
import { applyVerticalSliceCommand } from './vertical-slice';

const entity = (value: string): EntityId => value as EntityId;
const commandId = (value: string): CommandId => value as CommandId;

type CommandIntent = {
  type: VerticalSliceCommand['type'];
  payload: Record<string, unknown>;
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

function pick<T>(values: readonly T[], random: () => number): T | undefined {
  if (values.length === 0) return undefined;
  return values[random() % values.length];
}

function makeIntent(
  state: GameState,
  random: () => number,
  seed: number,
  step: number,
): CommandIntent {
  const plant = state.plants[0];
  const unbatchedHarvestedPlant = state.plants.find((item) => item.stage === 'harvested' && item.batchId === null);
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];
  const processingRoom = state.rooms.find((room) => room.kind === 'processing' && room.unlocked);
  const room = pick(state.rooms, random);
  const staff = pick(state.staff, random);
  const machine = pick(state.machines, random);
  const batchId = batch?.id ?? entity('missing-batch');
  const orderId = order?.id ?? entity('missing-order');
  const plantId = plant?.id ?? entity('missing-plant');
  const machineId = machine?.id ?? entity('missing-machine');
  const roomId = room?.id ?? entity('missing-room');
  const deliveryId = order?.deliveryId ?? entity('missing-delivery');
  const releasedLotIds = state.inventoryLots
    .filter((lot) => lot.status === 'released' && lot.quantityAvailable > lot.quantityReserved)
    .map((lot) => lot.id);

  const candidates: CommandIntent[] = [
    { type: 'TIME/END_DAY', payload: {} },
    { type: 'PLANT/ADVANCE_FICTIONAL_STEP', payload: { plantId } },
    { type: 'PLANT/HARVEST', payload: { plantId } },
    {
      type: 'BATCH/CREATE',
      payload: {
        batchId: entity('fuzz-batch-' + seed + '-' + step),
        plantIds: [unbatchedHarvestedPlant?.id ?? entity('missing-plant-for-batch')],
        profileId: 'fuzz-fictional-profile',
      },
    },
    { type: 'BATCH/QUEUE', payload: { batchId, roomId: processingRoom?.id ?? entity('missing-processing-room') } },
    { type: 'BATCH/START_PROCESSING', payload: { batchId, machineId } },
    {
      type: 'BATCH/SUBMIT_QC',
      payload: { batchId, assessmentId: entity('fuzz-assessment-' + seed + '-' + step) },
    },
    { type: 'BATCH/RELEASE', payload: { batchId } },
    { type: 'BATCH/REJECT', payload: { batchId, reasonCode: 'FUZZ_TEST_REJECTION' } },
    { type: 'ORDER/ACCEPT', payload: { orderId } },
    { type: 'ORDER/ALLOCATE', payload: { orderId, lotIds: releasedLotIds } },
    {
      type: 'DELIVERY/CREATE',
      payload: {
        deliveryId: entity('fuzz-delivery-' + seed + '-' + step),
        orderId,
        routeId: 'fuzz-fictional-route',
      },
    },
    { type: 'DELIVERY/DISPATCH', payload: { deliveryId } },
    { type: 'DELIVERY/CONFIRM', payload: { deliveryId, proofCode: 'FUZZ-ACK' } },
    {
      type: 'FACILITY/ASSIGN_STAFF',
      payload: { staffId: staff?.id ?? entity('missing-staff'), roomId },
    },
    { type: 'FACILITY/UNASSIGN_STAFF', payload: { staffId: staff?.id ?? entity('missing-staff') } },
    { type: 'FACILITY/MOVE_MACHINE', payload: { machineId, roomId } },
    { type: 'MACHINE/START_MAINTENANCE', payload: { machineId } },
    { type: 'MACHINE/COMPLETE_MAINTENANCE', payload: { machineId } },
    { type: 'UPGRADE/PURCHASE', payload: { upgradeId: random() % 2 === 0 ? 'energy-efficiency-1' : 'energy-efficiency-2' } },
    { type: 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT', payload: {} },
  ];

  const selected = candidates[random() % candidates.length];
  if (!selected) throw new Error('Deterministic command generator produced no candidate.');
  return selected;
}

function snapshot(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe('deterministic command-sequence fuzzing', () => {
  it('preserves domain and facility invariants across generated mixed command streams', () => {
    let acceptedCommands = 0;
    let rejectedCommands = 0;
    const commandsPerSeed = 80;
    const seedCount = 16;

    for (let seed = 1; seed <= seedCount; seed += 1) {
      const random = createSeededRandom(seed);
      let state = createInitialGameState();

      expect(validateGameStateInvariants(state), 'initial state, seed ' + seed).toEqual([]);
      expect(validateFacilityInvariants(state), 'initial facility, seed ' + seed).toEqual([]);

      for (let step = 0; step < commandsPerSeed; step += 1) {
        const intent = makeIntent(state, random, seed, step);
        const before = snapshot(state);
        const command = {
          commandId: commandId('fuzz-command-' + seed + '-' + step),
          actorId: state.player.id,
          expectedRevision: state.revision,
          type: intent.type,
          ...intent.payload,
        } as VerticalSliceCommand;
        const result = applyVerticalSliceCommand(state, command);

        if (result.ok) {
          acceptedCommands += 1;
          state = result.state;
          expect(
            validateGameStateInvariants(state),
            'domain invariant violation at seed ' + seed + ', step ' + step + ', command ' + intent.type,
          ).toEqual([]);
          expect(
            validateFacilityInvariants(state),
            'facility invariant violation at seed ' + seed + ', step ' + step + ', command ' + intent.type,
          ).toEqual([]);
        } else {
          rejectedCommands += 1;
          expect(result.state).toBe(state);
          expect(result.state).toEqual(before);
          expect(state).toEqual(before);
        }
      }
    }

    expect(acceptedCommands).toBeGreaterThan(0);
    expect(rejectedCommands).toBeGreaterThan(0);
  });
});

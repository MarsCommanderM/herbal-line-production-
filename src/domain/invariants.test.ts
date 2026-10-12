import { describe, expect, it } from 'vitest';
import type { GameState } from '../../contracts/domain';
import { createInitialGameState } from './initial-state';
import { validateGameStateInvariants } from './invariants';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from './vertical-slice';
import type { CommandId, EntityId, Score0To100 } from '../../contracts/domain';

const entity = (value: string): EntityId => value as EntityId;
const commandId = (value: string): CommandId => value as CommandId;

function applyOk(
  state: GameState,
  type: VerticalSliceCommand['type'],
  payload: Record<string, unknown> = {},
): GameState {
  const command = {
    commandId: commandId('invariant-test-' + state.revision + '-' + type.replaceAll('/', '-')),
    actorId: state.player.id,
    expectedRevision: state.revision,
    type,
    ...payload,
  } as VerticalSliceCommand;
  const result = applyVerticalSliceCommand(state, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe('game-state invariants', () => {
  it('accepts the initial campaign state', () => {
    expect(validateGameStateInvariants(createInitialGameState())).toEqual([]);
  });

  it('reports invalid room occupancy and reserved inventory without mutating state', () => {
    const initial = createInitialGameState();
    const corrupt = {
      ...initial,
      rooms: initial.rooms.map((room) => room.kind === 'storage' ? { ...room, occupied: room.capacity + 1 } : room),
      inventoryLots: [{
        id: entity('inventory-invalid'),
        batchId: entity('batch-invalid'),
        itemDefinitionId: 'BOT-01',
        quantityAvailable: 3,
        quantityReserved: 4,
        qualityScore: 80 as Score0To100,
        status: 'released' as const,
        createdAt: 0 as GameState['time']['totalMinutes'],
        expiresAt: null,
        storageRoomId: initial.rooms.find((room) => room.kind === 'storage')?.id ?? entity('room-missing'),
      }],
    } satisfies GameState;
    const result = validateGameStateInvariants(corrupt);
    expect(result.map((item) => item.code)).toContain('ROOM_OCCUPANCY_OUT_OF_RANGE');
    expect(result.map((item) => item.code)).toContain('INVALID_INVENTORY_RESERVED');
    expect(initial.rooms.find((room) => room.kind === 'storage')?.occupied).toBe(0);
    expect(initial.inventoryLots).toHaveLength(0);
  });

  it('accepts valid state through queue, processing, QC review and terminal rejection', () => {
    let state = createInitialGameState();
    state = {
      ...state,
      plants: state.plants.map((plant) => ({ ...plant, qualityPotential: 62 as Score0To100 })),
    };
    const checkpoints: string[][] = [];
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));

    state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));
    state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
    state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-invariant'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
    state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-invariant'), roomId: entity('room-processing-01') });
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));
    state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-invariant'), machineId: entity('machine-processing-001') });
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));
    state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-invariant'), assessmentId: entity('assessment-invariant') });
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));
    state = applyOk(state, 'BATCH/REJECT', { batchId: entity('batch-invariant'), reasonCode: 'QUALITY_REVIEW_NOT_ACCEPTED' });
    checkpoints.push(validateGameStateInvariants(state).map((item) => item.code));

    expect(checkpoints.every((issues) => issues.length === 0)).toBe(true);
  });


  it('detects a deterministic matrix of cross-entity corruption cases', () => {
    const initial = createInitialGameState();
    const storage = initial.rooms.find((room) => room.kind === 'storage');
    const processingMachine = initial.machines[0];
    const source = initial.sourceLots[0];
    if (!storage || !processingMachine || !source) throw new Error('Initial campaign fixtures are incomplete.');

    const invalidLot: GameState['inventoryLots'][number] = {
      id: entity('fuzz-inventory'),
      batchId: entity('missing-batch'),
      itemDefinitionId: 'BOT-01',
      quantityAvailable: 2,
      quantityReserved: 3,
      qualityScore: 70 as Score0To100,
      status: 'released',
      createdAt: initial.time.totalMinutes,
      expiresAt: null,
      storageRoomId: storage.id,
    };
    const invalidLedger: GameState['economy']['ledger'][number] = {
      id: entity('fuzz-ledger'),
      simulationMinute: initial.time.totalMinutes,
      account: 'revenue',
      amountCents: 100 as GameState['economy']['openingBalanceCents'],
      referenceId: null,
      reasonCode: 'FUZZ_CASE',
      idempotencyKey: '',
    };

    const mutations: Array<{ code: string; mutate: (state: GameState) => GameState }> = [
      {
        code: 'INVALID_REVISION',
        mutate: (state) => ({ ...state, revision: -1 }),
      },
      {
        code: 'INVALID_SIMULATION_TIME',
        mutate: (state) => ({ ...state, time: { ...state.time, totalMinutes: -1 as GameState['time']['totalMinutes'] } }),
      },
      {
        code: 'ROOM_OCCUPANCY_OUT_OF_RANGE',
        mutate: (state) => ({ ...state, rooms: state.rooms.map((room) => room.id === storage.id ? { ...room, occupied: room.capacity + 1 } : room) }),
      },
      {
        code: 'INVALID_INVENTORY_RESERVED',
        mutate: (state) => ({ ...state, inventoryLots: [invalidLot] }),
      },
      {
        code: 'ACTIVE_MACHINE_WITHOUT_JOB',
        mutate: (state) => ({ ...state, machines: state.machines.map((machine) => machine.id === processingMachine.id ? { ...machine, status: 'active', activeJobId: null } : machine) }),
      },
      {
        code: 'INACTIVE_MACHINE_WITH_JOB',
        mutate: (state) => ({ ...state, machines: state.machines.map((machine) => machine.id === processingMachine.id ? { ...machine, status: 'idle', activeJobId: entity('missing-batch') } : machine) }),
      },
      {
        code: 'PLANT_BATCH_LINK_MISMATCH',
        mutate: (state) => ({ ...state, plants: state.plants.map((plant) => ({ ...plant, batchId: entity('missing-batch') })) }),
      },
      {
        code: 'EMPTY_LEDGER_IDEMPOTENCY_KEY',
        mutate: (state) => ({ ...state, economy: { ...state.economy, ledger: [invalidLedger] } }),
      },
      {
        code: 'INVENTORY_BATCH_LINK_MISMATCH',
        mutate: (state) => ({ ...state, inventoryLots: [{ ...invalidLot, quantityReserved: 0 }] }),
      },
    ];

    for (const mutation of mutations) {
      const result = validateGameStateInvariants(mutation.mutate(initial));
      expect(result.map((issue) => issue.code), mutation.code).toContain(mutation.code);
    }
  });

  it('rejects a range of generated room occupancy corruptions', () => {
    const initial = createInitialGameState();
    const storage = initial.rooms.find((room) => room.kind === 'storage');
    if (!storage) throw new Error('Storage room fixture is missing.');

    for (let seed = 1; seed <= 100; seed += 1) {
      const invalid = {
        ...initial,
        rooms: initial.rooms.map((room) => room.id === storage.id
          ? { ...room, occupied: room.capacity + seed }
          : room),
      };
      expect(validateGameStateInvariants(invalid).map((issue) => issue.code)).toContain('ROOM_OCCUPANCY_OUT_OF_RANGE');
    }
  });

  it('detects duplicate financial idempotency keys', () => {
    const state = createInitialGameState();
    const entry = {
      id: entity('ledger-test'),
      simulationMinute: state.time.totalMinutes,
      account: 'revenue' as const,
      amountCents: 100 as GameState['economy']['openingBalanceCents'],
      referenceId: null,
      reasonCode: 'test',
      idempotencyKey: 'same-key',
    };
    const corrupt: GameState = {
      ...state,
      economy: { ...state.economy, ledger: [entry, { ...entry, id: entity('ledger-test-2') }] },
    };
    expect(validateGameStateInvariants(corrupt).map((item) => item.code)).toContain('DUPLICATE_LEDGER_IDEMPOTENCY_KEY');
  });
});

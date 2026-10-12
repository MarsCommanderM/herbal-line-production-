import { describe, expect, it } from 'vitest';
import type { EntityId } from '../../contracts/domain';
import { createInitialGameState } from './initial-state';
import { roomSupportsStaffRole, validateFacilityInvariants } from './facility';

const entity = (value: string): EntityId => value as EntityId;

describe('facility invariants', () => {
  it('accepts the canonical campaign start with bidirectional staff and machine links', () => {
    expect(validateFacilityInvariants(createInitialGameState())).toEqual([]);
  });

  it('detects invalid capacity and out-of-bounds occupancy without mutating state', () => {
    const state = createInitialGameState();
    const invalid = {
      ...state,
      rooms: state.rooms.map((room) => room.id === entity('room-processing-01')
        ? { ...room, capacity: 0, occupied: 5 }
        : room),
    };
    const violations = validateFacilityInvariants(invalid);
    expect(violations.map((item) => item.code)).toContain('ROOM_CAPACITY_INVALID');
    expect(violations.map((item) => item.code)).toContain('ROOM_OCCUPANCY_OUT_OF_BOUNDS');
    expect(state.rooms.find((room) => room.id === entity('room-processing-01'))?.occupied).toBe(0);
  });

  it('detects one-sided staff and machine room assignments', () => {
    const state = createInitialGameState();
    const invalid = {
      ...state,
      rooms: state.rooms.map((room) => room.id === entity('room-processing-01')
        ? { ...room, assignedMachineIds: [] }
        : room),
    };
    expect(validateFacilityInvariants(invalid).some((item) => item.code === 'MACHINE_ROOM_MISMATCH')).toBe(true);
  });

  it('enforces a fictional role-to-room compatibility matrix', () => {
    expect(roomSupportsStaffRole('quality', 'quality')).toBe(true);
    expect(roomSupportsStaffRole('quality', 'maintenance')).toBe(false);
    expect(roomSupportsStaffRole('processing', 'maintenance')).toBe(true);
    expect(roomSupportsStaffRole('logistics', 'logistics')).toBe(true);
  });
});

import type { EntityId, GameState, RoomKind, Score0To100 } from '../../contracts/domain';

export type FacilityInvariantCode =
  | 'ROOM_CAPACITY_INVALID'
  | 'ROOM_OCCUPANCY_OUT_OF_BOUNDS'
  | 'DUPLICATE_ROOM_ASSIGNMENT'
  | 'STAFF_ROOM_MISMATCH'
  | 'MACHINE_ROOM_MISMATCH'
  | 'MACHINE_JOB_MISMATCH'
  | 'ACTIVE_JOB_BATCH_MISMATCH';

export interface FacilityInvariantViolation {
  code: FacilityInvariantCode;
  entityId: EntityId;
  message: string;
}

/** Pure state invariant check; it does not repair or mutate invalid state. */
export function validateFacilityInvariants(state: GameState): FacilityInvariantViolation[] {
  const violations: FacilityInvariantViolation[] = [];
  const roomIds = new Set(state.rooms.map((room) => room.id));
  const staffById = new Map(state.staff.map((staff) => [staff.id, staff]));
  const machineById = new Map(state.machines.map((machine) => [machine.id, machine]));
  const batchById = new Map(state.batches.map((batch) => [batch.id, batch]));

  for (const room of state.rooms) {
    if (!Number.isSafeInteger(room.capacity) || room.capacity < 1) {
      violations.push({ code: 'ROOM_CAPACITY_INVALID', entityId: room.id, message: 'Raumkapazität muss eine positive ganze Zahl sein.' });
    }
    if (!Number.isSafeInteger(room.occupied) || room.occupied < 0 || room.occupied > room.capacity) {
      violations.push({ code: 'ROOM_OCCUPANCY_OUT_OF_BOUNDS', entityId: room.id, message: 'Raumbelegung liegt außerhalb der zulässigen Kapazität.' });
    }

    if (new Set(room.assignedStaffIds).size !== room.assignedStaffIds.length) {
      violations.push({ code: 'DUPLICATE_ROOM_ASSIGNMENT', entityId: room.id, message: 'Ein Mitarbeiter ist dem Raum mehrfach zugeordnet.' });
    }
    for (const staffId of room.assignedStaffIds) {
      const staff = staffById.get(staffId);
      if (!staff || staff.assignedRoomId !== room.id) {
        violations.push({ code: 'STAFF_ROOM_MISMATCH', entityId: room.id, message: 'Mitarbeiter- und Raumzuordnung sind nicht bidirektional konsistent.' });
      }
    }

    if (new Set(room.assignedMachineIds).size !== room.assignedMachineIds.length) {
      violations.push({ code: 'DUPLICATE_ROOM_ASSIGNMENT', entityId: room.id, message: 'Eine Maschine ist dem Raum mehrfach zugeordnet.' });
    }
    for (const machineId of room.assignedMachineIds) {
      const machine = machineById.get(machineId);
      if (!machine || machine.roomId !== room.id) {
        violations.push({ code: 'MACHINE_ROOM_MISMATCH', entityId: room.id, message: 'Maschinen- und Raumzuordnung sind nicht bidirektional konsistent.' });
      }
    }
  }

  for (const staff of state.staff) {
    if (staff.assignedRoomId === null) continue;
    const room = state.rooms.find((item) => item.id === staff.assignedRoomId);
    if (!room || !room.assignedStaffIds.includes(staff.id)) {
      violations.push({ code: 'STAFF_ROOM_MISMATCH', entityId: staff.id, message: 'Zugewiesener Raum führt den Mitarbeiter nicht in seiner Belegung.' });
    }
  }

  for (const machine of state.machines) {
    if (!roomIds.has(machine.roomId)) {
      violations.push({ code: 'MACHINE_ROOM_MISMATCH', entityId: machine.id, message: 'Maschine verweist auf einen unbekannten Raum.' });
      continue;
    }
    const room = state.rooms.find((item) => item.id === machine.roomId);
    if (!room?.assignedMachineIds.includes(machine.id)) {
      violations.push({ code: 'MACHINE_ROOM_MISMATCH', entityId: machine.id, message: 'Zugewiesener Raum führt die Maschine nicht in seiner Ausstattung.' });
    }

    const hasJob = machine.activeJobId !== null;
    if ((machine.status === 'active') !== hasJob) {
      violations.push({ code: 'MACHINE_JOB_MISMATCH', entityId: machine.id, message: 'Aktiver Maschinenstatus und aktive Jobreferenz widersprechen sich.' });
    }
    if (machine.status === 'maintenance' && hasJob) {
      violations.push({ code: 'MACHINE_JOB_MISMATCH', entityId: machine.id, message: 'Eine Maschine in Wartung darf keinen aktiven Job besitzen.' });
    }
    if (machine.activeJobId) {
      const batch = batchById.get(machine.activeJobId);
      if (!batch || batch.status !== 'processing' || batch.currentRoomId !== machine.roomId) {
        violations.push({ code: 'ACTIVE_JOB_BATCH_MISMATCH', entityId: machine.id, message: 'Aktiver Maschinenjob muss auf einen verarbeitenden Batch im selben Raum zeigen.' });
      }
    }
  }
  return violations;
}

export function roomSupportsStaffRole(roomKind: RoomKind, role: GameState['staff'][number]['role']): boolean {
  const supported: Readonly<Record<RoomKind, readonly GameState['staff'][number]['role'][]>> = {
    production: ['operations', 'management'],
    processing: ['operations', 'maintenance'],
    quality: ['quality', 'compliance'],
    storage: ['logistics', 'operations'],
    logistics: ['logistics', 'compliance'],
    office: ['management', 'operations', 'quality', 'compliance', 'logistics', 'maintenance'],
    utility: ['maintenance', 'operations'],
  };
  return supported[roomKind].includes(role);
}

export function clampScore(value: number): Score0To100 {
  return Math.max(0, Math.min(100, Math.round(value))) as Score0To100;
}

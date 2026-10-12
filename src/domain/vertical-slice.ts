import type {
  BatchState,
  Score0To100,
  EntityId,
  EventId,
  GameState,
  GameLogEntry,
  QualityAssessment,
  PlantState,
  InventoryLotState,
  LedgerEntry,
  SimulationMinute,
  TraceEntry,
  RoomState,
  StaffRole,
} from '../../contracts/domain';
import type { CommandBase, CommandFailureCode, DomainCommand, CommandResult } from '../../contracts/commands';
import type { DomainEvent } from '../../contracts/events';
import { getBalanceCents } from './finance';
import { reserveInventory, transitionBatch } from './transitions';

export type VerticalSliceCommand = Extract<DomainCommand, {
  type:
    | 'PLANT/ADVANCE_FICTIONAL_STEP'
    | 'PLANT/HARVEST'
    | 'BATCH/CREATE'
    | 'BATCH/QUEUE'
    | 'BATCH/START_PROCESSING'
    | 'BATCH/SUBMIT_QC'
    | 'BATCH/RELEASE'
    | 'ORDER/ACCEPT'
    | 'ORDER/ALLOCATE'
    | 'DELIVERY/CREATE'
    | 'DELIVERY/DISPATCH'
    | 'DELIVERY/CONFIRM'
    | 'COMPLIANCE/RECORD_VIOLATION'
    | 'COMPLIANCE/RESOLVE_VIOLATION'
    | 'COMPLIANCE/START_AUDIT'
    | 'ROOM/PURCHASE'
    | 'STAFF/ASSIGN'
    | 'MACHINE/START_MAINTENANCE'
    | 'MACHINE/COMPLETE_MAINTENANCE'
}>;

const entityId = (value: string): EntityId => value as EntityId;
const eventId = (value: string): EventId => value as EventId;
const minute = (value: number): SimulationMinute => value as SimulationMinute;

export const ROOM_CATALOG = [
  { definitionId: 'production_room_small', displayName: 'Erweiterter Produktionsraum', kind: 'production', capacity: 6, costCents: 200_000, powerUnitsPerHour: 12 },
  { definitionId: 'processing_room_small', displayName: 'Zusätzlicher Verarbeitungsraum', kind: 'processing', capacity: 4, costCents: 250_000, powerUnitsPerHour: 8 },
  { definitionId: 'quality_lab_small', displayName: 'Zusätzliches Qualitätslabor', kind: 'quality', capacity: 3, costCents: 300_000, powerUnitsPerHour: 6 },
  { definitionId: 'storage_small', displayName: 'Zusätzliches Lager', kind: 'storage', capacity: 12, costCents: 150_000, powerUnitsPerHour: 3 },
  { definitionId: 'logistics_desk', displayName: 'Zusätzlicher Logistikplatz', kind: 'logistics', capacity: 4, costCents: 100_000, powerUnitsPerHour: 1 },
] as const;

function hasRoomCapacity(room: RoomState, requested: number): boolean {
  return Number.isSafeInteger(room.capacity) && room.capacity > 0
    && Number.isSafeInteger(room.occupied) && room.occupied >= 0
    && Number.isSafeInteger(requested) && requested >= 0
    && room.occupied + requested <= room.capacity;
}

function roomIsOperational(room: RoomState): boolean {
  return room.unlocked && Number(room.condition) > 0 && Number(room.availability) > 0;
}

function validEntityId(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,63}$/.test(value);
}

function failure(state: GameState, code: CommandFailureCode, message: string): CommandResult {
  return { ok: false, state, error: { code, message } };
}

function eventBase(state: GameState, command: CommandBase, entity: EntityId, suffix = 1) {
  return {
    eventId: eventId('event-' + command.commandId + '-' + suffix),
    simulationMinute: state.time.totalMinutes,
    schemaVersion: 1 as const,
    entityId: entity,
  };
}

function logEntry(state: GameState, command: CommandBase, code: string, message: string, relatedEntityIds: EntityId[]): GameLogEntry {
  return {
    id: entityId('log-' + (state.revision + 1)),
    at: state.time.totalMinutes,
    category: 'gameplay',
    code,
    message,
    actorId: command.actorId,
    relatedEntityIds,
  };
}

function commit(
  state: GameState,
  command: CommandBase,
  patch: Partial<GameState>,
  events: DomainEvent[],
  code: string,
  message: string,
  relatedEntityIds: EntityId[],
): CommandResult {
  const next: GameState = {
    ...state,
    ...patch,
    revision: state.revision + 1,
    logs: [...state.logs, logEntry(state, command, code, message, relatedEntityIds)],
  };
  return { ok: true, state: next, events };
}

function traceFromEvent(event: DomainEvent, actorId: EntityId, noteCode: string, relatedEntityIds: EntityId[]): TraceEntry {
  return {
    eventId: event.eventId,
    simulationMinute: event.simulationMinute,
    eventType: event.type,
    actorId,
    entityId: event.entityId,
    noteCode,
    relatedEntityIds,
  };
}

function withTrace(batch: BatchState, event: DomainEvent, actorId: EntityId, noteCode: string, relatedEntityIds: EntityId[]): BatchState {
  return { ...batch, trace: [...batch.trace, traceFromEvent(event, actorId, noteCode, relatedEntityIds)] };
}

function hasCompleteTrace(state: GameState, batch: BatchState): boolean {
  if (batch.plantIds.length === 0 || batch.sourceLotIds.length === 0 || batch.trace.length === 0) return false;
  return batch.plantIds.every((plantId) => {
    const plant = state.plants.find((item) => item.id === plantId);
    if (!plant || plant.stage !== 'harvested' || plant.batchId !== batch.id) return false;
    const source = state.sourceLots.find((item) => item.id === plant.sourceLotId);
    return Boolean(source && source.status === 'accepted' && source.traceEventIds.length > 0 && batch.sourceLotIds.includes(source.id));
  });
}

function isBlocked(state: GameState, operationCode: string): boolean {
  return state.compliance.licenseStatus === 'suspended'
    || state.compliance.licenseStatus === 'recovery_review'
    || state.compliance.blockedOperationCodes.includes(operationCode);
}

function nextTime(state: GameState): GameState['time'] {
  // totalMinutes is elapsed simulation time from the campaign start; the campaign starts at 08:00.
  const total = Number(state.time.totalMinutes) + 60;
  const absoluteMinuteOfDay = (480 + total) % 1440;
  return {
    ...state.time,
    totalMinutes: minute(total),
    day: Math.floor((480 + total) / 1440) + 1,
    minuteOfDay: absoluteMinuteOfDay,
  };
}

function qualityScoreFor(state: GameState, batch: BatchState): number {
  const plants = batch.plantIds.map((id) => state.plants.find((plant) => plant.id === id)).filter((plant) => plant !== undefined);
  if (plants.length === 0) return 0;
  const potential = plants.reduce((sum, plant) => sum + plant.qualityPotential, 0) / plants.length;
  const contamination = plants.reduce((sum, plant) => sum + plant.contaminationIndex, 0) / plants.length;
  return Math.max(0, Math.min(100, Math.round(potential - contamination * 0.5)));
}

export function applyVerticalSliceCommand(state: GameState, command: VerticalSliceCommand): CommandResult {
  if (command.expectedRevision !== state.revision) return failure(state, 'STALE_REVISION', 'Der Spielstand wurde zwischenzeitlich geändert.');
  if (command.actorId !== state.player.id) return failure(state, 'COMPLIANCE_BLOCKED', 'Nur der aktuelle Kampagnenleiter darf diese Aktion ausführen.');

  switch (command.type) {
    case 'ROOM/PURCHASE': {
      const definition = ROOM_CATALOG.find((item) => item.definitionId === command.definitionId);
      if (!validEntityId(command.roomId) || !definition) return failure(state, 'INVALID_PAYLOAD', 'Raum-ID oder Raumdefinition ist ungültig.');
      if (state.rooms.some((room) => room.id === command.roomId)
        || state.economy.ledger.some((entry) => entry.idempotencyKey === 'room:' + command.roomId + ':purchase')) {
        return failure(state, 'DUPLICATE_COMMAND', 'Raum-ID wurde bereits verwendet.');
      }
      if (getBalanceCents(state.economy) < definition.costCents) return failure(state, 'INSUFFICIENT_FUNDS', 'Das Spielbudget reicht für diesen Raum nicht aus.');
      const room: RoomState = {
        id: command.roomId,
        definitionId: definition.definitionId,
        displayName: definition.displayName,
        kind: definition.kind,
        capacity: definition.capacity,
        occupied: 0,
        condition: 100 as Score0To100,
        cleanliness: 100 as Score0To100,
        availability: 100 as Score0To100,
        powerUnitsPerHour: definition.powerUnitsPerHour,
        unlocked: true,
        assignedStaffIds: [],
        assignedMachineIds: [],
      };
      const ledgerEntry: LedgerEntry = {
        id: entityId('ledger-room-' + command.roomId + '-investment'),
        simulationMinute: state.time.totalMinutes,
        account: 'investment',
        amountCents: definition.costCents as LedgerEntry['amountCents'],
        referenceId: command.roomId,
        reasonCode: 'room.purchase',
        idempotencyKey: 'room:' + command.roomId + ':purchase',
      };
      const event: DomainEvent = {
        ...eventBase(state, command, room.id),
        type: 'room.purchased',
        roomId: room.id,
        definitionId: definition.definitionId,
        costCents: definition.costCents,
      };
      return commit(state, command, {
        rooms: [...state.rooms, room],
        economy: { ...state.economy, ledger: [...state.economy.ledger, ledgerEntry] },
      }, [event], 'ROOM_PURCHASED', 'Raumerweiterung gekauft und als Investition verbucht.', [room.id]);
    }
    case 'STAFF/ASSIGN': {
      if (!validEntityId(command.assignmentId) || !command.entityId) return failure(state, 'INVALID_PAYLOAD', 'Aufgaben-ID und Zielentität sind erforderlich.');
      if (state.assignments.some((assignment) => assignment.id === command.assignmentId)) return failure(state, 'DUPLICATE_COMMAND', 'Aufgaben-ID existiert bereits.');
      const staff = state.staff.find((item) => item.id === command.staffId);
      if (!staff) return failure(state, 'NOT_FOUND', 'Mitarbeiter nicht gefunden.');
      if (staff.activeAssignmentId !== null || state.assignments.some((item) => item.staffId === staff.id && item.status === 'active')) {
        return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiter hat bereits eine aktive Aufgabe.');
      }
      let targetRoomId: EntityId | null = null;
      let requiredRole: StaffRole | null = null;
      switch (command.taskCode) {
        case 'BATCH/OPERATIONS': {
          const batch = state.batches.find((item) => item.id === command.entityId);
          if (!batch) return failure(state, 'NOT_FOUND', 'Batch für die Personalzuweisung nicht gefunden.');
          if ((batch.status !== 'queued' && batch.status !== 'processing') || !batch.currentRoomId) return failure(state, 'INVALID_TRANSITION', 'Batch ist nicht für eine operative Personalzuweisung bereit.');
          targetRoomId = batch.currentRoomId;
          requiredRole = 'operations';
          break;
        }
        case 'BATCH/QUALITY': {
          const batch = state.batches.find((item) => item.id === command.entityId);
          if (!batch) return failure(state, 'NOT_FOUND', 'Batch für die Personalzuweisung nicht gefunden.');
          if (batch.status !== 'awaiting_qc') return failure(state, 'INVALID_TRANSITION', 'Batch wartet nicht auf Qualitätssicherung.');
          const room = state.rooms.find((item) => item.kind === 'quality' && item.unlocked);
          if (!room) return failure(state, 'PRECONDITION_FAILED', 'Kein Qualitätsraum verfügbar.');
          targetRoomId = room.id;
          requiredRole = 'quality';
          break;
        }
        case 'DELIVERY/LOGISTICS': {
          const delivery = state.deliveries.find((item) => item.id === command.entityId);
          if (!delivery) return failure(state, 'NOT_FOUND', 'Lieferung für die Personalzuweisung nicht gefunden.');
          if (!['planned', 'packed', 'dispatched', 'exception'].includes(delivery.status)) return failure(state, 'INVALID_TRANSITION', 'Lieferung benötigt keine aktive Logistikzuweisung.');
          const room = state.rooms.find((item) => item.kind === 'logistics' && item.unlocked);
          if (!room) return failure(state, 'PRECONDITION_FAILED', 'Kein Logistikraum verfügbar.');
          targetRoomId = room.id;
          requiredRole = 'logistics';
          break;
        }
        case 'MACHINE/MAINTENANCE': {
          const machine = state.machines.find((item) => item.id === command.entityId);
          if (!machine) return failure(state, 'NOT_FOUND', 'Maschine für die Wartungszuweisung nicht gefunden.');
          if (Number(machine.condition) >= 100 && machine.status !== 'broken') return failure(state, 'INVALID_TRANSITION', 'Die Maschine benötigt aktuell keine Wartung.');
          targetRoomId = machine.roomId;
          requiredRole = 'maintenance';
          break;
        }
        default:
          return failure(state, 'INVALID_PAYLOAD', 'Unbekannter Aufgabencode.');
      }
      if (staff.role !== requiredRole) return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiterrolle passt nicht zur Aufgabe.');
      if (state.assignments.some((item) => item.entityId === command.entityId && item.taskCode === command.taskCode && (item.status === 'active' || item.status === 'queued'))) {
        return failure(state, 'DUPLICATE_COMMAND', 'Für dieses Ziel besteht bereits eine offene Aufgabe dieses Typs.');
      }
      const targetRoom = state.rooms.find((item) => item.id === targetRoomId);
      if (!targetRoom || !roomIsOperational(targetRoom)) return failure(state, 'PRECONDITION_FAILED', 'Zielraum ist nicht verfügbar.');
      const assignment = {
        id: command.assignmentId,
        staffId: staff.id,
        taskCode: command.taskCode,
        entityId: command.entityId,
        startedAt: state.time.totalMinutes,
        dueAt: null,
        progress: 0 as Score0To100,
        status: 'active' as const,
      };
      const event: DomainEvent = {
        ...eventBase(state, command, assignment.id),
        type: 'staff.assignment_created',
        assignmentId: assignment.id,
        staffId: staff.id,
        taskCode: assignment.taskCode,
      };
      return commit(state, command, {
        assignments: [...state.assignments, assignment],
        staff: state.staff.map((item) => item.id === staff.id ? { ...item, assignedRoomId: targetRoom.id, activeAssignmentId: assignment.id } : item),
        rooms: state.rooms.map((room) => {
          const withoutStaff = room.assignedStaffIds.filter((id) => id !== staff.id);
          if (room.id === targetRoom.id) return { ...room, assignedStaffIds: [...new Set([...withoutStaff, staff.id])] };
          return withoutStaff.length === room.assignedStaffIds.length ? room : { ...room, assignedStaffIds: withoutStaff };
        }),
      }, [event], 'STAFF_ASSIGNED', 'Mitarbeiterrolle und Zielraum geprüft; Aufgabe verbindlich zugewiesen.', [staff.id, assignment.id, command.entityId]);
    }
    case 'MACHINE/START_MAINTENANCE': {
      const machine = state.machines.find((item) => item.id === command.machineId);
      const assignment = state.assignments.find((item) => item.id === command.assignmentId);
      const staff = assignment ? state.staff.find((item) => item.id === assignment.staffId) : undefined;
      if (!machine || !assignment || !staff) return failure(state, 'NOT_FOUND', 'Maschine, Wartungsauftrag oder Mitarbeiter nicht gefunden.');
      if (assignment.taskCode !== 'MACHINE/MAINTENANCE' || assignment.entityId !== machine.id || assignment.status !== 'active'
        || staff.role !== 'maintenance' || staff.activeAssignmentId !== assignment.id) {
        return failure(state, 'PRECONDITION_FAILED', 'Aktiver, passender Wartungsauftrag ist erforderlich.');
      }
      if ((machine.status !== 'idle' && machine.status !== 'broken') || (Number(machine.condition) >= 100 && machine.status !== 'broken')) {
        return failure(state, 'INVALID_TRANSITION', 'Maschine ist nicht wartungsbereit.');
      }
      if (Number(staff.energy) < 10) return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiterenergie reicht für die Wartung nicht aus.');
      const room = state.rooms.find((item) => item.id === machine.roomId);
      if (!room || !roomIsOperational(room)) return failure(state, 'PRECONDITION_FAILED', 'Maschinenraum ist nicht verfügbar.');
      const event: DomainEvent = {
        ...eventBase(state, command, machine.id),
        type: 'machine.maintenance_started',
        machineId: machine.id,
        assignmentId: assignment.id,
        condition: machine.condition,
      };
      return commit(state, command, {
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, status: 'maintenance', activeJobId: assignment.id } : item),
      }, [event], 'MACHINE_MAINTENANCE_STARTED', 'Fiktive Maschinenwartung gestartet.', [machine.id, assignment.id, staff.id]);
    }
    case 'MACHINE/COMPLETE_MAINTENANCE': {
      const machine = state.machines.find((item) => item.id === command.machineId);
      const assignment = state.assignments.find((item) => item.id === command.assignmentId);
      const staff = assignment ? state.staff.find((item) => item.id === assignment.staffId) : undefined;
      if (!machine || !assignment || !staff) return failure(state, 'NOT_FOUND', 'Maschine, Wartungsauftrag oder Mitarbeiter nicht gefunden.');
      if (machine.status !== 'maintenance' || machine.activeJobId !== assignment.id
        || assignment.taskCode !== 'MACHINE/MAINTENANCE' || assignment.entityId !== machine.id
        || assignment.status !== 'active' || staff.role !== 'maintenance' || staff.activeAssignmentId !== assignment.id) {
        return failure(state, 'PRECONDITION_FAILED', 'Nur die aktive Wartung dieser Maschine kann abgeschlossen werden.');
      }
      if (Number(staff.energy) < 10) return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiterenergie reicht zum Abschluss nicht aus.');
      const condition = Math.min(100, Number(machine.condition) + 35) as Score0To100;
      const completedEvent: DomainEvent = {
        ...eventBase(state, command, machine.id, 1),
        type: 'machine.maintenance_completed',
        machineId: machine.id,
        assignmentId: assignment.id,
        condition,
      };
      const assignmentEvent: DomainEvent = {
        ...eventBase(state, command, assignment.id, 2),
        type: 'staff.assignment_completed',
        assignmentId: assignment.id,
        staffId: staff.id,
        taskCode: assignment.taskCode,
      };
      return commit(state, command, {
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, condition, status: condition > 0 ? 'idle' : 'broken', activeJobId: null } : item),
        assignments: state.assignments.map((item) => item.id === assignment.id ? { ...item, status: 'completed', progress: 100 as Score0To100 } : item),
        staff: state.staff.map((item) => item.id === staff.id ? { ...item, energy: (Number(item.energy) - 10) as Score0To100, activeAssignmentId: null } : item),
      }, [completedEvent, assignmentEvent], 'MACHINE_MAINTENANCE_COMPLETED', 'Wartung abgeschlossen; Maschinenzustand aktualisiert und Personalenergie verbucht.', [machine.id, assignment.id, staff.id]);
    }
    case 'PLANT/ADVANCE_FICTIONAL_STEP': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Produktionseinheit nicht gefunden.');
      if (plant.stage !== 'active') return failure(state, 'INVALID_TRANSITION', 'Nur aktive Produktionseinheiten können im Spiel fortschreiten.');
      const progress = Math.min(100, plant.progress + 20);
      const stage: PlantState['stage'] = progress === 100 ? 'ready_for_harvest' : 'active';
      const updatedPlant = { ...plant, progress: progress as typeof plant.progress, stage, lastUpdatedAt: state.time.totalMinutes };
      const event: DomainEvent = {
        ...eventBase(state, command, plant.id),
        type: 'plant.stage_changed',
        plantId: plant.id,
        previousStage: plant.stage,
        nextStage: stage,
      };
      const patch: Partial<GameState> = {
        plants: state.plants.map((item) => item.id === plant.id ? updatedPlant : item),
        time: nextTime(state),
      };
      return commit(state, command, patch, [event], 'PLANT_STAGE_ADVANCED', stage === 'ready_for_harvest' ? 'Spielinterner Reife-Meilenstein erreicht.' : 'Fiktiver Simulationsschritt abgeschlossen.', [plant.id]);
    }
    case 'PLANT/HARVEST': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Produktionseinheit nicht gefunden.');
      if (plant.stage !== 'ready_for_harvest' || plant.batchId !== null) return failure(state, 'INVALID_TRANSITION', 'Die Produktionseinheit ist nicht für den nächsten Spielschritt freigegeben.');
      const updatedPlant = { ...plant, stage: 'harvested' as const, lastUpdatedAt: state.time.totalMinutes };
      const event: DomainEvent = {
        ...eventBase(state, command, plant.id),
        type: 'plant.stage_changed',
        plantId: plant.id,
        previousStage: plant.stage,
        nextStage: 'harvested',
      };
      return commit(state, command, { plants: state.plants.map((item) => item.id === plant.id ? updatedPlant : item) }, [event], 'PLANT_HARVESTED', 'Einheit in den nächsten fiktiven Prozessschritt überführt.', [plant.id]);
    }
    case 'BATCH/CREATE': {
      if (state.batches.some((batch) => batch.id === command.batchId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Batch-ID existiert bereits.');
      if (command.plantIds.length === 0 || new Set(command.plantIds).size !== command.plantIds.length) return failure(state, 'INVALID_PAYLOAD', 'Mindestens eine eindeutige Produktionseinheit ist erforderlich.');
      const plants = command.plantIds.map((id) => state.plants.find((plant) => plant.id === id));
      if (plants.some((plant) => !plant || plant.stage !== 'harvested' || plant.batchId !== null)) return failure(state, 'INVALID_TRANSITION', 'Alle Einheiten müssen geerntet und noch keinem Batch zugeordnet sein.');
      const validPlants = plants.filter((plant) => plant !== undefined);
      const sourceLotIds = [...new Set(validPlants.map((plant) => plant.sourceLotId))];
      if (sourceLotIds.some((id) => !state.sourceLots.some((lot) => lot.id === id && lot.status === 'accepted'))) return failure(state, 'COMPLIANCE_BLOCKED', 'Herkunft ist nicht vollständig freigegeben.');
      const batch: BatchState = {
        id: command.batchId,
        profileId: command.profileId,
        sourceLotIds,
        plantIds: command.plantIds,
        quantity: command.plantIds.length * 6,
        qualityScore: null,
        status: 'created',
        createdAt: state.time.totalMinutes,
        updatedAt: state.time.totalMinutes,
        currentRoomId: null,
        inventoryLotIds: [],
        assessmentIds: [],
        trace: [],
        holdReason: null,
      };
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.created', batchId: batch.id };
      const tracedBatch = withTrace(batch, event, command.actorId, 'BATCH_CREATED', [...command.plantIds, ...sourceLotIds]);
      return commit(state, command, {
        batches: [...state.batches, tracedBatch],
        plants: state.plants.map((plant) => command.plantIds.includes(plant.id) ? { ...plant, batchId: batch.id } : plant),
      }, [event], 'BATCH_CREATED', 'Batch angelegt und Herkunft verknüpft.', [batch.id, ...command.plantIds, ...sourceLotIds]);
    }
    case 'BATCH/QUEUE': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      const room = state.rooms.find((item) => item.id === command.roomId);
      if (!batch || !room) return failure(state, 'NOT_FOUND', 'Batch oder Verarbeitungsraum nicht gefunden.');
      if (batch.status !== 'created' || room.kind !== 'processing' || !room.unlocked) return failure(state, 'INVALID_TRANSITION', 'Batch oder Raum ist nicht für die Einplanung verfügbar.');
      if (!roomIsOperational(room)) return failure(state, 'PRECONDITION_FAILED', 'Der Verarbeitungsraum ist nicht betriebsbereit.');
      if (!hasRoomCapacity(room, 1)) return failure(state, 'CAPACITY_EXCEEDED', 'Der Verarbeitungsraum hat keine freie Spielkapazität.');
      if (isBlocked(state, 'BATCH/QUEUE')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren diesen Vorgang.');
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.queued', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'queued', currentRoomId: room.id, updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_QUEUED', [room.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        rooms: state.rooms.map((item) => item.id === room.id ? { ...item, occupied: item.occupied + 1 } : item),
      }, [event], 'BATCH_QUEUED', 'Batch in die fiktive Verarbeitung eingeplant.', [batch.id, room.id]);
    }
    case 'BATCH/START_PROCESSING': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      const machine = state.machines.find((item) => item.id === command.machineId);
      if (!batch || !machine) return failure(state, 'NOT_FOUND', 'Batch oder Anlage nicht gefunden.');
      if (batch.status !== 'queued' || machine.status !== 'idle' || machine.roomId !== batch.currentRoomId) return failure(state, 'INVALID_TRANSITION', 'Batch und Anlage sind nicht startbereit.');
      const processingRoom = state.rooms.find((item) => item.id === batch.currentRoomId);
      if (!processingRoom || !roomIsOperational(processingRoom) || Number(processingRoom.condition) < 20 || Number(machine.condition) < 20) {
        return failure(state, 'PRECONDITION_FAILED', 'Maschine oder Verarbeitungsraum benötigt Wartung bzw. ist nicht verfügbar.');
      }
      if (isBlocked(state, 'BATCH/START_PROCESSING')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren die Verarbeitung.');
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.processing_started', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'processing', updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_PROCESSING_STARTED', [machine.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, status: 'active', activeJobId: batch.id } : item),
      }, [event], 'BATCH_PROCESSING_STARTED', 'Fiktiver Verarbeitungsschritt gestartet.', [batch.id, machine.id]);
    }
    case 'BATCH/SUBMIT_QC': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      if (!batch) return failure(state, 'NOT_FOUND', 'Batch nicht gefunden.');
      if (batch.status !== 'processing') return failure(state, 'INVALID_TRANSITION', 'Nur ein abgeschlossener Verarbeitungsschritt kann zur Spiel-QA übergeben werden.');
      const qualityRoom = state.rooms.find((item) => item.kind === 'quality' && item.unlocked);
      const processingRoom = state.rooms.find((item) => item.id === batch.currentRoomId);
      const assessor = state.staff.find((item) => item.role === 'quality');
      if (!qualityRoom || !processingRoom || !assessor) return failure(state, 'PRECONDITION_FAILED', 'Qualitätssicherung ist nicht verfügbar.');
      if (!roomIsOperational(qualityRoom)) return failure(state, 'PRECONDITION_FAILED', 'Qualitätssicherung ist nicht betriebsbereit.');
      if (!hasRoomCapacity(qualityRoom, 1)) return failure(state, 'CAPACITY_EXCEEDED', 'Die Qualitätssicherung hat keine freie Spielkapazität.');
      const scoreValue = qualityScoreFor(state, batch);
      const traceComplete = hasCompleteTrace(state, batch);
      const decision: QualityAssessment['decision'] = scoreValue >= 75 && traceComplete ? 'pass' : scoreValue >= 60 ? 'review' : 'fail';
      const assessmentId = command.assessmentId;
      if (state.batches.some((item) => item.assessmentIds.includes(assessmentId))) return failure(state, 'DUPLICATE_COMMAND', 'Diese Prüf-ID existiert bereits.');
      const assessment: QualityAssessment = {
        id: assessmentId,
        batchId: batch.id,
        ruleSetVersion: 'fictional-game-balance-v1',
        performedAt: state.time.totalMinutes,
        score: scoreValue as Score0To100,
        findings: traceComplete ? (decision === 'pass' ? [] : ['FICTIONAL_SCORE_BELOW_RELEASE_THRESHOLD']) : ['TRACE_CHAIN_INCOMPLETE'],
        decision,
        assessorId: assessor.id,
        traceComplete,
      };
      const qualityEvent: DomainEvent = { ...eventBase(state, command, batch.id, 1), type: 'quality.assessed', batchId: batch.id, assessmentId, score: scoreValue as Score0To100, decision };
      const awaitingEvent: DomainEvent = { ...eventBase(state, command, batch.id, 2), type: 'batch.awaiting_qc', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'awaiting_qc', qualityScore: scoreValue as BatchState['qualityScore'], updatedAt: state.time.totalMinutes, currentRoomId: qualityRoom.id, assessmentIds: [...batch.assessmentIds, assessmentId] }, awaitingEvent, command.actorId, 'BATCH_AWAITING_QC', [assessmentId, qualityRoom.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        rooms: state.rooms.map((room) => room.id === processingRoom.id ? { ...room, occupied: Math.max(0, room.occupied - 1) } : room.id === qualityRoom.id ? { ...room, occupied: room.occupied + 1 } : room),
        machines: state.machines.map((machine) => machine.activeJobId === batch.id ? { ...machine, status: 'idle', activeJobId: null } : machine),
        ui: { ...state.ui, notifications: [...state.ui.notifications, { id: entityId('notification-qc-' + (state.revision + 1)), code: 'QC_COMPLETED', level: decision === 'pass' ? 'success' : 'warning', title: 'Qualitätssicherung', message: decision === 'pass' ? 'Spielinterne Qualitätsfreigabe möglich.' : 'Manuelle Prüfung erforderlich.', createdAt: state.time.totalMinutes, read: false }] },
        qualityAssessments: [...state.qualityAssessments, assessment],
      }, [qualityEvent, awaitingEvent], 'BATCH_QC_COMPLETED', 'Fiktive Qualitätsprüfung abgeschlossen: ' + decision + '.', [batch.id, assessmentId]);
    }
    case 'BATCH/RELEASE': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      if (!batch) return failure(state, 'NOT_FOUND', 'Batch nicht gefunden.');
      if (batch.status !== 'awaiting_qc' || batch.qualityScore === null) return failure(state, 'INVALID_TRANSITION', 'Batch wartet nicht auf eine Qualitätsentscheidung.');
      const assessment = [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id);
      if (!assessment) return failure(state, 'PRECONDITION_FAILED', 'Für diesen Batch liegt keine gespeicherte Qualitätsentscheidung vor.');
      const latestTraceComplete = assessment.traceComplete;
      const gate = transitionBatch('awaiting_qc', 'released', {
        qualityDecision: assessment.decision,
        traceComplete: latestTraceComplete,
        compliance: { licenseStatus: state.compliance.licenseStatus, blockedOperationCodes: state.compliance.blockedOperationCodes },
      });
      if (!gate.ok) return failure(state, gate.error, 'Die Qualitäts-, Rückverfolgbarkeits- oder Compliance-Freigabe wurde nicht bestanden.');
      const storageRoom = state.rooms.find((room) => room.kind === 'storage' && room.unlocked);
      if (!storageRoom) return failure(state, 'PRECONDITION_FAILED', 'Kein freigegebenes Lager verfügbar.');
      if (!roomIsOperational(storageRoom)) return failure(state, 'PRECONDITION_FAILED', 'Das freigegebene Lager ist nicht betriebsbereit.');
      if (!hasRoomCapacity(storageRoom, batch.quantity)) return failure(state, 'CAPACITY_EXCEEDED', 'Das freigegebene Lager hat nicht genug Kapazität.');
      const lotId = entityId('inventory-' + batch.id);
      if (state.inventoryLots.some((lot) => lot.id === lotId)) return failure(state, 'DUPLICATE_COMMAND', 'Bestandslos existiert bereits.');
      const lot: InventoryLotState = {
        id: lotId, batchId: batch.id, itemDefinitionId: 'BOT-01', quantityAvailable: batch.quantity, quantityReserved: 0,
        qualityScore: batch.qualityScore, status: 'released', createdAt: state.time.totalMinutes,
        expiresAt: minute(Number(state.time.totalMinutes) + 10080), storageRoomId: storageRoom.id,
      };
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.released', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'released', currentRoomId: storageRoom.id, inventoryLotIds: [...batch.inventoryLotIds, lotId], updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_RELEASED', [lotId, storageRoom.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        inventoryLots: [...state.inventoryLots, lot],
        rooms: state.rooms.map((room) => room.id === storageRoom.id ? { ...room, occupied: room.occupied + batch.quantity } : room.id === batch.currentRoomId ? { ...room, occupied: Math.max(0, room.occupied - 1) } : room),
      }, [event], 'BATCH_RELEASED', 'Batch freigegeben und Bestand gebucht.', [batch.id, lotId]);
    }
    case 'ORDER/ACCEPT': {
      const order = state.orders.find((item) => item.id === command.orderId);
      const customer = order ? state.customers.find((item) => item.id === order.customerId) : undefined;
      if (!order || !customer) return failure(state, 'NOT_FOUND', 'Auftrag oder Kunde nicht gefunden.');
      if (order.status !== 'available') return failure(state, 'INVALID_TRANSITION', 'Dieser Auftrag ist nicht mehr verfügbar.');
      if (!customer.unlocked || state.reputation < customer.minimumReputation) return failure(state, 'COMPLIANCE_BLOCKED', 'Kundenanforderungen sind nicht erfüllt.');
      if (isBlocked(state, 'ORDER/ACCEPT')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren die Auftragsannahme.');
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'order.accepted', orderId: order.id };
      return commit(state, command, { orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'accepted', acceptedAt: state.time.totalMinutes } : item) }, [event], 'ORDER_ACCEPTED', 'Kundenauftrag angenommen.', [order.id, customer.id]);
    }
    case 'ORDER/ALLOCATE': {
      const order = state.orders.find((item) => item.id === command.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Auftrag nicht gefunden.');
      if (order.status !== 'accepted') return failure(state, 'INVALID_TRANSITION', 'Nur angenommene Aufträge können Bestand reservieren.');
      if (command.lotIds.length === 0 || new Set(command.lotIds).size !== command.lotIds.length) return failure(state, 'INVALID_PAYLOAD', 'Mindestens ein eindeutiges Bestandslos ist erforderlich.');
      let remaining = order.requestedQuantity;
      const updatedLots = new Map<EntityId, InventoryLotState>();
      for (const lotId of command.lotIds) {
        const lot = state.inventoryLots.find((item) => item.id === lotId);
        if (!lot) return failure(state, 'NOT_FOUND', 'Bestandslos nicht gefunden.');
        if (lot.qualityScore < order.minQuality) return failure(state, 'QUALITY_GATE_FAILED', 'Die spielinterne Mindestqualität des Auftrags wird nicht erfüllt.');
        const freeQuantity = lot.quantityAvailable - lot.quantityReserved;
        if (freeQuantity <= 0) return failure(state, 'INSUFFICIENT_STOCK', 'Bestandslos hat keine freie Menge.');
        const reservation = reserveInventory(lot, Math.min(remaining, freeQuantity));
        if (!reservation.ok) return failure(state, reservation.error === 'INSUFFICIENT_STOCK' ? 'INSUFFICIENT_STOCK' : 'PRECONDITION_FAILED', 'Bestand kann nicht reserviert werden.');
        const reservedNow = reservation.reservation.quantityReserved - lot.quantityReserved;
        updatedLots.set(lot.id, { ...lot, quantityReserved: reservation.reservation.quantityReserved });
        remaining -= reservedNow;
        if (remaining <= 0) break;
      }
      if (remaining > 0) return failure(state, 'INSUFFICIENT_STOCK', 'Freigegebener Bestand reicht für den Auftrag nicht aus.');
      const allocatedIds = [...updatedLots.keys()];
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'order.allocated', orderId: order.id };
      return commit(state, command, {
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'allocated', allocatedLotIds: allocatedIds } : item),
        inventoryLots: state.inventoryLots.map((lot) => updatedLots.get(lot.id) ?? lot),
      }, [event], 'ORDER_ALLOCATED', 'Freigegebener Bestand atomar reserviert.', [order.id, ...allocatedIds]);
    }
    case 'DELIVERY/CREATE': {
      const order = state.orders.find((item) => item.id === command.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Auftrag nicht gefunden.');
      if (order.status !== 'allocated' || order.deliveryId !== null) return failure(state, 'INVALID_TRANSITION', 'Auftrag muss eindeutig reserviert sein und darf noch keine Lieferung haben.');
      if (state.deliveries.some((item) => item.id === command.deliveryId)) return failure(state, 'DUPLICATE_COMMAND', 'Liefer-ID existiert bereits.');
      const delivery = {
        id: command.deliveryId, orderId: order.id, lotIds: [...order.allocatedLotIds], quantity: order.requestedQuantity,
        status: 'planned' as const, plannedAt: state.time.totalMinutes, dispatchedAt: null, deliveredAt: null,
        routeId: command.routeId, proofCode: null, complianceCaseIds: [],
      };
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'delivery.created', deliveryId: delivery.id, orderId: order.id };
      return commit(state, command, {
        deliveries: [...state.deliveries, delivery],
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'ready_to_ship', deliveryId: delivery.id } : item),
      }, [event], 'DELIVERY_CREATED', 'Lieferung vorbereitet.', [delivery.id, order.id]);
    }
    case 'DELIVERY/DISPATCH': {
      const delivery = state.deliveries.find((item) => item.id === command.deliveryId);
      if (!delivery) return failure(state, 'NOT_FOUND', 'Lieferung nicht gefunden.');
      if (delivery.status !== 'planned' && delivery.status !== 'packed') return failure(state, 'INVALID_TRANSITION', 'Lieferung ist nicht versandbereit.');
      if (isBlocked(state, 'DELIVERY/DISPATCH')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert den Versand.');
      const order = state.orders.find((item) => item.id === delivery.orderId);
      if (!order || order.status !== 'ready_to_ship') return failure(state, 'PRECONDITION_FAILED', 'Auftrag ist nicht versandbereit.');
      const reserved = delivery.lotIds.reduce((sum, id) => {
        const lot = state.inventoryLots.find((item) => item.id === id);
        return sum + (lot ? lot.quantityReserved : 0);
      }, 0);
      if (reserved < delivery.quantity) return failure(state, 'INSUFFICIENT_STOCK', 'Reservierter Bestand reicht nicht aus.');
      const event: DomainEvent = { ...eventBase(state, command, delivery.id), type: 'delivery.dispatched', deliveryId: delivery.id, orderId: order.id };
      return commit(state, command, {
        deliveries: state.deliveries.map((item) => item.id === delivery.id ? { ...item, status: 'dispatched', dispatchedAt: state.time.totalMinutes } : item),
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'shipped' } : item),
      }, [event], 'DELIVERY_DISPATCHED', 'Lieferung versandt; Bestand bleibt bis zum Empfang reserviert.', [delivery.id, order.id]);
    }
    case 'DELIVERY/CONFIRM': {
      const delivery = state.deliveries.find((item) => item.id === command.deliveryId);
      if (!delivery) return failure(state, 'NOT_FOUND', 'Lieferung nicht gefunden.');
      if (delivery.status === 'delivered' && delivery.proofCode === command.proofCode) return { ok: true, state, events: [] };
      if (delivery.status !== 'dispatched' || command.proofCode.trim().length < 4) return failure(state, 'INVALID_TRANSITION', 'Eine versandte Lieferung und ein gültiger Spielnachweis sind erforderlich.');
      const order = state.orders.find((item) => item.id === delivery.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Zugehöriger Auftrag nicht gefunden.');
      const ledgerKey = 'delivery:' + delivery.id + ':revenue';
      if (state.economy.ledger.some((entry) => entry.idempotencyKey === ledgerKey)) return failure(state, 'DUPLICATE_COMMAND', 'Umsatz wurde bereits verbucht.');
      let remaining = delivery.quantity;
      const updatedLots = new Map<EntityId, InventoryLotState>();
      for (const lotId of delivery.lotIds) {
        const lot = state.inventoryLots.find((item) => item.id === lotId);
        if (!lot) return failure(state, 'NOT_FOUND', 'Lieferlos nicht gefunden.');
        const amount = Math.min(remaining, lot.quantityReserved);
        if (amount <= 0) continue;
        const available = lot.quantityAvailable - amount;
        const reservedQuantity = lot.quantityReserved - amount;
        updatedLots.set(lot.id, {
          ...lot,
          quantityAvailable: available,
          quantityReserved: reservedQuantity,
          status: available === 0 ? 'depleted' : 'released',
        });
        remaining -= amount;
      }
      if (remaining > 0) return failure(state, 'INSUFFICIENT_STOCK', 'Reservierter Bestand reicht nicht zur Bestätigung.');
      const ledgerEntry: LedgerEntry = {
        id: entityId('ledger-' + delivery.id + '-revenue'),
        simulationMinute: state.time.totalMinutes,
        account: 'revenue',
        amountCents: order.contractValueCents,
        referenceId: order.id,
        reasonCode: 'order.fulfilled',
        idempotencyKey: ledgerKey,
      };
      const deliveryEvent: DomainEvent = { ...eventBase(state, command, delivery.id, 1), type: 'delivery.delivered', deliveryId: delivery.id, orderId: order.id };
      const financeEvent: DomainEvent = { ...eventBase(state, command, order.id, 2), type: 'finance.ledger_posted', ledgerEntryId: ledgerEntry.id, amountCents: Number(order.contractValueCents), account: 'revenue' };
      const roomDeltas = new Map<EntityId, number>();
      for (const [lotId, updatedLot] of updatedLots) {
        const originalLot = state.inventoryLots.find((lot) => lot.id === lotId);
        if (!originalLot) continue;
        const consumed = originalLot.quantityAvailable - updatedLot.quantityAvailable;
        roomDeltas.set(updatedLot.storageRoomId, (roomDeltas.get(updatedLot.storageRoomId) ?? 0) + consumed);
      }
      return commit(state, command, {
        deliveries: state.deliveries.map((item) => item.id === delivery.id ? { ...item, status: 'delivered', deliveredAt: state.time.totalMinutes, proofCode: command.proofCode.trim() } : item),
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'delivered' } : item),
        inventoryLots: state.inventoryLots.map((lot) => updatedLots.get(lot.id) ?? lot),
        rooms: state.rooms.map((room) => {
          const consumed = roomDeltas.get(room.id) ?? 0;
          return consumed > 0 ? { ...room, occupied: Math.max(0, room.occupied - consumed) } : room;
        }),
        economy: { ...state.economy, ledger: [...state.economy.ledger, ledgerEntry] },
        reputation: Math.min(1000, Number(state.reputation) + 5) as GameState['reputation'],
      }, [deliveryEvent, financeEvent], 'DELIVERY_CONFIRMED', 'Wareneingang bestätigt; Umsatz einmalig gebucht.', [delivery.id, order.id, ...delivery.lotIds]);
    }
    case 'COMPLIANCE/RECORD_VIOLATION': {
      const code = command.code.trim();
      const operationCodes = [...new Set(command.operationCodes.map((item) => item.trim()).filter(Boolean))];
      if (!code || code.length > 100 || operationCodes.length !== command.operationCodes.length
        || command.relatedEntityIds.some((id) => !id.trim())) {
        return failure(state, 'INVALID_PAYLOAD', 'Vorfallscode, betroffene Entitäten und eindeutige Operationscodes sind erforderlich.');
      }
      if (state.compliance.violations.some((item) => item.id === command.violationId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Vorfall-ID existiert bereits.');
      const violation = {
        id: command.violationId, code, severity: command.severity, occurredAt: state.time.totalMinutes,
        relatedEntityIds: [...new Set(command.relatedEntityIds)], resolvedAt: null, resolutionCode: null, operationCodes,
      };
      const severe = command.severity === 'high' || command.severity === 'critical';
      const licenseStatus = state.compliance.licenseStatus === 'suspended' || severe
        ? 'suspended' as const
        : state.compliance.licenseStatus === 'recovery_review' ? 'recovery_review' as const : 'warning' as const;
      const addedRisk = command.severity === 'critical' ? 35 : command.severity === 'high' ? 20 : command.severity === 'medium' ? 10 : 3;
      const event: DomainEvent = { ...eventBase(state, command, command.violationId), type: 'compliance.violation_recorded', code, status: licenseStatus };
      return commit(state, command, {
        compliance: {
          ...state.compliance, licenseStatus,
          risk: Math.min(100, Number(state.compliance.risk) + addedRisk) as GameState['compliance']['risk'],
          violations: [...state.compliance.violations, violation],
          blockedOperationCodes: [...new Set([...state.compliance.blockedOperationCodes, ...operationCodes])],
        },
      }, [event], 'COMPLIANCE_VIOLATION_RECORDED', 'Fiktiven Compliance-Vorfall erfasst; betroffene Aktionen sind bis zur Prüfung gesperrt.', [command.violationId, ...violation.relatedEntityIds]);
    }
    case 'COMPLIANCE/RESOLVE_VIOLATION': {
      const violation = state.compliance.violations.find((item) => item.id === command.violationId);
      if (!violation) return failure(state, 'NOT_FOUND', 'Compliance-Vorfall nicht gefunden.');
      if (violation.resolvedAt !== null) return failure(state, 'DUPLICATE_COMMAND', 'Für diesen Vorfall wurde bereits eine Korrekturmaßnahme bestätigt.');
      const resolutionCode = command.resolutionCode.trim();
      if (resolutionCode.length < 4 || resolutionCode.length > 100) return failure(state, 'INVALID_PAYLOAD', 'Der Korrekturcode muss zwischen 4 und 100 Zeichen lang sein.');
      const event: DomainEvent = { ...eventBase(state, command, violation.id), type: 'compliance.corrective_action_completed', code: resolutionCode, status: 'corrective_action_completed' };
      return commit(state, command, {
        compliance: {
          ...state.compliance,
          violations: state.compliance.violations.map((item) => item.id === violation.id ? { ...item, resolvedAt: state.time.totalMinutes, resolutionCode } : item),
        },
      }, [event], 'COMPLIANCE_CORRECTIVE_ACTION_COMPLETED', 'Korrekturmaßnahme protokolliert; Lizenzstatus bleibt bis zum Audit unverändert.', [violation.id, ...violation.relatedEntityIds]);
    }
    case 'COMPLIANCE/START_AUDIT': {
      const unresolved = state.compliance.violations.filter((item) => item.resolvedAt === null);
      const severeOpen = unresolved.some((item) => item.severity === 'high' || item.severity === 'critical');
      const nextStatus = severeOpen ? 'suspended' as const : unresolved.length > 0 ? 'warning' as const : 'valid' as const;
      const blockedOperationCodes = [...new Set(unresolved.flatMap((item) => item.operationCodes ?? []))];
      const auditEvent: DomainEvent = { ...eventBase(state, command, command.auditId, 1), type: 'compliance.audit_completed', code: 'audit.completed', status: nextStatus };
      const events: DomainEvent[] = [auditEvent];
      if (nextStatus !== state.compliance.licenseStatus) events.push({ ...eventBase(state, command, command.auditId, 2), type: 'compliance.license_changed', code: 'license.' + nextStatus, status: nextStatus });
      const risk = unresolved.reduce((sum, item) => sum + (item.severity === 'critical' ? 35 : item.severity === 'high' ? 20 : item.severity === 'medium' ? 10 : 3), 0);
      return commit(state, command, {
        compliance: {
          ...state.compliance, licenseStatus: nextStatus,
          risk: Math.min(100, risk) as GameState['compliance']['risk'],
          lastAuditAt: state.time.totalMinutes,
          auditDueAt: minute(Number(state.time.totalMinutes) + 1440),
          blockedOperationCodes,
        },
      }, events, 'COMPLIANCE_AUDIT_COMPLETED', 'Compliance-Audit abgeschlossen; Lizenz- und Sperrstatus wurden aus offenen Vorfällen abgeleitet.', [command.auditId, ...unresolved.map((item) => item.id)]);
    }
    default: {
      const unsupported: never = command;
      return failure(state, 'PRECONDITION_FAILED', 'Nicht unterstützter Vertikalschnitt-Befehl: ' + String(unsupported));
    }
  }
}

export function getCampaignBalance(state: GameState): number {
  return Number(getBalanceCents(state.economy));
}

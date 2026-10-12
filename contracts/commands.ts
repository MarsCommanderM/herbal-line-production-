import type { CommandId, EntityId, GameState, Score0To100 } from './domain';

export interface CommandBase { commandId: CommandId; actorId: EntityId; expectedRevision: number; }
export type DomainCommand =
  | (CommandBase & { type: 'TIME/SET_PAUSED'; paused: boolean })
  | (CommandBase & { type: 'TIME/SET_SPEED'; speed: 0 | 1 | 2 | 4 })
  | (CommandBase & { type: 'SOURCE/RECEIVE'; sourceLotId: EntityId; sourceRef: string; quantity: number })
  | (CommandBase & { type: 'SOURCE/INSPECT'; sourceLotId: EntityId; accepted: boolean; qualityScore: Score0To100; findingCodes: string[] })
  | (CommandBase & { type: 'PLANT/CREATE'; plantId: EntityId; profileId: string; sourceLotId: EntityId; roomId: EntityId })
  | (CommandBase & { type: 'PLANT/ADVANCE_FICTIONAL_STEP'; plantId: EntityId })
  | (CommandBase & { type: 'PLANT/REJECT'; plantId: EntityId; reasonCode: string })
  | (CommandBase & { type: 'PLANT/HARVEST'; plantId: EntityId })
  | (CommandBase & { type: 'BATCH/CREATE'; batchId: EntityId; plantIds: EntityId[]; profileId: string })
  | (CommandBase & { type: 'BATCH/QUEUE'; batchId: EntityId; roomId: EntityId })
  | (CommandBase & { type: 'BATCH/START_PROCESSING'; batchId: EntityId; machineId: EntityId })
  | (CommandBase & { type: 'BATCH/SUBMIT_QC'; batchId: EntityId; assessmentId: EntityId })
  | (CommandBase & { type: 'BATCH/RELEASE'; batchId: EntityId })
  | (CommandBase & { type: 'BATCH/REJECT'; batchId: EntityId; reasonCode: string })
  | (CommandBase & { type: 'ORDER/ACCEPT'; orderId: EntityId })
  | (CommandBase & { type: 'ORDER/ALLOCATE'; orderId: EntityId; lotIds: EntityId[] })
  | (CommandBase & { type: 'DELIVERY/CREATE'; deliveryId: EntityId; orderId: EntityId; routeId: string })
  | (CommandBase & { type: 'DELIVERY/DISPATCH'; deliveryId: EntityId })
  | (CommandBase & { type: 'DELIVERY/CONFIRM'; deliveryId: EntityId; proofCode: string })
  | (CommandBase & { type: 'ROOM/PURCHASE'; roomId: EntityId; definitionId: string })
  | (CommandBase & { type: 'FACILITY/ASSIGN_STAFF'; staffId: EntityId; roomId: EntityId })
  | (CommandBase & { type: 'FACILITY/UNASSIGN_STAFF'; staffId: EntityId })
  | (CommandBase & { type: 'FACILITY/MOVE_MACHINE'; machineId: EntityId; roomId: EntityId })
  | (CommandBase & { type: 'MACHINE/START_MAINTENANCE'; machineId: EntityId })
  | (CommandBase & { type: 'MACHINE/COMPLETE_MAINTENANCE'; machineId: EntityId })
  | (CommandBase & { type: 'STAFF/ASSIGN'; assignmentId: EntityId; staffId: EntityId; taskCode: string; entityId: EntityId | null })
  | (CommandBase & { type: 'UPGRADE/PURCHASE'; upgradeId: string })
  | (CommandBase & { type: 'COMPLIANCE/START_AUDIT'; auditId: EntityId })
;

export type UICommand =
  | (CommandBase & { type: 'UI/SELECT'; entityId: EntityId | null })
  | (CommandBase & { type: 'UI/SET_SCREEN'; screen: string });

export type PersistenceCommand = CommandBase & { type: 'SAVE/REQUEST'; slotId: string };
export type GameCommand = DomainCommand | UICommand | PersistenceCommand;

export type CommandFailureCode =
  | 'INVALID_PAYLOAD' | 'STALE_REVISION' | 'NOT_FOUND' | 'INVALID_TRANSITION'
  | 'INSUFFICIENT_FUNDS' | 'INSUFFICIENT_STOCK' | 'CAPACITY_EXCEEDED'
  | 'QUALITY_GATE_FAILED' | 'COMPLIANCE_BLOCKED' | 'TRACEABILITY_INCOMPLETE'
  | 'DUPLICATE_COMMAND' | 'PRECONDITION_FAILED';
export type CommandResult =
  | { ok: true; state: GameState; events: import('./events').DomainEvent[] }
  | { ok: false; state: GameState; error: { code: CommandFailureCode; message: string; details?: Record<string, string | number | boolean> } };

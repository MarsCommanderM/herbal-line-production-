import type { CareLevel, EntityId, EventId, PlantCareAction, SimulationMinute, Score0To100 } from './domain';
export interface EventBase { eventId: EventId; simulationMinute: SimulationMinute; schemaVersion: 1; entityId: EntityId; }
export type DomainEvent =
  | (EventBase & { type: 'time.day_ended'; completedDay: number; nextDay: number })
  | (EventBase & { type: 'source.received'; sourceLotId: EntityId })
  | (EventBase & { type: 'source.accepted' | 'source.quarantined' | 'source.rejected'; sourceLotId: EntityId; reasonCodes: string[] })
  | (EventBase & { type: 'plant.created' | 'plant.stage_changed' | 'plant.rejected'; plantId: EntityId; previousStage?: string; nextStage?: string; reasonCode?: string })
  | (EventBase & { type: 'plant.moved'; plantId: EntityId; previousRoomId: EntityId; nextRoomId: EntityId })
  | (EventBase & { type: 'plant.care_applied'; plantId: EntityId; action: PlantCareAction; setting?: CareLevel; createdPlantId?: EntityId })
  | (EventBase & { type: 'batch.created' | 'batch.queued' | 'batch.processing_started' | 'batch.awaiting_qc' | 'batch.released' | 'batch.rejected' | 'batch.quarantined'; batchId: EntityId; reasonCode?: string })
  | (EventBase & { type: 'quality.assessed'; batchId: EntityId; assessmentId: EntityId; score: Score0To100; decision: 'pass' | 'fail' | 'review' })
  | (EventBase & { type: 'order.accepted' | 'order.allocated' | 'order.blocked' | 'order.expired'; orderId: EntityId; reasonCode?: string })
  | (EventBase & { type: 'delivery.created'; deliveryId: EntityId; orderId: EntityId })
  | (EventBase & { type: 'delivery.dispatched' | 'delivery.delivered' | 'delivery.exception'; deliveryId: EntityId; orderId: EntityId; reasonCode?: string })
  | (EventBase & { type: 'compliance.violation_recorded' | 'compliance.license_changed' | 'compliance.audit_started' | 'compliance.audit_completed' | 'compliance.case_opened' | 'compliance.corrective_action_recorded' | 'compliance.corrective_action_submitted' | 'compliance.corrective_action_verified' | 'compliance.recovery_finalized'; code: string; status?: string })
  | (EventBase & { type: 'finance.ledger_posted'; ledgerEntryId: EntityId; amountCents: number; account: string })
  | (EventBase & { type: 'upgrade.purchased'; upgradeId: string; costCents: number })
  | (EventBase & { type: 'economy.distress_support_granted'; ledgerEntryId: EntityId; amountCents: number; daysOfRunway: number })
  | (EventBase & { type: 'facility.staff_assigned' | 'facility.staff_unassigned'; staffId: EntityId; roomId: EntityId })
  | (EventBase & { type: 'facility.machine_moved'; machineId: EntityId; previousRoomId: EntityId; nextRoomId: EntityId })
  | (EventBase & { type: 'machine.maintenance_started' | 'machine.maintenance_completed'; machineId: EntityId; roomId: EntityId; condition: number })
  | (EventBase & { type: 'persistence.save_succeeded' | 'persistence.save_failed'; slotId: string; reasonCode?: string });
export type DomainEventType = DomainEvent['type'];

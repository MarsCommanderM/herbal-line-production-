/** Canonical serializable domain contracts for Herbal Line.
 * All plant and process values are fictional game abstractions, never real-world operating advice.
 */
export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type EntityId = Brand<string, 'EntityId'>;
export type CommandId = Brand<string, 'CommandId'>;
export type EventId = Brand<string, 'EventId'>;
export type SimulationMinute = Brand<number, 'SimulationMinute'>;
export type MoneyCents = Brand<number, 'MoneyCents'>;
export type Score0To100 = Brand<number, 'Score0To100'>;
export type Risk0To100 = Brand<number, 'Risk0To100'>;
export type Reputation0To1000 = Brand<number, 'Reputation0To1000'>;

export type LicenseStatus = 'valid' | 'warning' | 'suspended' | 'recovery_review';
export type SourceLotStatus = 'pending_receipt' | 'received' | 'inspected' | 'accepted' | 'quarantined' | 'rejected';
export type PlantStage = 'planned' | 'active' | 'ready_for_harvest' | 'harvested' | 'rejected';
export type BatchStatus = 'created' | 'queued' | 'processing' | 'awaiting_qc' | 'released' | 'rejected' | 'quarantined';
export type OrderStatus = 'available' | 'accepted' | 'allocated' | 'ready_to_ship' | 'shipped' | 'delivered' | 'expired' | 'cancelled' | 'blocked' | 'delivery_exception';
export type RoomKind = 'production' | 'processing' | 'quality' | 'storage' | 'logistics' | 'office' | 'utility';
export type StaffRole = 'operations' | 'quality' | 'compliance' | 'logistics' | 'maintenance' | 'management';
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface TimeState { day: number; minuteOfDay: number; totalMinutes: SimulationMinute; speed: 0 | 1 | 2 | 4; paused: boolean; }
export interface PlayerState { id: EntityId; callsign: string; level: number; experience: number; }
export interface EnvironmentIndex { stability: number; cleanliness: number; availability: number; }
export interface RoomState {
  id: EntityId; definitionId: string; displayName: string; kind: RoomKind;
  capacity: number; occupied: number; condition: Score0To100; cleanliness: Score0To100;
  availability: Score0To100; powerUnitsPerHour: number; unlocked: boolean;
  assignedStaffIds: EntityId[]; assignedMachineIds: EntityId[];
}
export interface SourceLotState {
  id: EntityId; sourceRef: string; receivedAt: SimulationMinute; status: SourceLotStatus;
  quantity: number; qualityScore: Score0To100 | null; roomId: EntityId | null;
  inspectionFindings: string[]; traceEventIds: EventId[];
}
export interface PlantState {
  id: EntityId; profileId: string; sourceLotId: EntityId; roomId: EntityId;
  stage: PlantStage; progress: Score0To100; vitality: Score0To100; qualityPotential: Score0To100;
  stressIndex: Score0To100; contaminationIndex: Score0To100; createdAt: SimulationMinute;
  lastUpdatedAt: SimulationMinute; batchId: EntityId | null; rejectedReason: string | null;
}
export interface TraceEntry {
  eventId: EventId; simulationMinute: SimulationMinute; eventType: string;
  actorId: EntityId; entityId: EntityId; noteCode: string; relatedEntityIds: EntityId[];
}
export interface QualityAssessment {
  id: EntityId; batchId: EntityId; ruleSetVersion: string; performedAt: SimulationMinute;
  score: Score0To100; findings: string[]; decision: 'pass' | 'fail' | 'review';
  assessorId: EntityId; traceComplete: boolean;
}
export interface BatchState {
  id: EntityId; profileId: string; sourceLotIds: EntityId[]; plantIds: EntityId[];
  quantity: number; qualityScore: Score0To100 | null; status: BatchStatus;
  createdAt: SimulationMinute; updatedAt: SimulationMinute; currentRoomId: EntityId | null;
  inventoryLotIds: EntityId[]; assessmentIds: EntityId[]; trace: TraceEntry[];
  holdReason: string | null;
}
export interface InventoryLotState {
  id: EntityId; batchId: EntityId; itemDefinitionId: string; quantityAvailable: number;
  quantityReserved: number; qualityScore: Score0To100; status: 'held' | 'released' | 'depleted' | 'expired' | 'rejected';
  createdAt: SimulationMinute; expiresAt: SimulationMinute | null; storageRoomId: EntityId;
}
export interface OrderState {
  id: EntityId; customerId: EntityId; itemDefinitionId: string; requestedQuantity: number;
  minQuality: Score0To100; dueAt: SimulationMinute; status: OrderStatus;
  contractValueCents: MoneyCents; latePenaltyCents: MoneyCents; acceptedAt: SimulationMinute | null;
  allocatedLotIds: EntityId[]; deliveryId: EntityId | null;
}
export interface CustomerState {
  id: EntityId; name: string; kind: 'licensed_buyer' | 'institutional_buyer' | 'botanical_retailer';
  reliabilityScore: Score0To100; minimumReputation: Reputation0To1000; preferredQuality: Score0To100;
  paymentDelayDays: number; unlocked: boolean;
}
export interface DeliveryState {
  id: EntityId; orderId: EntityId; lotIds: EntityId[]; quantity: number;
  status: 'planned' | 'packed' | 'dispatched' | 'delivered' | 'exception' | 'cancelled';
  plannedAt: SimulationMinute; dispatchedAt: SimulationMinute | null; deliveredAt: SimulationMinute | null;
  routeId: string; proofCode: string | null; complianceCaseIds: EntityId[];
}
export interface StaffState {
  id: EntityId; profileId: string; displayName: string; role: StaffRole;
  skill: Score0To100; energy: Score0To100; morale: Score0To100;
  wageCentsPerDay: MoneyCents; assignedRoomId: EntityId | null; activeAssignmentId: EntityId | null;
}
export interface WorkAssignmentState {
  id: EntityId; staffId: EntityId; taskCode: string; entityId: EntityId | null;
  startedAt: SimulationMinute; dueAt: SimulationMinute | null; progress: Score0To100;
  status: 'queued' | 'active' | 'blocked' | 'completed' | 'cancelled';
}
export interface MachineState {
  id: EntityId; definitionId: string; roomId: EntityId; condition: Score0To100;
  status: 'idle' | 'active' | 'maintenance' | 'broken'; activeJobId: EntityId | null;
}
export interface ComplianceViolation {
  id: EntityId; code: string; severity: ViolationSeverity; occurredAt: SimulationMinute;
  relatedEntityIds: EntityId[]; resolvedAt: SimulationMinute | null; resolutionCode: string | null;
}
export interface ComplianceState {
  risk: Risk0To100; licenseStatus: LicenseStatus; violations: ComplianceViolation[];
  auditDueAt: SimulationMinute; lastAuditAt: SimulationMinute | null;
  blockedOperationCodes: string[];
}
export interface LedgerEntry {
  id: EntityId; simulationMinute: SimulationMinute; account: 'revenue' | 'expense' | 'penalty' | 'investment' | 'refund';
  amountCents: MoneyCents; referenceId: EntityId | null; reasonCode: string; idempotencyKey: string;
}
export interface EconomyState { openingBalanceCents: MoneyCents; ledger: LedgerEntry[]; }
export interface UpgradeState { id: string; unlocked: boolean; purchasedAt: SimulationMinute | null; }
export interface NotificationState {
  id: EntityId; code: string; level: 'info' | 'success' | 'warning' | 'danger';
  title: string; message: string; createdAt: SimulationMinute; read: boolean;
}
export interface GameLogEntry {
  id: EntityId; at: SimulationMinute; category: string; code: string; message: string;
  actorId: EntityId | null; relatedEntityIds: EntityId[];
}
export interface UIState { selectedEntityId: EntityId | null; activeScreen: string; notifications: NotificationState[]; }
export interface GameState {
  schemaVersion: 1; gameVersion: string; revision: number; rngState: number; time: TimeState;
  player: PlayerState; reputation: Reputation0To1000;
  rooms: RoomState[]; sourceLots: SourceLotState[]; plants: PlantState[]; batches: BatchState[];
  inventoryLots: InventoryLotState[]; qualityAssessments: QualityAssessment[]; orders: OrderState[]; customers: CustomerState[];
  deliveries: DeliveryState[]; staff: StaffState[]; assignments: WorkAssignmentState[]; machines: MachineState[];
  upgrades: UpgradeState[]; compliance: ComplianceState; economy: EconomyState;
  logs: GameLogEntry[]; ui: UIState;
}
export interface GameBalanceConfig {
  version: string; qcPassThreshold: number; licenseWarningRisk: number; licenseSuspendedRisk: number;
  reputationMin: number; reputationMax: number; initialMoneyCents: number;
  fixedStepHz: number; autosaveIntervalMs: number;
}

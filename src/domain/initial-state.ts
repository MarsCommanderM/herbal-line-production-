import { DRYING_RACK_UPGRADE_ID, SENSOR_PACK_UPGRADE_ID } from './upgrades';
import { GAME_BALANCE } from './balance';
import type {
  EntityId,
  EventId,
  GameState,
  MoneyCents,
  Reputation0To1000,
  Risk0To100,
  Score0To100,
  SimulationMinute,
} from '../../contracts/domain';

const entityId = (value: string): EntityId => value as EntityId;
const eventId = (value: string): EventId => value as EventId;
const minute = (value: number): SimulationMinute => value as SimulationMinute;
const cents = (value: number): MoneyCents => value as MoneyCents;
const score = (value: number): Score0To100 => value as Score0To100;
const risk = (value: number): Risk0To100 => value as Risk0To100;
const reputation = (value: number): Reputation0To1000 => value as Reputation0To1000;

/** Deterministic campaign start. Every numeric value here is fictional game balance. */
export function createInitialGameState(): GameState {
  const playerId = entityId('player-director-001');
  const productionRoomId = entityId('room-production-01');
  const processingRoomId = entityId('room-processing-01');
  const qualityRoomId = entityId('room-quality-01');
  const storageRoomId = entityId('room-storage-01');
  const logisticsRoomId = entityId('room-logistics-01');
  const sourceLotId = entityId('source-lot-001');
  const plantId = entityId('plant-001');
  const buyerId = entityId('customer-buyer-001');
  const sourceAcceptedEventId = eventId('event-seed-source-accepted-001');

  return {
    schemaVersion: 2,
    gameVersion: '0.1.0',
    revision: 0,
    rngState: 17321,
    time: { day: 1, minuteOfDay: 480, totalMinutes: minute(0), speed: 1, paused: true },
    player: { id: playerId, callsign: 'Operations Director', level: 1, experience: 0 },
    reputation: reputation(GAME_BALANCE.initialReputation),
    rooms: [
      { id: productionRoomId, definitionId: 'room-production', displayName: 'Pflanzenraum', kind: 'production', capacity: 6, occupied: 1, condition: score(96), cleanliness: score(97), availability: score(98), powerUnitsPerHour: 12, unlocked: true, assignedStaffIds: [entityId('staff-operations-001')], assignedMachineIds: [] },
      { id: processingRoomId, definitionId: 'room-processing', displayName: 'Verarbeitung', kind: 'processing', capacity: 4, occupied: 0, condition: score(95), cleanliness: score(96), availability: score(97), powerUnitsPerHour: 8, unlocked: true, assignedStaffIds: [entityId('staff-maintenance-001')], assignedMachineIds: [entityId('machine-processing-001')] },
      { id: qualityRoomId, definitionId: 'room-quality', displayName: 'Qualitätssicherung', kind: 'quality', capacity: 3, occupied: 0, condition: score(98), cleanliness: score(99), availability: score(99), powerUnitsPerHour: 6, unlocked: true, assignedStaffIds: [entityId('staff-quality-001')], assignedMachineIds: [] },
      { id: storageRoomId, definitionId: 'room-storage', displayName: 'Freigegebenes Lager', kind: 'storage', capacity: 12, occupied: 0, condition: score(97), cleanliness: score(98), availability: score(99), powerUnitsPerHour: 3, unlocked: true, assignedStaffIds: [], assignedMachineIds: [] },
      { id: logisticsRoomId, definitionId: 'room-logistics', displayName: 'Versand', kind: 'logistics', capacity: 4, occupied: 0, condition: score(96), cleanliness: score(97), availability: score(98), powerUnitsPerHour: 1, unlocked: true, assignedStaffIds: [entityId('staff-logistics-001')], assignedMachineIds: [] },
    ],
    sourceLots: [
      { id: sourceLotId, sourceRef: 'MED-CANNABIS-LOT-001', receivedAt: minute(0), status: 'accepted', quantity: 12, qualityScore: score(92), roomId: productionRoomId, inspectionFindings: [], traceEventIds: [sourceAcceptedEventId] },
    ],
    plants: [
      { id: plantId, profileId: 'medical-cannabis-campaign-profile', sourceLotId, roomId: productionRoomId, stage: 'active', progress: score(80), vitality: score(88), qualityPotential: score(92), stressIndex: score(8), contaminationIndex: score(3), createdAt: minute(0), lastUpdatedAt: minute(0), batchId: null, rejectedReason: null, care: { waterLevel: 'balanced', lightLevel: 'balanced', temperatureLevel: 'balanced', humidityLevel: 'balanced', nutrientLevel: 'balanced', pruningCount: 0, cuttingsTaken: 0, cuttingsSet: 0, lastAction: null }, propagatedFromPlantId: null },
    ],
    batches: [],
    inventoryLots: [],
    qualityAssessments: [],
    orders: [
      { id: entityId('order-buyer-001'), customerId: buyerId, itemDefinitionId: 'MED-CANNABIS-01', requestedQuantity: 6, minQuality: score(75), dueAt: minute(1440), status: 'available', contractValueCents: cents(850000), latePenaltyCents: cents(50000), acceptedAt: null, allocatedLotIds: [], deliveryId: null },
    ],
    customers: [
      { id: buyerId, name: 'Apotheke Nord', kind: 'licensed_buyer', reliabilityScore: score(92), minimumReputation: reputation(100), preferredQuality: score(80), paymentDelayDays: 0, unlocked: true },
    ],
    deliveries: [],
    staff: [
      { id: entityId('staff-operations-001'), profileId: 'operations-generalist', displayName: 'Mara Weiss', role: 'operations', skill: score(84), energy: score(95), morale: score(88), wageCentsPerDay: cents(14500), assignedRoomId: productionRoomId, activeAssignmentId: null },
      { id: entityId('staff-quality-001'), profileId: 'quality-specialist', displayName: 'Jonas Berg', role: 'quality', skill: score(91), energy: score(92), morale: score(90), wageCentsPerDay: cents(17500), assignedRoomId: qualityRoomId, activeAssignmentId: null },
      { id: entityId('staff-logistics-001'), profileId: 'logistics-coordinator', displayName: 'Lea König', role: 'logistics', skill: score(87), energy: score(94), morale: score(89), wageCentsPerDay: cents(15500), assignedRoomId: logisticsRoomId, activeAssignmentId: null },
      { id: entityId('staff-maintenance-001'), profileId: 'facility-technician', displayName: 'Niko Roth', role: 'maintenance', skill: score(82), energy: score(96), morale: score(87), wageCentsPerDay: cents(16500), assignedRoomId: processingRoomId, activeAssignmentId: null },
    ],
    assignments: [],
    machines: [
      { id: entityId('machine-processing-001'), definitionId: 'fictional-processing-station', roomId: processingRoomId, condition: score(95), status: 'idle', activeJobId: null },
    ],
    upgrades: [
      { id: SENSOR_PACK_UPGRADE_ID, unlocked: false, purchasedAt: null },
      { id: DRYING_RACK_UPGRADE_ID, unlocked: false, purchasedAt: null },
    ],
    compliance: { risk: risk(GAME_BALANCE.initialComplianceRisk), licenseStatus: 'valid', violations: [], auditDueAt: minute(4320), lastAuditAt: minute(0), blockedOperationCodes: [], cases: [], audits: [] },
    economy: { openingBalanceCents: cents(GAME_BALANCE.initialMoneyCents), ledger: [] },
    logs: [
      { id: entityId('log-seed-001'), at: minute(0), category: 'campaign', code: 'CAMPAIGN_READY', message: 'Kampagne gestartet. Alle Produktionswerte sind fiktive Spielwerte.', actorId: playerId, relatedEntityIds: [sourceLotId, plantId] },
    ],
    ui: { selectedEntityId: plantId, activeScreen: 'facility', notifications: [] },
  };
}

import type { GameState, UIState } from '../../contracts/domain';
import { validateGameStateInvariants } from '../domain/invariants';
import type { MigrationResult, SaveEnvelopeV1 } from '../../contracts/persistence';

const FORMAT = 'herbal-line-save' as const;
const SCHEMA_VERSION = 1 as const;
const SHA256_HEX = /^[0-9a-f]{64}$/i;
const ARRAY_FIELDS = [
  'rooms', 'sourceLots', 'plants', 'batches', 'inventoryLots', 'qualityAssessments',
  'orders', 'customers', 'deliveries', 'staff', 'assignments', 'machines', 'upgrades', 'logs',
] as const;

type SavePayload = Omit<GameState, 'ui'>;
type EnvelopeBody = Omit<SaveEnvelopeV1, 'checksum'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Stable JSON serialization for checksums; object key order never affects the digest. */
export function stableStringify(value: unknown): string {
  const ancestors = new Set<object>();

  const normalize = (item: unknown): unknown => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Save data contains a non-finite number.');
      return item;
    }
    if (typeof item !== 'object') {
      throw new TypeError('Save data contains a non-JSON value.');
    }
    if (ancestors.has(item)) throw new TypeError('Save data contains a circular reference.');

    ancestors.add(item);
    try {
      if (Array.isArray(item)) return item.map(normalize);
      const record = item as Record<string, unknown>;
      const result = Object.create(null) as Record<string, unknown>;
      for (const key of Object.keys(record).sort()) {
        const child = record[key];
        if (child === undefined) throw new TypeError('Save data contains an undefined property.');
        result[key] = normalize(child);
      }
      return result;
    } finally {
      ancestors.delete(item);
    }
  };

  return JSON.stringify(normalize(value));
}

export async function sha256Hex(value: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) throw new Error('Web Crypto is unavailable; save checksum cannot be calculated.');
  const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function payloadWithoutUi(state: GameState): SavePayload {
  const { ui, ...payload } = state;
  void ui;
  return payload;
}

type Guard = (value: unknown) => boolean;

const isString: Guard = (value) => typeof value === 'string';
const isNonEmptyString: Guard = (value) => typeof value === 'string' && value.trim().length > 0;
const isBoolean: Guard = (value) => typeof value === 'boolean';
const isFiniteNumber: Guard = (value) => typeof value === 'number' && Number.isFinite(value);
const isSafeInteger: Guard = (value) => typeof value === 'number' && Number.isSafeInteger(value);
const isSafeNonNegativeIntegerGuard: Guard = (value) => isSafeInteger(value) && (value as number) >= 0;
const isPositiveSafeInteger: Guard = (value) => isSafeInteger(value) && (value as number) > 0;
const isScore: Guard = (value) => isFiniteNumber(value) && (value as number) >= 0 && (value as number) <= 100;
const isReputation: Guard = (value) => isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 1000;
const isNullableString: Guard = (value) => value === null || isString(value);
const isNullableNonEmptyString: Guard = (value) => value === null || isNonEmptyString(value);
const isNullableMinute: Guard = (value) => value === null || isSafeNonNegativeIntegerGuard(value);
const isNullableScore: Guard = (value) => value === null || isScore(value);

function nullable(guard: Guard): Guard {
  return (value) => value === null || guard(value);
}

function arrayOf(guard: Guard): Guard {
  return (value) => Array.isArray(value) && value.every(guard);
}

function enumOf(values: readonly string[]): Guard {
  return (value) => typeof value === 'string' && values.includes(value);
}

function hasShape(
  value: unknown,
  required: Record<string, Guard>,
  optional: Record<string, Guard> = {},
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  for (const [key, guard] of Object.entries(required)) {
    if (!guard(value[key])) return false;
  }
  for (const [key, guard] of Object.entries(optional)) {
    if (Object.prototype.hasOwnProperty.call(value, key) && !guard(value[key])) return false;
  }
  return true;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

const isCareLevel = enumOf(['low', 'balanced', 'high']);
const isPlantCareAction = enumOf(['water', 'light', 'temperature', 'humidity', 'nutrients', 'prune', 'take_cutting', 'set_cutting']);
const isIdArray = arrayOf(isNonEmptyString);
const isStringArray = arrayOf(isString);

const isPlantCareState: Guard = (value) => hasShape(value, {
  waterLevel: isCareLevel,
  lightLevel: isCareLevel,
  temperatureLevel: isCareLevel,
  humidityLevel: isCareLevel,
  nutrientLevel: isCareLevel,
  pruningCount: isSafeNonNegativeIntegerGuard,
  cuttingsTaken: isSafeNonNegativeIntegerGuard,
  cuttingsSet: isSafeNonNegativeIntegerGuard,
  lastAction: nullable(isPlantCareAction),
});

const isTimeState: Guard = (value) => hasShape(value, {
  day: isPositiveSafeInteger,
  minuteOfDay: (item) => isSafeNonNegativeIntegerGuard(item) && (item as number) < 1440,
  totalMinutes: isSafeNonNegativeIntegerGuard,
  speed: enumOf(['0', '1', '2', '4']),
  paused: isBoolean,
}) && [0, 1, 2, 4].includes(Number((value as Record<string, unknown>).speed));

const isPlayerState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  callsign: isNonEmptyString,
  level: isPositiveSafeInteger,
  experience: isSafeNonNegativeIntegerGuard,
});

const isRoomState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  definitionId: isNonEmptyString,
  displayName: isNonEmptyString,
  kind: enumOf(['production', 'processing', 'quality', 'storage', 'logistics', 'office', 'utility']),
  capacity: isSafeNonNegativeIntegerGuard,
  occupied: isSafeNonNegativeIntegerGuard,
  condition: isScore,
  cleanliness: isScore,
  availability: isScore,
  powerUnitsPerHour: (item) => isFiniteNumber(item) && (item as number) >= 0,
  unlocked: isBoolean,
  assignedStaffIds: isIdArray,
  assignedMachineIds: isIdArray,
});

const isSourceLotState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  sourceRef: isNonEmptyString,
  receivedAt: isSafeNonNegativeIntegerGuard,
  status: enumOf(['pending_receipt', 'received', 'inspected', 'accepted', 'quarantined', 'rejected']),
  quantity: isSafeNonNegativeIntegerGuard,
  qualityScore: isNullableScore,
  roomId: isNullableNonEmptyString,
  inspectionFindings: isStringArray,
  traceEventIds: isIdArray,
});

const isPlantState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  profileId: isNonEmptyString,
  sourceLotId: isNonEmptyString,
  roomId: isNonEmptyString,
  stage: enumOf(['planned', 'active', 'ready_for_harvest', 'harvested', 'rejected']),
  progress: isScore,
  vitality: isScore,
  qualityPotential: isScore,
  stressIndex: isScore,
  contaminationIndex: isScore,
  createdAt: isSafeNonNegativeIntegerGuard,
  lastUpdatedAt: isSafeNonNegativeIntegerGuard,
  batchId: isNullableNonEmptyString,
  rejectedReason: isNullableString,
}, {
  care: isPlantCareState,
  propagatedFromPlantId: isNullableNonEmptyString,
});

const isTraceEntry: Guard = (value) => hasShape(value, {
  eventId: isNonEmptyString,
  simulationMinute: isSafeNonNegativeIntegerGuard,
  eventType: isNonEmptyString,
  actorId: isNonEmptyString,
  entityId: isNonEmptyString,
  noteCode: isNonEmptyString,
  relatedEntityIds: isIdArray,
});

const isQualityAssessment: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  batchId: isNonEmptyString,
  ruleSetVersion: isNonEmptyString,
  performedAt: isSafeNonNegativeIntegerGuard,
  score: isScore,
  findings: isStringArray,
  decision: enumOf(['pass', 'fail', 'review']),
  assessorId: isNonEmptyString,
  traceComplete: isBoolean,
}, {
  passed: isBoolean,
});

const isBatchState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  profileId: isNonEmptyString,
  sourceLotIds: isIdArray,
  plantIds: isIdArray,
  quantity: isPositiveSafeInteger,
  qualityScore: isNullableScore,
  status: enumOf(['created', 'queued', 'processing', 'awaiting_qc', 'released', 'rejected', 'quarantined']),
  createdAt: isSafeNonNegativeIntegerGuard,
  updatedAt: isSafeNonNegativeIntegerGuard,
  currentRoomId: isNullableNonEmptyString,
  inventoryLotIds: isIdArray,
  assessmentIds: isIdArray,
  trace: arrayOf(isTraceEntry),
  holdReason: isNullableString,
});

const isInventoryLot: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  batchId: isNonEmptyString,
  itemDefinitionId: isNonEmptyString,
  quantityAvailable: isSafeNonNegativeIntegerGuard,
  quantityReserved: isSafeNonNegativeIntegerGuard,
  qualityScore: isScore,
  status: enumOf(['held', 'released', 'reserved', 'depleted', 'expired', 'rejected']),
  createdAt: isSafeNonNegativeIntegerGuard,
  expiresAt: isNullableMinute,
  storageRoomId: isNonEmptyString,
});

const isOrderState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  customerId: isNonEmptyString,
  itemDefinitionId: isNonEmptyString,
  requestedQuantity: isPositiveSafeInteger,
  minQuality: isScore,
  dueAt: isSafeNonNegativeIntegerGuard,
  status: enumOf(['available', 'accepted', 'allocated', 'ready_to_ship', 'shipped', 'delivered', 'expired', 'cancelled', 'blocked', 'delivery_exception']),
  contractValueCents: isSafeInteger,
  latePenaltyCents: isSafeInteger,
  acceptedAt: isNullableMinute,
  allocatedLotIds: isIdArray,
  deliveryId: isNullableNonEmptyString,
});

const isCustomerState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  name: isNonEmptyString,
  kind: enumOf(['pharmacy', 'clinic', 'licensed_buyer']),
  reliabilityScore: isScore,
  minimumReputation: isReputation,
  preferredQuality: isScore,
  paymentDelayDays: isSafeNonNegativeIntegerGuard,
  unlocked: isBoolean,
});

const isDeliveryState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  orderId: isNonEmptyString,
  lotIds: isIdArray,
  quantity: isPositiveSafeInteger,
  status: enumOf(['planned', 'packed', 'dispatched', 'delivered', 'exception', 'cancelled']),
  plannedAt: isSafeNonNegativeIntegerGuard,
  dispatchedAt: isNullableMinute,
  deliveredAt: isNullableMinute,
  routeId: isNonEmptyString,
  proofCode: isNullableString,
  complianceCaseIds: isIdArray,
});

const isStaffState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  profileId: isNonEmptyString,
  displayName: isNonEmptyString,
  role: enumOf(['operations', 'quality', 'compliance', 'logistics', 'maintenance', 'management']),
  skill: isScore,
  energy: isScore,
  morale: isScore,
  wageCentsPerDay: isSafeNonNegativeIntegerGuard,
  assignedRoomId: isNullableNonEmptyString,
  activeAssignmentId: isNullableNonEmptyString,
});

const isAssignmentState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  staffId: isNonEmptyString,
  taskCode: isNonEmptyString,
  entityId: isNullableNonEmptyString,
  startedAt: isSafeNonNegativeIntegerGuard,
  dueAt: isNullableMinute,
  progress: isScore,
  status: enumOf(['queued', 'active', 'blocked', 'completed', 'cancelled']),
});

const isMachineState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  definitionId: isNonEmptyString,
  roomId: isNonEmptyString,
  condition: isScore,
  status: enumOf(['idle', 'active', 'maintenance', 'broken']),
  activeJobId: isNullableNonEmptyString,
});

const isComplianceViolation: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  code: isNonEmptyString,
  severity: enumOf(['low', 'medium', 'high', 'critical']),
  occurredAt: isSafeNonNegativeIntegerGuard,
  relatedEntityIds: isIdArray,
  resolvedAt: isNullableMinute,
  resolutionCode: isNullableString,
});

const isComplianceState: Guard = (value) => hasShape(value, {
  risk: isScore,
  licenseStatus: enumOf(['valid', 'warning', 'suspended', 'recovery_review']),
  violations: arrayOf(isComplianceViolation),
  auditDueAt: isSafeNonNegativeIntegerGuard,
  lastAuditAt: isNullableMinute,
  blockedOperationCodes: isStringArray,
});

const isLedgerEntry: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  simulationMinute: isSafeNonNegativeIntegerGuard,
  account: enumOf(['revenue', 'expense', 'penalty', 'investment', 'refund', 'grant']),
  amountCents: isSafeInteger,
  referenceId: isNullableNonEmptyString,
  reasonCode: isNonEmptyString,
  idempotencyKey: isNonEmptyString,
});

const isEconomyState: Guard = (value) => hasShape(value, {
  openingBalanceCents: isSafeInteger,
  ledger: arrayOf(isLedgerEntry),
}, {
  revenueTodayCents: isSafeInteger,
  expensesTodayCents: isSafeInteger,
  lifetimeRevenueCents: isSafeInteger,
  lifetimeExpensesCents: isSafeInteger,
});

const isUpgradeState: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  unlocked: isBoolean,
  purchasedAt: isNullableMinute,
});

const isGameLogEntry: Guard = (value) => hasShape(value, {
  id: isNonEmptyString,
  at: isSafeNonNegativeIntegerGuard,
  category: isNonEmptyString,
  code: isNonEmptyString,
  message: isString,
  actorId: isNullableNonEmptyString,
  relatedEntityIds: isIdArray,
});

const PAYLOAD_KEYS = [
  'schemaVersion', 'gameVersion', 'revision', 'rngState', 'time', 'player', 'reputation',
  'rooms', 'sourceLots', 'plants', 'batches', 'inventoryLots', 'qualityAssessments',
  'orders', 'customers', 'deliveries', 'staff', 'assignments', 'machines', 'upgrades',
  'compliance', 'economy', 'logs', 'revenueTodayCents', 'expensesTodayCents',
  'lifetimeRevenueCents', 'lifetimeExpensesCents',
] as const;

function validPayload(value: unknown): value is SavePayload {
  if (!hasShape(value, {
    schemaVersion: (item) => item === SCHEMA_VERSION,
    gameVersion: isNonEmptyString,
    revision: isSafeNonNegativeIntegerGuard,
    rngState: isSafeNonNegativeIntegerGuard,
    time: isTimeState,
    player: isPlayerState,
    reputation: isReputation,
    rooms: arrayOf(isRoomState),
    sourceLots: arrayOf(isSourceLotState),
    plants: arrayOf(isPlantState),
    batches: arrayOf(isBatchState),
    inventoryLots: arrayOf(isInventoryLot),
    qualityAssessments: arrayOf(isQualityAssessment),
    orders: arrayOf(isOrderState),
    customers: arrayOf(isCustomerState),
    deliveries: arrayOf(isDeliveryState),
    staff: arrayOf(isStaffState),
    assignments: arrayOf(isAssignmentState),
    machines: arrayOf(isMachineState),
    upgrades: arrayOf(isUpgradeState),
    compliance: isComplianceState,
    economy: isEconomyState,
    logs: arrayOf(isGameLogEntry),
  }, {
    revenueTodayCents: isSafeInteger,
    expensesTodayCents: isSafeInteger,
    lifetimeRevenueCents: isSafeInteger,
    lifetimeExpensesCents: isSafeInteger,
  })) return false;
  return hasOnlyKeys(value, PAYLOAD_KEYS);
}
function validEnvelopeBody(value: unknown): value is SaveEnvelopeV1 {
  if (!isRecord(value)) return false;
  if (value.format !== FORMAT || value.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof value.gameVersion !== 'string' || value.gameVersion.length === 0) return false;
  if (!isSafeNonNegativeInteger(value.revision) || !isSafeNonNegativeInteger(value.rngState)) return false;
  if (typeof value.savedAtRealTime !== 'string' || Number.isNaN(Date.parse(value.savedAtRealTime))) return false;
  if (typeof value.checksum !== 'string' || !SHA256_HEX.test(value.checksum)) return false;
  if (!validPayload(value.payload)) return false;
  return value.payload.gameVersion === value.gameVersion
    && value.payload.revision === value.revision
    && value.payload.rngState === value.rngState;
}

export async function createSaveEnvelope(
  state: GameState,
  savedAtRealTime = new Date().toISOString(),
): Promise<SaveEnvelopeV1> {
  if (Number.isNaN(Date.parse(savedAtRealTime))) throw new TypeError('savedAtRealTime must be a valid ISO date-time.');
  const body: EnvelopeBody = {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    gameVersion: state.gameVersion,
    revision: state.revision,
    savedAtRealTime,
    rngState: state.rngState,
    payload: payloadWithoutUi(state),
  };
  const checksum = await sha256Hex(stableStringify(body));
  return { ...body, checksum };
}

/** Parse, validate and checksum-check a save without changing the active game state. */
export async function verifySaveEnvelope(input: string | unknown): Promise<MigrationResult> {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return { ok: false, errorCode: 'INVALID_ENVELOPE' };
    }
  }

  if (isRecord(value) && typeof value.schemaVersion === 'number' && value.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, errorCode: 'UNSUPPORTED_VERSION' };
  }
  if (!validEnvelopeBody(value)) return { ok: false, errorCode: 'INVALID_ENVELOPE' };

  const { checksum, ...body } = value;
  try {
    const expected = await sha256Hex(stableStringify(body));
    if (expected !== checksum.toLowerCase()) return { ok: false, errorCode: 'CHECKSUM_MISMATCH' };
  } catch {
    return { ok: false, errorCode: 'INVALID_ENVELOPE' };
  }
  return { ok: true, envelope: value };
}

/** UI state is deliberately reconstructed rather than persisted in the save payload. */
export function restoreGameState(
  envelope: SaveEnvelopeV1,
  ui: UIState = { selectedEntityId: null, activeScreen: 'facility', notifications: [] },
): GameState {
  return { ...envelope.payload, ui };
}

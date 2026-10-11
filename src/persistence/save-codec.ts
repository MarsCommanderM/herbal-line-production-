import type { GameState, UIState } from '../../contracts/domain';
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
      const result: Record<string, unknown> = {};
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

function validPayload(value: unknown): value is SavePayload {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION || typeof value.gameVersion !== 'string' || value.gameVersion.length === 0) return false;
  if (!isSafeNonNegativeInteger(value.revision) || !isSafeNonNegativeInteger(value.rngState)) return false;
  if (!isRecord(value.time) || !isRecord(value.player) || !isRecord(value.compliance) || !isRecord(value.economy)) return false;
  if (!isSafeNonNegativeInteger(value.time.totalMinutes)) return false;
  if (!Array.isArray(value.economy.ledger)) return false;
  return ARRAY_FIELDS.every((field) => Array.isArray(value[field]));
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

import type { GameState, UIState } from '../../contracts/domain';
import type { MigrationResult, SaveEnvelopeV1, SaveMetadata, SaveRepository } from '../../contracts/persistence';

const DATABASE_NAME = 'herbal-line-saves';
const DATABASE_VERSION = 1;
const OBJECT_STORE = 'slots';
const CURRENT_SCHEMA_VERSION = 1;
const DEFAULT_SLOT = 'autosave';

interface StoredSave {
  slotId: string;
  envelope: SaveEnvelopeV1;
  metadata: SaveMetadata;
}

export class SaveSystemError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_SLOT' | 'INVALID_ENVELOPE' | 'CHECKSUM_MISMATCH' | 'UNSUPPORTED_VERSION' | 'STORAGE_UNAVAILABLE' | 'STORAGE_FAILED' | 'SLOT_NOT_FOUND' | 'IMPORT_FAILED',
  ) {
    super(message);
    this.name = 'SaveSystemError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) sorted[key] = stableValue(value[key]);
  return sorted;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

/**
 * Synchronous SHA-256 over canonical JSON. This detects accidental corruption;
 * it is not an authenticity mechanism because an editor can recompute the hash.
 */
/** Compatibility verifier for schema-v1 saves written before SHA-256 was introduced. */
function legacyFNV1aChecksum(payload: unknown): string {
  const bytes = new TextEncoder().encode(stableStringify(payload));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return 'fnv1a32:' + hash.toString(16).padStart(8, '0');
}

export function checksumPayload(payload: unknown): string {
  const input = new TextEncoder().encode(stableStringify(payload));
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const words = new Uint32Array(64);
  const rotateRight = (value: number, bits: number): number => (value >>> bits) | (value << (32 - bits));

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const x = words[i - 15];
      const y = words[i - 2];
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let i = 0; i < 64; i += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + constants[i] + words[i]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return 'sha256:' + Array.from(hash, (word) => word.toString(16).padStart(8, '0')).join('');
}

function validateSlotId(slotId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(slotId)) {
    throw new SaveSystemError('Save-Slot-ID ist ungültig.', 'INVALID_SLOT');
  }
}

function isFiniteInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'string' && record[key].length > 0;
}

function recordsWithFields(value: unknown, fields: string[]): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((entry) => isRecord(entry) && fields.every((field) => Object.hasOwn(entry, field)));
}

function hasUniqueIds(records: Record<string, unknown>[]): boolean {
  const ids = records.map((record) => record.id);
  return ids.every((id) => typeof id === 'string' && id.length > 0) && new Set(ids).size === ids.length;
}

function isPersistedPayload(value: unknown): value is SaveEnvelopeV1['payload'] {
  if (!isRecord(value) || Object.hasOwn(value, 'ui')) return false;
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION
    || !hasString(value, 'gameVersion')
    || !isFiniteInteger(value.revision)
    || !isFiniteInteger(value.rngState)
    || !isRecord(value.time)
    || !isRecord(value.player)
    || !isRecord(value.compliance)
    || !isRecord(value.economy)) return false;

  const time = value.time;
  if (!isFiniteInteger(time.day, 1)
    || !isFiniteInteger(time.minuteOfDay, 0, 1439)
    || !isFiniteInteger(time.totalMinutes)
    || ![0, 1, 2, 4].includes(Number(time.speed))
    || typeof time.paused !== 'boolean') return false;

  const player = value.player;
  if (!hasString(player, 'id') || !hasString(player, 'callsign')
    || !isFiniteInteger(player.level, 1) || !isFiniteInteger(player.experience)) return false;
  if (!isFiniteInteger(value.reputation, 0, 1000)) return false;

  const collectionRules: Array<[string, string[]]> = [
    ['rooms', ['id', 'capacity', 'occupied', 'kind', 'unlocked']],
    ['sourceLots', ['id', 'status', 'quantity', 'traceEventIds']],
    ['plants', ['id', 'stage', 'progress', 'sourceLotId', 'roomId', 'batchId']],
    ['batches', ['id', 'status', 'plantIds', 'sourceLotIds', 'quantity', 'trace']],
    ['inventoryLots', ['id', 'status', 'quantityAvailable', 'quantityReserved', 'batchId']],
    ['qualityAssessments', ['id', 'batchId', 'decision', 'score', 'traceComplete']],
    ['orders', ['id', 'status', 'requestedQuantity', 'allocatedLotIds', 'deliveryId']],
    ['customers', ['id', 'kind', 'unlocked']],
    ['deliveries', ['id', 'status', 'orderId', 'lotIds', 'quantity']],
    ['staff', ['id', 'role']],
    ['assignments', ['id', 'status']],
    ['machines', ['id', 'status']],
    ['upgrades', ['id', 'unlocked']],
    ['logs', ['id', 'code', 'message', 'at']],
  ];
  for (const [key, fields] of collectionRules) {
    if (!recordsWithFields(value[key], fields)) return false;
    if (key !== 'upgrades' && !hasUniqueIds(value[key] as Record<string, unknown>[])) return false;
    if (key === 'upgrades' && new Set((value[key] as Record<string, unknown>[]).map((item) => item.id)).size !== (value[key] as Record<string, unknown>[]).length) return false;
  }

  const rooms = value.rooms as Record<string, unknown>[];
  if (!rooms.every((room) => isFiniteInteger(room.capacity, 1) && isFiniteInteger(room.occupied) && Number(room.occupied) <= Number(room.capacity))) return false;
  const plants = value.plants as Record<string, unknown>[];
  if (!plants.every((plant) => isFiniteInteger(plant.progress, 0, 100) && hasString(plant, 'sourceLotId') && hasString(plant, 'roomId'))) return false;
  const batches = value.batches as Record<string, unknown>[];
  if (!batches.every((batch) => isFiniteInteger(batch.quantity) && Array.isArray(batch.plantIds) && Array.isArray(batch.sourceLotIds) && Array.isArray(batch.trace))) return false;
  const inventoryLots = value.inventoryLots as Record<string, unknown>[];
  if (!inventoryLots.every((lot) => isFiniteInteger(lot.quantityAvailable) && isFiniteInteger(lot.quantityReserved) && Number(lot.quantityReserved) <= Number(lot.quantityAvailable))) return false;
  const orders = value.orders as Record<string, unknown>[];
  if (!orders.every((order) => isFiniteInteger(order.requestedQuantity, 1) && Array.isArray(order.allocatedLotIds))) return false;
  const deliveries = value.deliveries as Record<string, unknown>[];
  if (!deliveries.every((delivery) => isFiniteInteger(delivery.quantity) && Array.isArray(delivery.lotIds))) return false;

  const compliance = value.compliance;
  if (!['valid', 'warning', 'suspended', 'recovery_review'].includes(String(compliance.licenseStatus))
    || !Array.isArray(compliance.violations)
    || !Array.isArray(compliance.blockedOperationCodes)) return false;
  const economy = value.economy;
  if (!isFiniteInteger(economy.openingBalanceCents)
    || !Array.isArray(economy.ledger)
    || !recordsWithFields(economy.ledger, ['id', 'account', 'amountCents', 'idempotencyKey'])
    || !hasUniqueIds(economy.ledger as Record<string, unknown>[])
    || !(economy.ledger as Record<string, unknown>[]).every((entry) =>
      isFiniteInteger(entry.amountCents)
      && hasString(entry, 'idempotencyKey')
      && ['revenue', 'expense', 'penalty', 'investment', 'refund'].includes(String(entry.account)))) return false;
  return true;
}

function isEnvelopeShape(value: unknown): value is SaveEnvelopeV1 {
  if (!isRecord(value)) return false;
  return value.format === 'herbal-line-save'
    && value.schemaVersion === CURRENT_SCHEMA_VERSION
    && typeof value.gameVersion === 'string' && value.gameVersion.length > 0
    && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
    && typeof value.savedAtRealTime === 'string' && Number.isFinite(Date.parse(value.savedAtRealTime))
    && Number.isSafeInteger(value.rngState) && Number(value.rngState) >= 0
    && typeof value.checksum === 'string' && /^(?:sha256:[0-9a-f]{64}|fnv1a32:[0-9a-f]{8})$/.test(value.checksum)
    && isPersistedPayload(value.payload)
    && value.revision === value.payload.revision
    && value.rngState === value.payload.rngState
    && value.gameVersion === value.payload.gameVersion;
}

export function buildSaveEnvelope(state: GameState, savedAtRealTime = new Date().toISOString()): SaveEnvelopeV1 {
  const { ui: _transientUi, ...payload } = state;
  const envelopeWithoutChecksum = {
    format: 'herbal-line-save' as const,
    schemaVersion: CURRENT_SCHEMA_VERSION as 1,
    gameVersion: state.gameVersion,
    revision: state.revision,
    savedAtRealTime,
    rngState: state.rngState,
    payload,
  };
  return {
    ...envelopeWithoutChecksum,
    checksum: checksumPayload(envelopeWithoutChecksum.payload),
  };
}

export function validateAndMigrateSave(input: unknown): MigrationResult {
  if (!isRecord(input) || !Number.isInteger(input.schemaVersion)) {
    return { ok: false, errorCode: 'INVALID_ENVELOPE' };
  }
  if (input.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { ok: false, errorCode: 'UNSUPPORTED_VERSION' };
  }
  if (!isEnvelopeShape(input)) return { ok: false, errorCode: 'INVALID_ENVELOPE' };
  const expectedChecksum = input.checksum.startsWith('fnv1a32:')
    ? legacyFNV1aChecksum(input.payload)
    : checksumPayload(input.payload);
  if (expectedChecksum !== input.checksum) {
    return { ok: false, errorCode: 'CHECKSUM_MISMATCH' };
  }
  try {
    // Migration registry starts at v1. Future schema changes must add an explicit migration.
    return { ok: true, envelope: { ...input, payload: structuredClone(input.payload) } };
  } catch {
    return { ok: false, errorCode: 'MIGRATION_FAILED' };
  }
}

export function restoreGameState(envelope: SaveEnvelopeV1, transientUi: UIState): GameState {
  const validation = validateAndMigrateSave(envelope);
  if (!validation.ok) throw new SaveSystemError('Spielstand kann nicht wiederhergestellt werden: ' + validation.errorCode, validation.errorCode === 'CHECKSUM_MISMATCH' ? 'CHECKSUM_MISMATCH' : validation.errorCode === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION' : 'INVALID_ENVELOPE');
  return { ...validation.envelope.payload, ui: structuredClone(transientUi) };
}

function toMetadata(slotId: string, envelope: SaveEnvelopeV1, byteLength: number): SaveMetadata {
  return {
    slotId,
    revision: envelope.revision,
    savedAtRealTime: envelope.savedAtRealTime,
    gameVersion: envelope.gameVersion,
    byteLength,
  };
}

function toError(error: unknown, fallback: string): SaveSystemError {
  if (error instanceof SaveSystemError) return error;
  return new SaveSystemError(error instanceof Error ? error.message : fallback, 'STORAGE_FAILED');
}

export class IndexedDbSaveRepository implements SaveRepository {
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(new SaveSystemError('IndexedDB ist in dieser Umgebung nicht verfügbar.', 'STORAGE_UNAVAILABLE'));
    if (this.databasePromise) return this.databasePromise;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory!.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(OBJECT_STORE)) database.createObjectStore(OBJECT_STORE, { keyPath: 'slotId' });
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(new SaveSystemError('Die lokale Save-Datenbank konnte nicht geöffnet werden.', 'STORAGE_FAILED'));
      request.onblocked = () => reject(new SaveSystemError('Die Save-Datenbank ist durch einen anderen Tab blockiert.', 'STORAGE_FAILED'));
    });
    this.databasePromise = opening.catch((error: unknown): IDBDatabase => {
      this.databasePromise = undefined;
      throw toError(error, 'Datenbank konnte nicht geöffnet werden.');
    });
    return this.databasePromise;
  }

  async save(slotId: string, envelope: SaveEnvelopeV1): Promise<SaveMetadata> {
    validateSlotId(slotId);
    const validation = validateAndMigrateSave(envelope);
    if (!validation.ok) throw new SaveSystemError('Ungültiger Spielstand: ' + validation.errorCode, validation.errorCode === 'CHECKSUM_MISMATCH' ? 'CHECKSUM_MISMATCH' : validation.errorCode === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION' : 'INVALID_ENVELOPE');
    const normalized = validation.envelope;
    const serialized = JSON.stringify(normalized);
    const metadata = toMetadata(slotId, normalized, new TextEncoder().encode(serialized).byteLength);
    try {
      const database = await this.openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, 'readwrite');
        transaction.objectStore(OBJECT_STORE).put({ slotId, envelope: normalized, metadata } satisfies StoredSave);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Save transaction failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Save transaction aborted.'));
      });
      return metadata;
    } catch (error) {
      throw toError(error, 'Spielstand konnte nicht gespeichert werden.');
    }
  }

  async load(slotId: string): Promise<SaveEnvelopeV1 | null> {
    validateSlotId(slotId);
    try {
      const database = await this.openDatabase();
      const record = await new Promise<StoredSave | undefined>((resolve, reject) => {
        const request = database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).get(slotId);
        request.onsuccess = () => resolve(request.result as StoredSave | undefined);
        request.onerror = () => reject(request.error ?? new Error('Save read failed.'));
      });
      if (!record) return null;
      const validation = validateAndMigrateSave(record.envelope);
      if (!validation.ok) throw new SaveSystemError('Gespeicherter Spielstand ist beschädigt: ' + validation.errorCode, validation.errorCode === 'CHECKSUM_MISMATCH' ? 'CHECKSUM_MISMATCH' : validation.errorCode === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION' : 'INVALID_ENVELOPE');
      return validation.envelope;
    } catch (error) {
      throw toError(error, 'Spielstand konnte nicht geladen werden.');
    }
  }

  async listSlots(): Promise<SaveMetadata[]> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(OBJECT_STORE, 'readonly').objectStore(OBJECT_STORE).getAll();
      request.onsuccess = () => resolve((request.result as StoredSave[]).map((record) => record.metadata).sort((a, b) => a.slotId.localeCompare(b.slotId)));
      request.onerror = () => reject(new SaveSystemError('Save-Slots konnten nicht aufgelistet werden.', 'STORAGE_FAILED'));
    });
  }

  async deleteSlot(slotId: string): Promise<void> {
    validateSlotId(slotId);
    const database = await this.openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(OBJECT_STORE, 'readwrite');
      transaction.objectStore(OBJECT_STORE).delete(slotId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new SaveSystemError('Save-Slot konnte nicht gelöscht werden.', 'STORAGE_FAILED'));
      transaction.onabort = () => reject(new SaveSystemError('Löschen wurde abgebrochen.', 'STORAGE_FAILED'));
    });
  }

  async exportSlot(slotId: string): Promise<Blob> {
    const envelope = await this.load(slotId);
    if (!envelope) throw new SaveSystemError('Save-Slot existiert nicht.', 'SLOT_NOT_FOUND');
    return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  }

  async importSlot(slotId: string, input: Blob): Promise<SaveMetadata> {
    validateSlotId(slotId);
    try {
      const parsed: unknown = JSON.parse(await input.text());
      const validation = validateAndMigrateSave(parsed);
      if (!validation.ok) throw new SaveSystemError('Import abgelehnt: ' + validation.errorCode, validation.errorCode === 'CHECKSUM_MISMATCH' ? 'CHECKSUM_MISMATCH' : validation.errorCode === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION' : 'INVALID_ENVELOPE');
      return await this.save(slotId, validation.envelope);
    } catch (error) {
      if (error instanceof SaveSystemError) throw error;
      throw new SaveSystemError('Die Importdatei ist kein gültiger Herbal-Line-Spielstand.', 'IMPORT_FAILED');
    }
  }
}

export const DEFAULT_SAVE_SLOT = DEFAULT_SLOT;

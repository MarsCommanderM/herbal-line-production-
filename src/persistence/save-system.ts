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

/** FNV-1a is used for accidental-corruption detection, not cryptographic authenticity. */
export function checksumPayload(payload: unknown): string {
  const bytes = new TextEncoder().encode(stableStringify(payload));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return 'fnv1a32:' + hash.toString(16).padStart(8, '0');
}

function validateSlotId(slotId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(slotId)) {
    throw new SaveSystemError('Save-Slot-ID ist ungültig.', 'INVALID_SLOT');
  }
}

function isPersistedPayload(value: unknown): value is SaveEnvelopeV1['payload'] {
  if (!isRecord(value) || Object.hasOwn(value, 'ui')) return false;
  const arrayKeys = [
    'rooms', 'sourceLots', 'plants', 'batches', 'inventoryLots', 'qualityAssessments',
    'orders', 'customers', 'deliveries', 'staff', 'assignments', 'machines', 'upgrades', 'logs',
  ];
  return value.schemaVersion === CURRENT_SCHEMA_VERSION
    && typeof value.gameVersion === 'string'
    && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
    && Number.isSafeInteger(value.rngState) && Number(value.rngState) >= 0
    && isRecord(value.time) && isRecord(value.player) && isRecord(value.compliance) && isRecord(value.economy)
    && arrayKeys.every((key) => Array.isArray(value[key]));
}

function isEnvelopeShape(value: unknown): value is SaveEnvelopeV1 {
  if (!isRecord(value)) return false;
  return value.format === 'herbal-line-save'
    && value.schemaVersion === CURRENT_SCHEMA_VERSION
    && typeof value.gameVersion === 'string' && value.gameVersion.length > 0
    && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0
    && typeof value.savedAtRealTime === 'string' && Number.isFinite(Date.parse(value.savedAtRealTime))
    && Number.isSafeInteger(value.rngState) && Number(value.rngState) >= 0
    && typeof value.checksum === 'string' && /^fnv1a32:[0-9a-f]{8}$/.test(value.checksum)
    && isPersistedPayload(value.payload);
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
  if (checksumPayload(input.payload) !== input.checksum) {
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
    this.databasePromise = new Promise((resolve, reject) => {
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
    }).catch((error: unknown) => {
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

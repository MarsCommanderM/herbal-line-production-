import type { SaveMetadata, SaveRepository, SaveEnvelopeV1 } from '../../contracts/persistence';
import { stableStringify, verifySaveEnvelope } from './save-codec';

interface StoredSaveRecord {
  slotId: string;
  envelope: SaveEnvelopeV1;
  metadata: SaveMetadata;
}

const DATABASE_NAME = 'herbal-line';
const DATABASE_VERSION = 1;
const STORE_NAME = 'saves';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

function validateSlotId(slotId: string): void {
  if (typeof slotId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(slotId)) {
    throw new TypeError('Save slot IDs must be 1–64 characters and contain only letters, numbers, dot, underscore, or hyphen.');
  }
}

export class IndexedDbSaveRepository implements SaveRepository {
  private databasePromise: Promise<IDBDatabase> | undefined;

  constructor(
    private readonly databaseName = DATABASE_NAME,
    private readonly databaseVersion = DATABASE_VERSION,
  ) {}

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is unavailable in this environment.'));
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, this.databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => {
        this.databasePromise = undefined;
        reject(request.error ?? new Error('Could not open the save database.'));
      };
      request.onblocked = () => {
        this.databasePromise = undefined;
        reject(new Error('The save database upgrade is blocked by another open tab.'));
      };
    });
    return this.databasePromise;
  }

  async save(slotId: string, envelope: SaveEnvelopeV1): Promise<SaveMetadata> {
    validateSlotId(slotId);
    const verification = await verifySaveEnvelope(envelope);
    if (!verification.ok) throw new Error('Refusing to save an invalid envelope: ' + verification.errorCode);

    const serialized = stableStringify(envelope);
    const metadata: SaveMetadata = {
      slotId,
      revision: envelope.revision,
      savedAtRealTime: envelope.savedAtRealTime,
      gameVersion: envelope.gameVersion,
      byteLength: new TextEncoder().encode(serialized).byteLength,
    };
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const completed = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).put({ slotId, envelope, metadata } satisfies StoredSaveRecord);
    await completed;
    return metadata;
  }

  async load(slotId: string): Promise<SaveEnvelopeV1 | null> {
    validateSlotId(slotId);
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const completed = transactionDone(transaction);
    const recordRequest = requestResult(transaction.objectStore(STORE_NAME).get(slotId));
    const [record] = await Promise.all([recordRequest, completed]) as [StoredSaveRecord | undefined, void];
    if (!record) return null;

    const verification = await verifySaveEnvelope(record.envelope);
    if (!verification.ok) {
      throw new Error('Saved data failed validation: ' + verification.errorCode + '. The stored record was left unchanged.');
    }
    return verification.envelope;
  }

  async listSlots(): Promise<SaveMetadata[]> {
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const completed = transactionDone(transaction);
    const recordsRequest = requestResult(transaction.objectStore(STORE_NAME).getAll()) as Promise<StoredSaveRecord[]>;
    const [records] = await Promise.all([recordsRequest, completed]) as [StoredSaveRecord[], void];
    return records.map((record) => record.metadata)
      .sort((left, right) => right.savedAtRealTime.localeCompare(left.savedAtRealTime));
  }

  async deleteSlot(slotId: string): Promise<void> {
    validateSlotId(slotId);
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const completed = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).delete(slotId);
    await completed;
  }

  async exportSlot(slotId: string): Promise<Blob> {
    const envelope = await this.load(slotId);
    if (!envelope) throw new Error('Save slot not found: ' + slotId);
    return new Blob([stableStringify(envelope)], { type: 'application/json' });
  }

  async importSlot(slotId: string, input: Blob): Promise<SaveMetadata> {
    validateSlotId(slotId);
    const verification = await verifySaveEnvelope(await input.text());
    if (!verification.ok) throw new Error('Import rejected: ' + verification.errorCode);
    return this.save(slotId, verification.envelope);
  }
}

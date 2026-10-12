import { describe, expect, it } from 'vitest';
import type { SaveEnvelopeV1, SaveMetadata } from '../../contracts/persistence';
import { createInitialGameState } from '../domain/initial-state';
import { buildSaveEnvelope, IndexedDbSaveRepository } from './save-system';

interface StoredSave {
  slotId: string;
  envelope: SaveEnvelopeV1;
  metadata: SaveMetadata;
}

interface FakeRequest<T> {
  result: T | undefined;
  error: DOMException | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
}

class FakeTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  error: DOMException | null = null;

  constructor(private readonly database: FakeDatabase) {}

  objectStore(name: string): IDBObjectStore {
    if (!this.database.stores.has(name)) throw new Error('Unknown object store: ' + name);
    return new FakeObjectStore(this.database, this) as unknown as IDBObjectStore;
  }

  complete(): void {
    this.oncomplete?.(new Event('complete'));
  }

  fail(error: DOMException): void {
    this.error = error;
    this.onerror?.(new Event('error'));
    this.onabort?.(new Event('abort'));
  }
}

class FakeObjectStore {
  constructor(private readonly database: FakeDatabase, private readonly transaction: FakeTransaction) {}

  private request<T>(operation: () => T): IDBRequest<T> {
    const request: FakeRequest<T> = { result: undefined, error: null, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      try {
        request.result = operation();
        request.onsuccess?.(new Event('success'));
        queueMicrotask(() => this.transaction.complete());
      } catch (error) {
        const failure = error instanceof DOMException
          ? error
          : new DOMException(error instanceof Error ? error.message : String(error), 'UnknownError');
        request.error = failure;
        request.onerror?.(new Event('error'));
        this.transaction.fail(failure);
      }
    });
    return request as unknown as IDBRequest<T>;
  }

  put(value: StoredSave): IDBRequest<IDBValidKey> {
    return this.request(() => {
      if (this.database.failNextPut) {
        this.database.failNextPut = false;
        throw new DOMException('Simulated storage quota exhaustion.', 'QuotaExceededError');
      }
      this.database.records.set(value.slotId, structuredClone(value));
      return value.slotId;
    }) as unknown as IDBRequest<IDBValidKey>;
  }

  get(key: IDBValidKey): IDBRequest<unknown> {
    return this.request(() => {
      const value = this.database.records.get(String(key));
      return value ? structuredClone(value) : undefined;
    }) as unknown as IDBRequest<unknown>;
  }

  getAll(): IDBRequest<unknown[]> {
    return this.request(() => [...this.database.records.values()].map((value) => structuredClone(value))) as unknown as IDBRequest<unknown[]>;
  }

  delete(key: IDBValidKey): IDBRequest<undefined> {
    return this.request(() => {
      this.database.records.delete(String(key));
      return undefined;
    }) as unknown as IDBRequest<undefined>;
  }
}

class FakeDatabase {
  readonly records = new Map<string, StoredSave>();
  readonly stores = new Set<string>();
  failNextPut = false;
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string): IDBObjectStore {
    this.stores.add(name);
    return new FakeObjectStore(this, new FakeTransaction(this)) as unknown as IDBObjectStore;
  }

  transaction(name: string, _mode?: IDBTransactionMode): IDBTransaction {
    if (!this.stores.has(name)) throw new Error('Unknown object store: ' + name);
    return new FakeTransaction(this) as unknown as IDBTransaction;
  }

  close(): void {}
}

class FakeIndexedDbFactory {
  readonly databases = new Map<string, FakeDatabase>();

  open(name: string): IDBOpenDBRequest {
    const database = this.databases.get(name) ?? new FakeDatabase();
    this.databases.set(name, database);
    const request = {
      result: database,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      onblocked: null,
    } as unknown as IDBOpenDBRequest;

    queueMicrotask(() => {
      if (database.stores.size === 0) {
        request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent);
      }
      request.onsuccess?.(new Event('success'));
    });
    return request;
  }
}

describe('IndexedDB save transaction recovery', () => {
  it('preserves the last committed save when the next write fails', async () => {
    const factory = new FakeIndexedDbFactory();
    const repository = new IndexedDbSaveRepository(factory as unknown as IDBFactory);
    const initial = createInitialGameState();
    const original = buildSaveEnvelope(initial, '2026-10-12T12:00:00.000Z');
    await repository.save('autosave', original);

    const database = factory.databases.get('herbal-line-saves');
    if (!database) throw new Error('Test database was not created.');
    database.failNextPut = true;
    const newer = buildSaveEnvelope({ ...initial, revision: 1 }, '2026-10-12T12:01:00.000Z');

    await expect(repository.save('autosave', newer)).rejects.toMatchObject({ code: 'STORAGE_FAILED' });
    await expect(repository.load('autosave')).resolves.toMatchObject({
      revision: original.revision,
      checksum: original.checksum,
    });

    const retried = await repository.save('autosave', newer);
    expect(retried.revision).toBe(1);
    await expect(repository.load('autosave')).resolves.toMatchObject({
      revision: newer.revision,
      checksum: newer.checksum,
    });
  });
});

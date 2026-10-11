import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SaveEnvelopeV1 } from '../../contracts/persistence';
import { createInitialGameState } from '../domain/initial-state';
import { createSaveEnvelope } from './save-codec';
import { IndexedDbSaveRepository } from './indexeddb-save-repository';

interface FakeStoredRecord {
  slotId: string;
  envelope: SaveEnvelopeV1;
  metadata: { slotId: string; revision: number; savedAtRealTime: string; gameVersion: string; byteLength: number };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class FakeObjectStore {
  constructor(private readonly database: FakeDatabase, private readonly transaction: FakeTransaction) {}

  private request<T>(operation: () => T): IDBRequest<T> {
    const request = { result: undefined, error: null, onsuccess: null, onerror: null } as unknown as IDBRequest<T>;
    queueMicrotask(() => {
      try {
        Object.defineProperty(request, 'result', { value: operation(), configurable: true });
        request.onsuccess?.(new Event('success'));
        queueMicrotask(() => this.transaction.oncomplete?.(new Event('complete')));
      } catch (error) {
        Object.defineProperty(request, 'error', { value: error, configurable: true });
        request.onerror?.(new Event('error'));
        this.transaction.onerror?.(new Event('error'));
      }
    });
    return request;
  }

  put(value: FakeStoredRecord): IDBRequest<IDBValidKey> {
    return this.request(() => {
      this.database.records.set(value.slotId, clone(value));
      return value.slotId;
    }) as unknown as IDBRequest<IDBValidKey>;
  }

  get(key: IDBValidKey): IDBRequest<unknown> {
    return this.request(() => {
      const record = this.database.records.get(String(key));
      return record ? clone(record) : undefined;
    }) as unknown as IDBRequest<unknown>;
  }

  getAll(): IDBRequest<unknown[]> {
    return this.request(() => [...this.database.records.values()].map(clone)) as unknown as IDBRequest<unknown[]>;
  }

  delete(key: IDBValidKey): IDBRequest<undefined> {
    return this.request(() => {
      this.database.records.delete(String(key));
      return undefined;
    });
  }
}

class FakeTransaction {
  oncomplete: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onabort: ((event: Event) => void) | null = null;
  error: DOMException | null = null;

  constructor(private readonly database: FakeDatabase) {}

  objectStore(name: string): IDBObjectStore {
    if (name !== 'saves') throw new Error('Unknown object store: ' + name);
    return new FakeObjectStore(this.database, this) as unknown as IDBObjectStore;
  }
}

class FakeDatabase {
  readonly records = new Map<string, FakeStoredRecord>();
  readonly stores = new Set<string>();
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
    const request = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      onblocked: null,
    } as unknown as IDBOpenDBRequest;
    queueMicrotask(() => {
      let database = this.databases.get(name);
      if (!database) {
        database = new FakeDatabase();
        this.databases.set(name, database);
        Object.defineProperty(request, 'result', { value: database, configurable: true });
        request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent);
      }
      Object.defineProperty(request, 'result', { value: database, configurable: true });
      queueMicrotask(() => request.onsuccess?.(new Event('success')));
    });
    return request;
  }
}

afterEach(() => vi.unstubAllGlobals());

describe('IndexedDbSaveRepository', () => {
  function createRepository(): { repository: IndexedDbSaveRepository; factory: FakeIndexedDbFactory } {
    const factory = new FakeIndexedDbFactory();
    vi.stubGlobal('indexedDB', factory as unknown as IDBFactory);
    return {
      factory,
      repository: new IndexedDbSaveRepository('herbal-line-test', 1),
    };
  }

  it('saves, loads, lists and deletes a verified slot', async () => {
    const { repository } = createRepository();
    const envelope = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');

    const metadata = await repository.save('campaign-01', envelope);
    expect(metadata.slotId).toBe('campaign-01');
    expect(metadata.byteLength).toBeGreaterThan(0);
    expect(await repository.load('campaign-01')).toEqual(envelope);
    expect(await repository.listSlots()).toEqual([metadata]);

    await repository.deleteSlot('campaign-01');
    expect(await repository.load('campaign-01')).toBeNull();
    expect(await repository.listSlots()).toEqual([]);
  });

  it('exports and imports a checksummed save into a second slot', async () => {
    const { repository } = createRepository();
    const envelope = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    await repository.save('campaign-source', envelope);

    const exported = await repository.exportSlot('campaign-source');
    expect(exported.type).toBe('application/json');
    const imported = await repository.importSlot('campaign-copy', exported);
    expect(imported.slotId).toBe('campaign-copy');
    expect(await repository.load('campaign-copy')).toEqual(envelope);
  });

  it('refuses invalid saves and does not load a tampered stored payload', async () => {
    const { repository, factory } = createRepository();
    const envelope = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    await expect(repository.save('bad-slot', { ...envelope, checksum: '0'.repeat(64) })).rejects.toThrow('invalid envelope');

    await repository.save('campaign-01', envelope);
    const database = factory.databases.get('herbal-line-test');
    const record = database?.records.get('campaign-01');
    if (!record) throw new Error('Test save record was not stored.');
    Reflect.set(record.envelope.payload, 'reputation', 999);
    database?.records.set('campaign-01', record);

    await expect(repository.load('campaign-01')).rejects.toThrow('CHECKSUM_MISMATCH');
  });

  it('validates slot IDs and reports missing exports', async () => {
    const { repository } = createRepository();
    await expect(repository.save('../escape', await createSaveEnvelope(createInitialGameState()))).rejects.toThrow('Save slot IDs');
    await expect(repository.exportSlot('missing-slot')).rejects.toThrow('Save slot not found');
  });
});

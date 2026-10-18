import { describe, expect, it } from 'vitest';
import type { SaveEnvelopeV1 } from '../../contracts/persistence';
import { createInitialGameState } from '../domain/initial-state';
import { createSaveEnvelope, migrateEnvelope, restoreGameState, stableStringify, verifySaveEnvelope } from './save-codec';

describe('versioned save codec', () => {
  it('creates a checksummed envelope without transient UI state and restores a valid game state', async () => {
    const state = createInitialGameState();
    const envelope = await createSaveEnvelope(state, '2026-10-12T12:00:00.000Z');

    expect(envelope.format).toBe('herbal-line-save');
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.payload).not.toHaveProperty('ui');
    expect(envelope.checksum).toMatch(/^[a-f0-9]{64}$/);

    const verified = await verifySaveEnvelope(stableStringify(envelope));
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error(verified.errorCode);

    const restored = restoreGameState(verified.envelope);
    expect(restored.revision).toBe(state.revision);
    expect(restored.plants).toEqual(state.plants);
    expect(restored.economy).toEqual(state.economy);
    expect(restored.ui).toEqual({ selectedEntityId: null, activeScreen: 'facility', notifications: [] });
  });

  it('produces the same stable JSON regardless of object insertion order', () => {
    expect(stableStringify({ z: 3, a: { y: true, x: 1 } })).toBe(stableStringify({ a: { x: 1, y: true }, z: 3 }));
  });

  it('detects payload tampering without modifying the supplied envelope', async () => {
    const envelope = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    const tampered = {
      ...envelope,
      payload: {
        ...envelope.payload,
        reputation: 999,
      },
    } as SaveEnvelopeV1;

    const result = await verifySaveEnvelope(tampered);
    expect(result).toEqual({ ok: false, errorCode: 'CHECKSUM_MISMATCH' });
    expect(envelope.payload.reputation).toBe(240);
  });

  it('rejects invalid JSON, unsupported versions, and structurally incomplete envelopes', async () => {
    expect(await verifySaveEnvelope('{broken')).toEqual({ ok: false, errorCode: 'INVALID_ENVELOPE' });
    expect(await verifySaveEnvelope({ schemaVersion: 99 })).toEqual({ ok: false, errorCode: 'UNSUPPORTED_VERSION' });
    expect(await verifySaveEnvelope({ format: 'herbal-line-save', schemaVersion: 1 })).toEqual({ ok: false, errorCode: 'INVALID_ENVELOPE' });
  });

  it('preserves prototype-named JSON keys without mutating object prototypes', () => {
    const input = JSON.parse('{"__proto__":{"polluted":true},"constructor":"data"}') as unknown;
    const serialized = stableStringify(input);
    expect(serialized).toContain('"__proto__"');
    expect(serialized).toContain('"constructor"');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('rejects non-JSON values and circular references in stable serialization', () => {
    expect(() => stableStringify({ invalid: Number.NaN })).toThrow(TypeError);
    expect(() => stableStringify({ invalid: undefined })).toThrow(TypeError);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => stableStringify(circular)).toThrow(TypeError);
  });
});

describe('Migration chain', () => {
  it('rejects unsupported future schema versions', async () => {
    const result = await migrateEnvelope({ format: 'herbal-line-save', schemaVersion: 99, checksum: 'abc' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe('UNSUPPORTED_VERSION');
  });

  it('accepts a valid current-version envelope via the migration entry point', async () => {
    const state = createInitialGameState();
    const envelope = await createSaveEnvelope(state, '2026-10-18T12:00:00.000Z');
    const result = await migrateEnvelope(envelope);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.schemaVersion).toBe(1);
  });
});

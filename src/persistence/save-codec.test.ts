import { describe, expect, it } from 'vitest';
import type { SaveEnvelopeV1 } from '../../contracts/persistence';
import { createInitialGameState } from '../domain/initial-state';
import { createSaveEnvelope, restoreGameState, sha256Hex, stableStringify, verifySaveEnvelope } from './save-codec';

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

  it('rejects malformed nested entities even when the supplied checksum is recomputed', async () => {
    const envelope = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    const { checksum: _checksum, ...body } = envelope;
    const malformedBody = {
      ...body,
      payload: { ...body.payload, rooms: [null] },
    };
    const malformed = {
      ...malformedBody,
      checksum: await sha256Hex(stableStringify(malformedBody)),
    } as SaveEnvelopeV1;

    expect(await verifySaveEnvelope(malformed)).toEqual({ ok: false, errorCode: 'INVALID_ENVELOPE' });
  });

  it('rejects a checksummed save that violates cross-entity plant-care invariants', async () => {
    const state = createInitialGameState();
    const plant = state.plants[0];
    if (!plant) throw new Error('Initial campaign must contain a plant.');
    state.plants[0] = {
      ...plant,
      care: {
        waterLevel: 'balanced',
        lightLevel: 'balanced',
        temperatureLevel: 'balanced',
        humidityLevel: 'balanced',
        nutrientLevel: 'balanced',
        pruningCount: 0,
        cuttingsTaken: 0,
        cuttingsSet: 1,
        lastAction: 'set_cutting',
      },
    };
    const envelope = await createSaveEnvelope(state, '2026-10-12T12:00:00.000Z');

    expect(await verifySaveEnvelope(envelope)).toEqual({ ok: false, errorCode: 'INVALID_ENVELOPE' });
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

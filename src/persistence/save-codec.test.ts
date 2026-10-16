import { describe, expect, it } from 'vitest';
import type { SaveEnvelopeV2 } from '../../contracts/persistence';
import { getBalanceCents } from '../domain/finance';
import { createInitialGameState } from '../domain/initial-state';
import { createSaveEnvelope, restoreGameState, sha256Hex, stableStringify, verifySaveEnvelope } from './save-codec';

describe('versioned save codec', () => {
  it('creates a checksummed envelope without transient UI state and restores a valid game state', async () => {
    const state = createInitialGameState();
    const envelope = await createSaveEnvelope(state, '2026-10-12T12:00:00.000Z');

    expect(envelope.format).toBe('herbal-line-save');
    expect(envelope.schemaVersion).toBe(2);
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
    } as SaveEnvelopeV2;

    const result = await verifySaveEnvelope(tampered);
    expect(result).toEqual({ ok: false, errorCode: 'CHECKSUM_MISMATCH' });
    expect(envelope.payload.reputation).toBe(100);
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
    } as unknown as SaveEnvelopeV2;

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

  it('rejects unsupported schema versions before validating payload fields', async () => {
    expect(await verifySaveEnvelope({ schemaVersion: 99 })).toEqual({ ok: false, errorCode: 'UNSUPPORTED_VERSION' });
  });


  it('migrates the documented historical Master Pack V1 payload without losing ledger balance', async () => {
    const state = createInitialGameState();
    const { qualityAssessments: _assessments, ui, schemaVersion: _schemaVersion, economy, ...rest } = state;
    void _assessments; void _schemaVersion;
    const legacyEconomy = { ...economy, revenueTodayCents: 0, expensesTodayCents: 0, lifetimeRevenueCents: 0, lifetimeExpensesCents: 0 };
    const legacyPayload = { ...rest, schemaVersion: 1, moneyCents: getBalanceCents(economy), economy: legacyEconomy, ui };
    const body = { format: 'herbal-line-save' as const, schemaVersion: 1 as const, gameVersion: state.gameVersion, revision: state.revision, savedAtRealTime: '2026-10-12T12:00:00.000Z', rngState: state.rngState, payload: legacyPayload };
    const legacy = { ...body, checksum: await sha256Hex(stableStringify(body)) };
    const result = await verifySaveEnvelope(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errorCode);
    expect(result.envelope.schemaVersion).toBe(2);
    expect(result.envelope.payload.schemaVersion).toBe(2);
    expect(result.envelope.payload).not.toHaveProperty('moneyCents');
    expect(result.envelope.payload).not.toHaveProperty('ui');
    expect(result.envelope.payload.qualityAssessments).toEqual([]);
    expect(getBalanceCents(result.envelope.payload.economy)).toBe(getBalanceCents(economy));
  });

  it('migrates the previous active-app V1 payload into V2', async () => {
    const current = await createSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    const { checksum: _checksum, ...v2Body } = current;
    const payload = { ...v2Body.payload, schemaVersion: 1 };
    const v1Body = { ...v2Body, schemaVersion: 1, payload };
    const legacy = { ...v1Body, checksum: await sha256Hex(stableStringify(v1Body)) };
    const result = await verifySaveEnvelope(legacy);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.errorCode);
    expect(result.envelope.schemaVersion).toBe(2);
    expect(result.envelope.payload.schemaVersion).toBe(2);
    expect(result.envelope.payload.qualityAssessments).toEqual(current.payload.qualityAssessments);
  });

  it('rejects historical V1 saves whose financial snapshot conflicts with the ledger', async () => {
    const state = createInitialGameState();
    const { qualityAssessments: _assessments, ui, schemaVersion: _schemaVersion, economy, ...rest } = state;
    void _assessments; void _schemaVersion;
    const legacyEconomy = { ...economy, revenueTodayCents: 0, expensesTodayCents: 0, lifetimeRevenueCents: 0, lifetimeExpensesCents: 0 };
    const legacyPayload = { ...rest, schemaVersion: 1, moneyCents: Number(getBalanceCents(economy)) + 1, economy: legacyEconomy, ui };
    const body = { format: 'herbal-line-save' as const, schemaVersion: 1 as const, gameVersion: state.gameVersion, revision: state.revision, savedAtRealTime: '2026-10-12T12:00:00.000Z', rngState: state.rngState, payload: legacyPayload };
    const legacy = { ...body, checksum: await sha256Hex(stableStringify(body)) };
    expect(await verifySaveEnvelope(legacy)).toEqual({ ok: false, errorCode: 'MIGRATION_FAILED' });
  });

});

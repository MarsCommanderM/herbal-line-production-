import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../domain/initial-state';
import {
  buildSaveEnvelope,
  checksumPayload,
  restoreGameState,
  stableStringify,
  validateAndMigrateSave,
} from './save-system';

describe('save envelope integrity', () => {
  it('creates a versioned envelope without transient UI state', () => {
    const state = createInitialGameState();
    const envelope = buildSaveEnvelope(state, '2026-10-12T12:00:00.000Z');
    expect(envelope.format).toBe('herbal-line-save');
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.revision).toBe(state.revision);
    expect('ui' in envelope.payload).toBe(false);
    expect(validateAndMigrateSave(envelope)).toEqual({ ok: true, envelope });
  });

  it('restores domain state and rebuilds transient UI separately', () => {
    const state = createInitialGameState();
    const envelope = buildSaveEnvelope(state, '2026-10-12T12:00:00.000Z');
    const transientUi = { selectedEntityId: null, activeScreen: 'dashboard', notifications: [] };
    const restored = restoreGameState(envelope, transientUi);
    expect(restored.player).toEqual(state.player);
    expect(restored.economy).toEqual(state.economy);
    expect(restored.ui).toEqual(transientUi);
    expect(restored).not.toHaveProperty('payload');
  });

  it('detects accidental payload corruption before restoring', () => {
    const envelope = buildSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    const tampered = {
      ...envelope,
      payload: { ...envelope.payload, revision: envelope.payload.revision + 1 },
    };
    expect(validateAndMigrateSave(tampered)).toEqual({ ok: false, errorCode: 'CHECKSUM_MISMATCH' });
  });

  it('rejects unsupported schema versions explicitly', () => {
    const envelope = buildSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    expect(validateAndMigrateSave({ ...envelope, schemaVersion: 2 })).toEqual({ ok: false, errorCode: 'UNSUPPORTED_VERSION' });
  });

  it('rejects a payload that attempts to persist transient UI', () => {
    const envelope = buildSaveEnvelope(createInitialGameState(), '2026-10-12T12:00:00.000Z');
    const tampered = { ...envelope, payload: { ...envelope.payload, ui: envelope.payload } };
    expect(validateAndMigrateSave(tampered)).toEqual({ ok: false, errorCode: 'INVALID_ENVELOPE' });
  });

  it('serializes object keys deterministically without reordering arrays', () => {
    expect(stableStringify({ z: 1, a: { y: 2, b: 3 } })).toBe(stableStringify({ a: { b: 3, y: 2 }, z: 1 }));
    expect(checksumPayload({ values: [1, 2, 3] })).not.toBe(checksumPayload({ values: [3, 2, 1] }));
  });
});

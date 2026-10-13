import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './initial-state';
import { GAME_BALANCE, parseBalanceConfig } from './balance';

describe('versioned fictional game balance', () => {
  it('loads only ordered, bounded game thresholds', () => {
    expect(GAME_BALANCE.version).toBe('fictional-game-balance-v1');
    expect(GAME_BALANCE.qcPassThreshold).toBe(70);
    expect(GAME_BALANCE.qcReviewThreshold).toBe(60);
    expect(GAME_BALANCE.licenseWarningRisk).toBe(40);
    expect(GAME_BALANCE.licenseSuspendedRisk).toBe(80);
    expect(() => parseBalanceConfig({ ...GAME_BALANCE, licenseWarningRisk: 90 })).toThrow(/License risk thresholds/);
    expect(() => parseBalanceConfig({ ...GAME_BALANCE, qcReviewThreshold: 75 })).toThrow(/QC thresholds/);
  });

  it('starts from the documented fictional balance baseline', () => {
    const state = createInitialGameState();
    expect(state.economy.openingBalanceCents).toBe(2_500_000);
    expect(state.reputation).toBe(100);
    expect(state.compliance.risk).toBe(0);
    expect(state.rooms.map((room) => [room.kind, room.capacity, room.powerUnitsPerHour])).toEqual([
      ['production', 6, 12],
      ['processing', 4, 8],
      ['quality', 3, 6],
      ['storage', 12, 3],
      ['logistics', 4, 1],
    ]);
  });
});

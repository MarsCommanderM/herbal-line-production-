import type { EconomyState, GameState, LedgerEntry, MoneyCents, UIState } from './domain';
type LegacyLedgerEntryV1 = Omit<LedgerEntry, 'account'> & { account: Exclude<LedgerEntry['account'], 'grant'> };
type LegacyEconomyStateV1 = Omit<EconomyState, 'ledger' | 'revenueTodayCents' | 'expensesTodayCents' | 'lifetimeRevenueCents' | 'lifetimeExpensesCents'> & {
  ledger: LegacyLedgerEntryV1[]; revenueTodayCents: MoneyCents; expensesTodayCents: MoneyCents; lifetimeRevenueCents: MoneyCents; lifetimeExpensesCents: MoneyCents;
};
export type LegacySavePayloadV1 = Omit<GameState, 'schemaVersion' | 'qualityAssessments' | 'ui' | 'economy'> & {
  schemaVersion: 1; moneyCents: MoneyCents; ui?: UIState; economy: LegacyEconomyStateV1;
};
export type ActiveSavePayloadV1 = Omit<GameState, 'schemaVersion' | 'ui'> & { schemaVersion: 1 };
export interface SaveEnvelopeV1 {
  format: 'herbal-line-save'; schemaVersion: 1; gameVersion: string; revision: number; savedAtRealTime: string; rngState: number; checksum: string;
  payload: LegacySavePayloadV1 | ActiveSavePayloadV1;
}
export interface SaveEnvelopeV2 {
  format: 'herbal-line-save'; schemaVersion: 2; gameVersion: string; revision: number; savedAtRealTime: string; rngState: number; checksum: string;
  payload: Omit<GameState, 'ui'>;
}
export interface SaveMetadata { slotId: string; revision: number; savedAtRealTime: string; gameVersion: string; byteLength: number; }
export interface SaveRepository {
  save(slotId: string, envelope: SaveEnvelopeV2): Promise<SaveMetadata>;
  load(slotId: string): Promise<SaveEnvelopeV2 | null>;
  listSlots(): Promise<SaveMetadata[]>;
  deleteSlot(slotId: string): Promise<void>;
  exportSlot(slotId: string): Promise<Blob>;
  importSlot(slotId: string, input: Blob): Promise<SaveMetadata>;
}
export type MigrationResult = { ok: true; envelope: SaveEnvelopeV2 } | { ok: false; errorCode: 'UNSUPPORTED_VERSION' | 'INVALID_ENVELOPE' | 'MIGRATION_FAILED' | 'CHECKSUM_MISMATCH' };

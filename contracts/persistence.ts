import type { GameState } from './domain';
export interface SaveEnvelopeV1 {
  format: 'herbal-line-save';
  schemaVersion: 1;
  gameVersion: string;
  revision: number;
  savedAtRealTime: string;
  rngState: number;
  checksum: string;
  payload: Omit<GameState, 'ui'>;
}
export interface SaveMetadata { slotId: string; revision: number; savedAtRealTime: string; gameVersion: string; byteLength: number; }
export interface SaveRepository {
  save(slotId: string, envelope: SaveEnvelopeV1): Promise<SaveMetadata>;
  load(slotId: string): Promise<SaveEnvelopeV1 | null>;
  listSlots(): Promise<SaveMetadata[]>;
  deleteSlot(slotId: string): Promise<void>;
  exportSlot(slotId: string): Promise<Blob>;
  importSlot(slotId: string, input: Blob): Promise<SaveMetadata>;
}
export type MigrationResult = { ok: true; envelope: SaveEnvelopeV1 } | { ok: false; errorCode: 'UNSUPPORTED_VERSION' | 'INVALID_ENVELOPE' | 'MIGRATION_FAILED' | 'CHECKSUM_MISMATCH' };
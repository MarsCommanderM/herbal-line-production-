import rawBalance from '../data/balance.json' with { type: 'json' };
import type { GameBalanceConfig } from '../../contracts/domain';

export type RuntimeBalanceConfig = GameBalanceConfig;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

/** Fail closed if the fictional balance file is malformed or internally inconsistent. */
export function parseBalanceConfig(value: unknown): Readonly<RuntimeBalanceConfig> {
  if (!isRecord(value) || typeof value.version !== 'string' || value.version.trim() === '') {
    throw new TypeError('Balance config must declare a non-empty version.');
  }
  const numericFields = [
    'initialMoneyCents', 'initialReputation', 'initialComplianceRisk', 'reputationMin', 'reputationMax',
    'licenseWarningRisk', 'licenseSuspendedRisk', 'qcPassThreshold',
    'qcReviewThreshold', 'fixedStepHz', 'autosaveIntervalMs',
  ] as const;
  for (const field of numericFields) {
    if (!Number.isSafeInteger(value[field])) throw new TypeError('Balance config field must be a safe integer: ' + field);
  }
  if (!isIntegerInRange(value.initialMoneyCents, 0, Number.MAX_SAFE_INTEGER)) throw new RangeError('Initial money must be non-negative.');
  if (!isIntegerInRange(value.reputationMin, 0, 1000) || !isIntegerInRange(value.reputationMax, 0, 1000)
    || value.reputationMin >= value.reputationMax) throw new RangeError('Reputation bounds must be ordered within 0–1000.');
  if (!isIntegerInRange(value.initialReputation, value.reputationMin, value.reputationMax)) throw new RangeError('Initial reputation must be within the configured bounds.');
  if (!isIntegerInRange(value.initialComplianceRisk, 0, 100)) throw new RangeError('Initial compliance risk must be in 0–100.');
  if (!isIntegerInRange(value.licenseWarningRisk, 0, 100) || !isIntegerInRange(value.licenseSuspendedRisk, 0, 100)
    || value.licenseWarningRisk >= value.licenseSuspendedRisk) {
    throw new RangeError('License risk thresholds must be ordered within 0–100.');
  }
  if (!isIntegerInRange(value.qcReviewThreshold, 0, 100) || !isIntegerInRange(value.qcPassThreshold, 0, 100)
    || value.qcReviewThreshold >= value.qcPassThreshold) {
    throw new RangeError('QC thresholds must be ordered within 0–100.');
  }
  if (!isIntegerInRange(value.fixedStepHz, 1, 240) || !isIntegerInRange(value.autosaveIntervalMs, 1000, 3600000)) {
    throw new RangeError('Simulation and autosave timing values are outside safe bounds.');
  }
  return Object.freeze({ ...value }) as Readonly<RuntimeBalanceConfig>;
}

export const GAME_BALANCE = parseBalanceConfig(rawBalance);

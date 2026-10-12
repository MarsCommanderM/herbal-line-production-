import type { MoneyCents } from '../../contracts/domain';
import balance from '../data/balance.json' with { type: 'json' };

export interface BalanceUpgradeConfig {
  id: string;
  label: string;
  description: string;
  costCents: MoneyCents;
  utilityReductionPercent: number;
  prerequisiteUpgradeId?: string;
}

export interface GameBalanceConfig {
  schemaVersion: 1;
  balanceVersion: string;
  economy: {
    utilityRateCentsPerUnitHour: number;
    operatingHoursPerCampaignDay: number;
  };
  quality: {
    releaseThreshold: number;
    reviewThreshold: number;
    contaminationPenaltyMultiplier: number;
  };
  upgrades: BalanceUpgradeConfig[];
}

type BalanceObject = Record<string, unknown>;

function invalid(path: string, reason: string): never {
  throw new TypeError('Invalid game balance config at ' + path + ': ' + reason);
}

function asObject(value: unknown, path: string): BalanceObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(path, 'must be an object');
  }
  return value as BalanceObject;
}

function assertExactKeys(
  value: BalanceObject,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) invalid(path, 'missing required field ' + key);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(path, 'unexpected field ' + key);
  }
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalid(path, 'must be a non-empty string');
  }
  return value;
}

function safeInteger(value: unknown, path: string, minimum: number, maximum?: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    return invalid(path, 'must be a safe integer in the allowed range');
  }
  return value;
}

function finiteNumber(value: unknown, path: string, minimum: number, maximum?: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    return invalid(path, 'must be a finite number in the allowed range');
  }
  return value;
}

/**
 * Validates parsed JSON before configuration values can affect domain logic.
 * The checks mirror the balance schema and additionally validate prerequisite relationships.
 */
export function parseGameBalanceConfig(value: unknown): GameBalanceConfig {
  const root = asObject(value, '$');
  assertExactKeys(root, ['schemaVersion', 'balanceVersion', 'economy', 'quality', 'upgrades'], [], '$');

  if (root['schemaVersion'] !== 1) invalid('schemaVersion', 'must equal 1');
  nonEmptyString(root['balanceVersion'], 'balanceVersion');

  const economy = asObject(root['economy'], 'economy');
  assertExactKeys(economy, ['utilityRateCentsPerUnitHour', 'operatingHoursPerCampaignDay'], [], 'economy');
  safeInteger(economy['utilityRateCentsPerUnitHour'], 'economy.utilityRateCentsPerUnitHour', 0);
  safeInteger(economy['operatingHoursPerCampaignDay'], 'economy.operatingHoursPerCampaignDay', 1);

  const quality = asObject(root['quality'], 'quality');
  assertExactKeys(quality, ['releaseThreshold', 'reviewThreshold', 'contaminationPenaltyMultiplier'], [], 'quality');
  const releaseThreshold = safeInteger(quality['releaseThreshold'], 'quality.releaseThreshold', 0, 100);
  const reviewThreshold = safeInteger(quality['reviewThreshold'], 'quality.reviewThreshold', 0, 100);
  finiteNumber(quality['contaminationPenaltyMultiplier'], 'quality.contaminationPenaltyMultiplier', 0);
  if (reviewThreshold > releaseThreshold) invalid('quality', 'reviewThreshold cannot exceed releaseThreshold');

  const rawUpgrades = root['upgrades'];
  if (!Array.isArray(rawUpgrades) || rawUpgrades.length === 0) invalid('upgrades', 'must be a non-empty array');

  const ids = new Set<string>();
  const prerequisites = new Map<string, string | undefined>();
  rawUpgrades.forEach((rawUpgrade: unknown, index: number) => {
    const path = 'upgrades[' + index + ']';
    const upgrade = asObject(rawUpgrade, path);
    assertExactKeys(
      upgrade,
      ['id', 'label', 'description', 'costCents', 'utilityReductionPercent'],
      ['prerequisiteUpgradeId'],
      path,
    );
    const id = nonEmptyString(upgrade['id'], path + '.id');
    nonEmptyString(upgrade['label'], path + '.label');
    nonEmptyString(upgrade['description'], path + '.description');
    safeInteger(upgrade['costCents'], path + '.costCents', 0);
    finiteNumber(upgrade['utilityReductionPercent'], path + '.utilityReductionPercent', 0, 100);
    if (ids.has(id)) invalid(path + '.id', 'must be unique');
    ids.add(id);
    const prerequisite = Object.prototype.hasOwnProperty.call(upgrade, 'prerequisiteUpgradeId')
      ? nonEmptyString(upgrade['prerequisiteUpgradeId'], path + '.prerequisiteUpgradeId')
      : undefined;
    prerequisites.set(id, prerequisite);
  });

  for (const [id, prerequisite] of prerequisites) {
    if (prerequisite !== undefined && !ids.has(prerequisite)) {
      invalid('upgrades.' + id + '.prerequisiteUpgradeId', 'references unknown upgrade ' + prerequisite);
    }
    if (prerequisite === id) invalid('upgrades.' + id + '.prerequisiteUpgradeId', 'cannot reference itself');
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) invalid('upgrades', 'prerequisite dependency cycle includes ' + id);
    if (visited.has(id)) return;
    visiting.add(id);
    const prerequisite = prerequisites.get(id);
    if (prerequisite !== undefined) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id);

  return value as GameBalanceConfig;
}

export const GAME_BALANCE = parseGameBalanceConfig(balance as unknown);

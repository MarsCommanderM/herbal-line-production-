import type { CareLevel, PlantCareState, PlantState } from '../../contracts/domain';

export const DEFAULT_PLANT_CARE: PlantCareState = {
  waterLevel: 'balanced',
  lightLevel: 'balanced',
  temperatureLevel: 'balanced',
  humidityLevel: 'balanced',
  nutrientLevel: 'balanced',
  pruningCount: 0,
  cuttingsTaken: 0,
  cuttingsSet: 0,
  lastAction: null,
};

/** Returns a fresh normalized copy; legacy saves without care fields remain readable. */
export function getPlantCareState(plant: Pick<PlantState, 'care'> | null | undefined): PlantCareState {
  return { ...DEFAULT_PLANT_CARE, ...(plant?.care ?? {}) };
}

export function isCareLevel(value: unknown): value is CareLevel {
  return value === 'low' || value === 'balanced' || value === 'high';
}

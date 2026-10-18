import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export type PlantAction = 'prune' | 'cutting' | 'plant' | 'repot';

export interface PlantState {
  pruned: boolean;
  cuttingsTaken: number;
  potted: boolean;
  health: number;
}

export interface InteractivePlant {
  group: THREE.Group;
  state: PlantState;
  applyAction: (action: PlantAction) => string;
  getAvailableActions: () => PlantAction[];
}

let cachedModel: THREE.Group | null = null;

export async function loadCannabisModel(): Promise<THREE.Group> {
  if (cachedModel) return cachedModel;
  const loader = new OBJLoader();
  const model = await loader.loadAsync('/assets/cannabis-plant.obj');
  // Normalize scale and center
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.8 / maxDim;
  model.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center.multiplyScalar(scale));
  model.position.y += 0.1;
  // Apply a cannabis-like material
  const leafMat = new THREE.MeshStandardMaterial({
    color: '#3a7a4a',
    roughness: 0.55,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      (child as THREE.Mesh).material = leafMat;
      (child as THREE.Mesh).castShadow = true;
      (child as THREE.Mesh).receiveShadow = true;
    }
  });
  cachedModel = model;
  return model;
}

export function createInteractivePlantFromModel(baseModel: THREE.Group, variant = 0): InteractivePlant {
  const group = baseModel.clone(true);
  group.name = 'cannabis-plant';
  group.userData.interactive = true;
  group.rotation.y = (variant % 5) * 0.4;

  const state: PlantState = { pruned: false, cuttingsTaken: 0, potted: true, health: 100 };

  function getAvailableActions(): PlantAction[] {
    const actions: PlantAction[] = [];
    if (!state.pruned) actions.push('prune');
    if (state.cuttingsTaken < 2) actions.push('cutting');
    actions.push('plant');
    actions.push('repot');
    return actions;
  }

  function applyAction(action: PlantAction): string {
    if (action === 'prune' && !state.pruned) {
      group.scale.multiplyScalar(0.92);
      state.pruned = true;
      state.health = Math.max(70, state.health - 5);
      return 'Beschnitten: Fiktive Spielaktion.';
    }
    if (action === 'cutting' && state.cuttingsTaken < 2) {
      state.cuttingsTaken += 1;
      return `Steckling genommen (${state.cuttingsTaken}/2). Fiktive Spielaktion.`;
    }
    if (action === 'plant') {
      return 'Steckling gesetzt. Visuelle Bestätigung (fiktive Spielmechanik).';
    }
    if (action === 'repot') {
      state.potted = !state.potted;
      group.scale.setScalar(state.potted ? 1 : 0.85);
      return state.potted ? 'Umtopfen abgeschlossen.' : 'Pflanze ausgetopft.';
    }
    return 'Aktion nicht verfügbar.';
  }

  return { group, state, applyAction, getAvailableActions };
}

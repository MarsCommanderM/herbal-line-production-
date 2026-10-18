import * as THREE from 'three';

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

export function createEnhancedCannabisPlant(variant: number = 0): InteractivePlant {
  const group = new THREE.Group();
  group.name = 'cannabis-plant';
  group.userData.interactive = true;

  const stemMat = new THREE.MeshStandardMaterial({ color: '#2d4a3e', roughness: 0.75 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? '#1b4332' : '#2d6a4f',
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const budMat = new THREE.MeshStandardMaterial({
    color: '#52796f',
    roughness: 0.45,
    emissive: '#081c15',
    emissiveIntensity: 0.2,
  });

  // Main stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, 1.7, 10), stemMat);
  stem.position.y = 0.85;
  stem.castShadow = true;
  group.add(stem);

  // Secondary branches
  for (let b = 0; b < 3; b++) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.4, 6), stemMat);
    const angle = (b / 3) * Math.PI * 2 + 0.4;
    branch.position.set(Math.cos(angle) * 0.15, 0.6 + b * 0.25, Math.sin(angle) * 0.15);
    branch.rotation.z = 0.6;
    branch.rotation.y = angle;
    branch.castShadow = true;
    group.add(branch);
  }

  // Fan leaves – more layered and cannabis-shaped
  const leafPositions = [
    { y: 0.35, count: 5, radius: 0.28 },
    { y: 0.7, count: 5, radius: 0.32 },
    { y: 1.05, count: 4, radius: 0.26 },
  ];
  for (const layer of leafPositions) {
    for (let i = 0; i < layer.count; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), leafMat);
      leaf.scale.set(1.1, 0.15, 0.65);
      const angle = (i / layer.count) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * layer.radius, layer.y, Math.sin(angle) * layer.radius);
      leaf.rotation.y = angle;
      leaf.rotation.z = 0.35;
      leaf.castShadow = true;
      leaf.name = 'leaf';
      group.add(leaf);
    }
  }

  // Buds
  for (let b = 0; b < 4; b++) {
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), budMat);
    const angle = (b / 4) * Math.PI * 2;
    bud.position.set(Math.cos(angle) * 0.08, 1.55 + (b % 2) * 0.12, Math.sin(angle) * 0.08);
    bud.castShadow = true;
    bud.name = 'bud';
    group.add(bud);
  }

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
      const leaves = group.children.filter((c) => c.name === 'leaf');
      leaves.slice(0, Math.min(3, leaves.length)).forEach((c) => group.remove(c));
      state.pruned = true;
      state.health = Math.max(70, state.health - 5);
      return 'Beschnitten: Fächerblätter reduziert. Fiktive Spielaktion.';
    }
    if (action === 'cutting' && state.cuttingsTaken < 2) {
      state.cuttingsTaken += 1;
      const cutting = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.22, 6), stemMat);
      cutting.position.set(0.45 + state.cuttingsTaken * 0.08, 0.12, 0.15);
      cutting.name = 'cutting';
      group.add(cutting);
      return `Steckling genommen (${state.cuttingsTaken}/2). Fiktive Spielaktion.`;
    }
    if (action === 'plant') {
      return 'Steckling gesetzt. Visuelle Bestätigung (fiktive Spielmechanik).';
    }
    if (action === 'repot') {
      state.potted = !state.potted;
      group.scale.setScalar(state.potted ? 1 : 0.82);
      return state.potted ? 'Umtopfen abgeschlossen. Pflanze im Topf.' : 'Pflanze ausgetopft.';
    }
    return 'Aktion nicht verfügbar.';
  }

  return { group, state, applyAction, getAvailableActions };
}

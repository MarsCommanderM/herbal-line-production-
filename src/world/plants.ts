import * as THREE from 'three';

export type PlantAction = 'prune' | 'cutting' | 'plant' | 'repot';

export interface InteractivePlant {
  group: THREE.Group;
  state: { pruned: boolean; cuttingsTaken: number; potted: boolean };
  applyAction: (action: PlantAction) => string;
}

export function createEnhancedCannabisPlant(variant: number = 0): InteractivePlant {
  const group = new THREE.Group();
  group.name = 'cannabis-plant';
  group.userData.interactive = true;

  const stemMat = new THREE.MeshStandardMaterial({ color: '#3a5c45', roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? '#2d6a4f' : '#40916c',
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const budMat = new THREE.MeshStandardMaterial({ color: '#6b8e23', roughness: 0.5, emissive: '#1a2e1a', emissiveIntensity: 0.15 });

  // Stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 1.6, 8), stemMat);
  stem.position.y = 0.8;
  stem.castShadow = true;
  group.add(stem);

  // Fan leaves (more cannabis-like)
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), leafMat);
    leaf.scale.set(0.9, 0.18, 0.55);
    const angle = (i / 6) * Math.PI * 2;
    const height = 0.4 + (i % 3) * 0.35;
    leaf.position.set(Math.cos(angle) * 0.22, height, Math.sin(angle) * 0.22);
    leaf.rotation.y = angle;
    leaf.rotation.z = 0.4;
    leaf.castShadow = true;
    leaf.name = 'leaf';
    group.add(leaf);
  }

  // Buds / flowers
  for (let b = 0; b < 3; b++) {
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), budMat);
    bud.position.set((b - 1) * 0.12, 1.55 + b * 0.08, 0);
    bud.castShadow = true;
    bud.name = 'bud';
    group.add(bud);
  }

  const state = { pruned: false, cuttingsTaken: 0, potted: true };

  function applyAction(action: PlantAction): string {
    if (action === 'prune' && !state.pruned) {
      // Remove some leaves visually
      group.children.filter((c) => c.name === 'leaf').slice(0, 2).forEach((c) => group.remove(c));
      state.pruned = true;
      return 'Pflanze beschnitten (fiktive Spielaktion).';
    }
    if (action === 'cutting' && state.cuttingsTaken < 2) {
      state.cuttingsTaken += 1;
      // Spawn a small cutting visual next to it
      const cutting = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.25, 6), stemMat);
      cutting.position.set(0.4, 0.15, 0.2);
      cutting.name = 'cutting';
      group.add(cutting);
      return `Steckling genommen (${state.cuttingsTaken}/2).`;
    }
    if (action === 'plant') {
      return 'Steckling gesetzt (visuelle Bestätigung).';
    }
    if (action === 'repot') {
      state.potted = !state.potted;
      group.scale.setScalar(state.potted ? 1 : 0.85);
      return state.potted ? 'Umtopfen abgeschlossen.' : 'Pflanze ausgetopft.';
    }
    return 'Aktion nicht verfügbar.';
  }

  return { group, state, applyAction };
}

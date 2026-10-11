import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId, EntityId } from '../contracts/domain';
import { createInitialGameState } from './domain/initial-state';
import { applyVerticalSliceCommand, getCampaignBalance, type VerticalSliceCommand } from './domain/vertical-slice';

const worldRoot = document.querySelector<HTMLDivElement>('#world-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
const fatalError = document.querySelector<HTMLDivElement>('#fatal-error');
const resetCameraButton = document.querySelector<HTMLButtonElement>('#reset-camera');
const gameMetrics = document.querySelector<HTMLDivElement>('#game-metrics');
const gameFeedback = document.querySelector<HTMLParagraphElement>('#game-feedback');
const gameActions = document.querySelector<HTMLDivElement>('#game-actions');
const gameLog = document.querySelector<HTMLDivElement>('#game-log');

let gameState = createInitialGameState();
let commandSequence = 0;
let onGameStateChanged: () => void = () => {};

function showFatalError(error: unknown): void {
  if (!fatalError) return;
  const detail = error instanceof Error ? error.message : String(error);
  fatalError.hidden = false;
  fatalError.textContent = `Die Anlagenansicht konnte nicht gestartet werden. Lade die Seite neu oder prüfe die Entwicklerkonsole.\n${detail}`;
}


function createCannabisLeaf(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const leaflet = (length: number, width: number): THREE.Mesh => {
    const shape = new THREE.Shape();
    const steps = 8;
    const left: [number, number][] = [];
    const right: [number, number][] = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const taper = Math.sin(Math.PI * t) * width;
      const serration = i === 0 || i === steps ? 0 : (i % 2 === 0 ? 0.035 : -0.02) * width;
      left.push([-(taper + serration), t * length]);
      right.push([taper + serration, t * length]);
    }
    shape.moveTo(0, 0);
    for (const [x, y] of left) shape.lineTo(x, y);
    for (const [x, y] of right.reverse()) shape.lineTo(x, y);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const center = leaflet(0.72, 0.16);
  group.add(center);
  const sideLeaflets = [
    { length: 0.47, angle: -0.95, y: 0.10 },
    { length: 0.60, angle: -0.60, y: 0.04 },
    { length: 0.57, angle: 0.60, y: 0.04 },
    { length: 0.45, angle: 0.95, y: 0.10 },
  ];
  for (const item of sideLeaflets) {
    const leaf = leaflet(item.length, 0.12);
    leaf.position.y = item.y;
    leaf.rotation.z = item.angle;
    group.add(leaf);
  }
  const lowerLeft = leaflet(0.36, 0.10);
  lowerLeft.position.set(-0.02, -0.02, 0.005);
  lowerLeft.rotation.z = -1.28;
  group.add(lowerLeft);
  const lowerRight = leaflet(0.36, 0.10);
  lowerRight.position.set(0.02, -0.02, 0.005);
  lowerRight.rotation.z = 1.28;
  group.add(lowerRight);
  return group;
}

function createCannabisPlant(x: number, z: number, variant: number): THREE.Group {
  const plant = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#527c63', roughness: 0.82 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? '#4f9470' : '#6ca77b',
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 1.65, 8), stemMaterial);
  stem.position.y = 0.88;
  stem.castShadow = true;
  plant.add(stem);

  for (let level = 0; level < 4; level += 1) {
    const leaf = createCannabisLeaf(leafMaterial);
    leaf.position.set(0, 0.43 + level * 0.31, 0);
    leaf.rotation.y = (level % 2) * Math.PI / 3;
    leaf.scale.setScalar(0.48 + level * 0.08);
    plant.add(leaf);
    const opposite = createCannabisLeaf(leafMaterial);
    opposite.position.set(0, 0.43 + level * 0.31, 0);
    opposite.rotation.y = Math.PI + (level % 2) * Math.PI / 3;
    opposite.scale.setScalar(0.48 + level * 0.08);
    plant.add(opposite);
  }
  const crown = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.16, 1),
    new THREE.MeshStandardMaterial({ color: '#a9c28a', roughness: 0.9 }),
  );
  crown.position.y = 1.76;
  plant.add(crown);
  plant.position.set(x, 0, z);
  return plant;
}

async function boot(): Promise<() => void> {
  if (!worldRoot || !uiRoot) throw new Error('Required application roots are missing.');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1220');
  scene.fog = new THREE.Fog('#0b1220', 24, 70);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
  camera.position.set(15, 13, 18);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '3D medical cannabis production facility');
  worldRoot.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.minDistance = 8;
  controls.maxDistance = 38;
  controls.maxPolarAngle = Math.PI * 0.47;

  scene.add(new THREE.HemisphereLight(0xc8ddff, 0x172235, 2.0));
  const keyLight = new THREE.DirectionalLight(0xf4f7ff, 3.0);
  keyLight.position.set(8, 16, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 18),
    new THREE.MeshStandardMaterial({ color: '#1b2939', roughness: 0.82, metalness: 0.12 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(24, 24, '#52647b', '#28384c');
  grid.position.y = 0.01;
  scene.add(grid);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#26364a', roughness: 0.7, metalness: 0.18 });
  const walls = [
    { size: [24, 4, 0.25] as const, pos: [0, 2, -9] as const },
    { size: [0.25, 4, 18] as const, pos: [-12, 2, 0] as const },
    { size: [0.25, 4, 18] as const, pos: [12, 2, 0] as const },
  ];
  for (const wall of walls) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.size[0], wall.size[1], wall.size[2]), wallMaterial);
    mesh.position.set(wall.pos[0], wall.pos[1], wall.pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const stationMaterial = new THREE.MeshStandardMaterial({ color: '#33465c', roughness: 0.45, metalness: 0.35 });
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = -7.5 + column * 5;
      const z = -4.5 + row * 4.2;
      const station = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 2.2), stationMaterial);
      station.position.set(x, 0.28, z);
      station.castShadow = true;
      station.receiveShadow = true;
      scene.add(station);

      // Fictional in-game cannabis silhouettes. They are decorative game assets, not cultivation guidance.
      for (let pod = 0; pod < 3; pod += 1) {
        const plant = createCannabisPlant(-0.7 + pod * 0.7, 0, row * 4 + column * 3 + pod);
        plant.scale.setScalar(0.62 + ((row + column + pod) % 3) * 0.05);
        station.add(plant);
      }
    }
  }

  const ui = new Application();
  await ui.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    resizeTo: uiRoot,
  });
  uiRoot.appendChild(ui.canvas);
  ui.canvas.setAttribute('aria-label', 'Management heads-up display');

  const hud = new Container();
  ui.stage.addChild(hud);

  const panel = new Graphics();
  const title = new Text({
    text: 'HERBAL LINE',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 'bold', fill: '#f0f5ff', letterSpacing: 2 },
  });
  const subtitle = new Text({
    text: 'MEDICAL CANNABIS  /  FACILITY OPERATIONS',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#8fa8c6', letterSpacing: 1.4 },
  });
  const stateLine = new Text({
    text: 'FOUNDATION BUILD  •  FICTIONAL GAME VALUES  •  VERTICAL SLICE IN PROGRESS',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#d8c89b', wordWrap: true, wordWrapWidth: 380 },
  });
  hud.addChild(panel, title, subtitle, stateLine);
  const resetCamera = (): void => {
    camera.position.set(15, 13, 18);
    controls.target.set(0, 0, 0);
    controls.update();
  };
  resetCameraButton?.addEventListener('click', resetCamera);

  const layout = (): void => {
    const width = ui.screen.width;
    panel.clear().roundRect(18, 18, Math.min(450, width - 36), 144, 12)
      .fill({ color: 0x0b1423, alpha: 0.9 })
      .stroke({ color: 0x32465f, width: 1 });
    title.position.set(36, 32);
    subtitle.position.set(37, 60);
    stateLine.style.wordWrapWidth = Math.min(390, width - 76);
    stateLine.position.set(37, 84);
    if (resetCameraButton) resetCameraButton.style.left = '37px';
  };
  layout();
  window.addEventListener('resize', layout);

  const resize = (): void => {
    const width = Math.max(1, worldRoot.clientWidth);
    const height = Math.max(1, worldRoot.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    window.removeEventListener('resize', layout);
    resetCameraButton?.removeEventListener('click', resetCamera);
    controls.dispose();
    ui.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    renderer.dispose();
    renderer.domElement.remove();
  };
}

let dispose: (() => void) | undefined;
void boot().then((cleanup) => { dispose = cleanup; }).catch(showFatalError);

if (import.meta.hot) {
  import.meta.hot.dispose(() => dispose?.());
}

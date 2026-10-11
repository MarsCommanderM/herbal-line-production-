import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';

const worldRoot = document.querySelector<HTMLDivElement>('#world-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
const fatalError = document.querySelector<HTMLDivElement>('#fatal-error');

function showFatalError(error: unknown): void {
  if (!fatalError) return;
  const detail = error instanceof Error ? error.message : String(error);
  fatalError.hidden = false;
  fatalError.textContent = `The facility view could not start. Reload the page or inspect the developer console.\n${detail}`;
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
  renderer.domElement.setAttribute('aria-label', '3D botanical operations facility');
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
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...wall.size), wallMaterial);
    mesh.position.set(...wall.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  const stationMaterial = new THREE.MeshStandardMaterial({ color: '#33465c', roughness: 0.45, metalness: 0.35 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: '#3c8f83', roughness: 0.48, metalness: 0.08 });
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = -7.5 + column * 5;
      const z = -4.5 + row * 4.2;
      const station = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 2.2), stationMaterial);
      station.position.set(x, 0.28, z);
      station.castShadow = true;
      station.receiveShadow = true;
      scene.add(station);

      // Abstract visual tokens only; these shapes encode no real-world growing parameters.
      for (let pod = 0; pod < 3; pod += 1) {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.09, 0.9, 8),
          accentMaterial,
        );
        stem.position.set(x - 0.7 + pod * 0.7, 0.95, z);
        stem.castShadow = true;
        scene.add(stem);
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 10, 8),
          new THREE.MeshStandardMaterial({ color: pod % 2 === 0 ? '#72b49a' : '#4f957f', roughness: 0.8 }),
        );
        crown.position.set(x - 0.7 + pod * 0.7, 1.45, z);
        crown.castShadow = true;
        scene.add(crown);
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
    text: 'BOTANICAL OPERATIONS  /  FACILITY VIEW',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#8fa8c6', letterSpacing: 1.4 },
  });
  const stateLine = new Text({
    text: 'ENGINE FOUNDATION  •  DOMAIN TESTS DEFINED  •  GAME LOOP NOT YET COMPLETE',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#d8c89b', wordWrap: true, wordWrapWidth: 380 },
  });
  const resetButton = new Container();
  const resetBg = new Graphics().roundRect(0, 0, 142, 34, 7).fill({ color: 0x263a52, alpha: 0.98 }).stroke({ color: 0x59718f, width: 1 });
  const resetLabel = new Text({ text: 'RESET CAMERA', style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fontWeight: 'bold', fill: '#f0f5ff', letterSpacing: 1 } });
  resetLabel.anchor.set(0.5);
  resetLabel.position.set(71, 17);
  resetButton.addChild(resetBg, resetLabel);
  resetButton.eventMode = 'static';
  resetButton.cursor = 'pointer';
  resetButton.on('pointertap', () => {
    camera.position.set(15, 13, 18);
    controls.target.set(0, 0, 0);
    controls.update();
  });
  hud.addChild(panel, title, subtitle, stateLine, resetButton);

  const layout = (): void => {
    const width = ui.screen.width;
    panel.clear().roundRect(18, 18, Math.min(450, width - 36), 144, 12)
      .fill({ color: 0x0b1423, alpha: 0.9 })
      .stroke({ color: 0x32465f, width: 1 });
    title.position.set(36, 32);
    subtitle.position.set(37, 60);
    stateLine.style.wordWrapWidth = Math.min(390, width - 76);
    stateLine.position.set(37, 84);
    resetButton.position.set(37, 116);
  };
  layout();
  ui.renderer.on('resize', layout);

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
    controls.dispose();
    ui.destroy(true);
    renderer.dispose();
    renderer.domElement.remove();
  };
}

let dispose: (() => void) | undefined;
void boot().then((cleanup) => { dispose = cleanup; }).catch(showFatalError);

if (import.meta.hot) {
  import.meta.hot.dispose(() => dispose?.());
}

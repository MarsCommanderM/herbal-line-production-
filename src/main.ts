import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId } from '../contracts/domain';
import { createInitialGameState } from './domain/initial-state';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from './domain/vertical-slice';
import { renderManagementUI } from './ui/management';
import { buildSaveEnvelope, DEFAULT_SAVE_SLOT, IndexedDbSaveRepository, restoreGameState } from './persistence/save-system';

const worldRoot = document.querySelector<HTMLDivElement>('#world-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
const fatalError = document.querySelector<HTMLDivElement>('#fatal-error');
const resetCameraButton = document.querySelector<HTMLButtonElement>('#reset-camera');
const gameFeedback = document.querySelector<HTMLParagraphElement>('#game-feedback');
const saveStatus = document.querySelector<HTMLParagraphElement>('#save-status');
const saveButton = document.querySelector<HTMLButtonElement>('#save-campaign');
const loadButton = document.querySelector<HTMLButtonElement>('#load-campaign');
const exportButton = document.querySelector<HTMLButtonElement>('#export-campaign');
const importButton = document.querySelector<HTMLButtonElement>('#import-campaign');
const importFileInput = document.querySelector<HTMLInputElement>('#import-save-file');
const saveRepository = new IndexedDbSaveRepository();
let pendingSave: Promise<void> = Promise.resolve();

let gameState = createInitialGameState();
let commandSequence = 0;
let onGameStateChanged: () => void = () => {};

function runGameCommand(type: VerticalSliceCommand['type'], payload: Record<string, unknown>): void {
  commandSequence += 1;
  const command = {
    commandId: ('ui-command-' + commandSequence) as CommandId,
    actorId: gameState.player.id,
    expectedRevision: gameState.revision,
    type,
    ...payload,
  } as VerticalSliceCommand;
  const result = applyVerticalSliceCommand(gameState, command);
  if (!result.ok) {
    if (gameFeedback) {
      gameFeedback.dataset.level = 'error';
      gameFeedback.textContent = result.error.message;
    }
    return;
  }
  gameState = result.state;
  if (gameFeedback) {
    gameFeedback.dataset.level = 'success';
    gameFeedback.textContent = gameState.logs[gameState.logs.length - 1]?.message ?? 'Aktion ausgeführt.';
  }
  renderManagementUI(gameState, runGameCommand);
  onGameStateChanged();
  void saveCurrentState(false);
}


function setSaveStatus(message: string, level: 'info' | 'success' | 'error' = 'info'): void {
  if (!saveStatus) return;
  saveStatus.dataset.level = level;
  saveStatus.textContent = message;
}

function saveCurrentState(manual: boolean): Promise<void> {
  const envelope = buildSaveEnvelope(gameState);
  pendingSave = pendingSave.then(async () => {
    await saveRepository.save(DEFAULT_SAVE_SLOT, envelope);
    if (envelope.revision === gameState.revision) {
      setSaveStatus((manual ? 'Spielstand gespeichert' : 'Autosave gespeichert') + ' · Revision ' + envelope.revision, 'success');
    }
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (envelope.revision === gameState.revision) setSaveStatus('Speichern fehlgeschlagen: ' + message, 'error');
  });
  return pendingSave;
}

async function loadCampaign(): Promise<void> {
  await pendingSave;
  const result = await saveRepository.loadWithRecovery(DEFAULT_SAVE_SLOT);
  if (result.status === 'empty') {
    setSaveStatus('Noch kein gespeicherter Spielstand vorhanden.', 'info');
    return;
  }
  const freshUi = createInitialGameState().ui;
  gameState = restoreGameState(result.envelope, freshUi);
  commandSequence = gameState.revision;
  renderManagementUI(gameState, runGameCommand);
  onGameStateChanged();
  if (result.status === 'recovered') {
    setSaveStatus(
      result.primaryRestored
        ? 'Letztes gültiges Backup wiederhergestellt · Revision ' + gameState.revision
        : 'Backup geladen, aber Wiederherstellung fehlgeschlagen · Revision ' + gameState.revision + '. Bitte erneut speichern.',
      result.primaryRestored ? 'info' : 'error',
    );
    return;
  }
  setSaveStatus('Spielstand geladen · Revision ' + gameState.revision, 'success');
}

async function exportCampaign(): Promise<void> {
  const blob = await saveRepository.exportSlot(DEFAULT_SAVE_SLOT);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'herbal-line-' + DEFAULT_SAVE_SLOT + '.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setSaveStatus('Spielstandexport gestartet.', 'success');
}

async function importCampaign(file: File): Promise<void> {
  await pendingSave;
  const metadata = await saveRepository.importSlot(DEFAULT_SAVE_SLOT, file);
  await loadCampaign();
  setSaveStatus('Import geprüft und geladen · Revision ' + metadata.revision, 'success');
}

const handleManualSave = (): void => { void saveCurrentState(true); };
const handleLoad = (): void => {
  void loadCampaign().catch((error: unknown) => setSaveStatus('Laden fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)), 'error'));
};
const handleExport = (): void => {
  void exportCampaign().catch((error: unknown) => setSaveStatus('Export fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)), 'error'));
};
const handleImportClick = (): void => { importFileInput?.click(); };
const handleImportFileChange = (): void => {
  const file = importFileInput?.files?.[0];
  if (file) void importCampaign(file).catch((error: unknown) => setSaveStatus('Import abgelehnt: ' + (error instanceof Error ? error.message : String(error)), 'error'));
  if (importFileInput) importFileInput.value = '';
};
saveButton?.addEventListener('click', handleManualSave);
loadButton?.addEventListener('click', handleLoad);
exportButton?.addEventListener('click', handleExport);
importButton?.addEventListener('click', handleImportClick);
importFileInput?.addEventListener('change', handleImportFileChange);

function showFatalError(error: unknown): void {
  if (!fatalError) return;
  const detail = error instanceof Error ? error.message : String(error);
  fatalError.hidden = false;
  fatalError.textContent = `Die Anlagenansicht konnte nicht gestartet werden. Lade die Seite neu oder prüfe die Entwicklerkonsole.\n${detail}`;
}


function createBotanicalPlant(x: number, z: number, variant: number): THREE.Group {
  const plant = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#527c63', roughness: 0.82 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? '#4f9470' : '#6ca77b',
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 1.45, 8), stemMaterial);
  stem.position.y = 0.78;
  stem.castShadow = true;
  plant.add(stem);
  for (let level = 0; level < 4; level += 1) {
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), leafMaterial);
      leaf.scale.set(0.72, 0.22, 0.42);
      leaf.position.set(side * (0.16 + level * 0.035), 0.38 + level * 0.28, 0);
      leaf.rotation.z = side * 0.38;
      leaf.rotation.y = (variant % 3) * 0.22;
      leaf.castShadow = true;
      plant.add(leaf);
    }
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), leafMaterial);
  crown.position.y = 1.55;
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

      // Fictional generic botanical silhouettes. They are decorative game assets, not real-world plant guidance.
      for (let pod = 0; pod < 3; pod += 1) {
        const plant = createBotanicalPlant(-0.7 + pod * 0.7, 0, row * 4 + column * 3 + pod);
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
    text: 'BOTANICAL OPERATIONS  /  FACILITY VIEW',
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
  onGameStateChanged = () => {
    stateLine.text = 'TAG ' + gameState.time.day + '  /  REV ' + gameState.revision + '  /  ' + gameState.compliance.licenseStatus.toUpperCase();
    layout();
  };
  try {
    const saved = await saveRepository.loadWithRecovery(DEFAULT_SAVE_SLOT);
    if (saved.status !== 'empty') {
      gameState = restoreGameState(saved.envelope, createInitialGameState().ui);
      commandSequence = gameState.revision;
      if (saved.status === 'recovered') {
        setSaveStatus(
          saved.primaryRestored
            ? 'Letztes gültiges Backup wiederhergestellt · Revision ' + gameState.revision
            : 'Backup geladen, aber Wiederherstellung fehlgeschlagen · Revision ' + gameState.revision + '. Bitte erneut speichern.',
          saved.primaryRestored ? 'info' : 'error',
        );
      } else {
        setSaveStatus('Autosave wiederhergestellt · Revision ' + gameState.revision, 'success');
      }
    } else {
      setSaveStatus('Neue Kampagne · Autosave wird nach Aktionen erstellt.', 'info');
    }
  } catch (error) {
    setSaveStatus('Vorhandener Spielstand konnte nicht geladen werden: ' + (error instanceof Error ? error.message : String(error)), 'error');
  }
  renderManagementUI(gameState, runGameCommand);
  onGameStateChanged();
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
    saveButton?.removeEventListener('click', handleManualSave);
    loadButton?.removeEventListener('click', handleLoad);
    exportButton?.removeEventListener('click', handleExport);
    importButton?.removeEventListener('click', handleImportClick);
    importFileInput?.removeEventListener('change', handleImportFileChange);
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

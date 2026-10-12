import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId } from '../contracts/domain';
import { createInitialGameState } from './domain/initial-state';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from './domain/vertical-slice';
import { renderManagementUI } from './ui/management';
import { IndexedDbSaveRepository } from './persistence/indexeddb-save-repository';
import { createSaveEnvelope, restoreGameState } from './persistence/save-codec';

const worldRoot = document.querySelector<HTMLDivElement>('#world-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
const fatalError = document.querySelector<HTMLDivElement>('#fatal-error');
const resetCameraButton = document.querySelector<HTMLButtonElement>('#reset-camera');
const saveGameButton = document.querySelector<HTMLButtonElement>('#save-game');
const loadGameButton = document.querySelector<HTMLButtonElement>('#load-game');
const exportGameButton = document.querySelector<HTMLButtonElement>('#export-game');
const importGameButton = document.querySelector<HTMLButtonElement>('#import-game');
const importSaveInput = document.querySelector<HTMLInputElement>('#import-save-file');
const saveStatus = document.querySelector<HTMLParagraphElement>('#save-status');
const gameFeedback = document.querySelector<HTMLParagraphElement>('#game-feedback');

let gameState = createInitialGameState();
let commandSequence = 0;
let persistenceBusy = false;
const saveRepository = new IndexedDbSaveRepository();
let onGameStateChanged: () => void = () => {};

function runGameCommand(type: VerticalSliceCommand['type'], payload: Record<string, unknown>): void {
  if (persistenceBusy) {
    if (gameFeedback) gameFeedback.textContent = 'Bitte warte, bis der Speichervorgang abgeschlossen ist.';
    return;
  }
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
  void autosaveCampaign();
}

function setFeedback(level: 'success' | 'error', message: string): void {
  if (!gameFeedback) return;
  gameFeedback.dataset.level = level;
  gameFeedback.textContent = message;
}

function setSaveStatus(level: 'success' | 'error' | 'info', message: string): void {
  if (!saveStatus) return;
  saveStatus.dataset.level = level;
  saveStatus.textContent = message;
}

function setPersistenceControlsDisabled(disabled: boolean): void {
  for (const control of [saveGameButton, loadGameButton, exportGameButton, importGameButton]) {
    if (control) control.disabled = disabled;
  }
}

async function writePrimarySave(envelope: Awaited<ReturnType<typeof createSaveEnvelope>>): Promise<void> {
  try {
    const previous = await saveRepository.load('campaign-01');
    if (previous) await saveRepository.save('campaign-01-backup', previous);
  } catch {
    // A corrupt primary save must never overwrite the last known-good backup.
  }
  await saveRepository.save('campaign-01', envelope);
}

async function readBestAvailableSave(): Promise<{ envelope: NonNullable<Awaited<ReturnType<typeof saveRepository.load>>>; recoveredFromBackup: boolean } | null> {
  let primaryError: unknown;
  try {
    const primary = await saveRepository.load('campaign-01');
    if (primary) return { envelope: primary, recoveredFromBackup: false };
  } catch (error) {
    primaryError = error;
  }

  const backup = await saveRepository.load('campaign-01-backup');
  if (backup) return { envelope: backup, recoveredFromBackup: true };
  if (primaryError) throw primaryError;
  return null;
}

async function autosaveCampaign(): Promise<void> {
  if (persistenceBusy) return;
  persistenceBusy = true;
  setPersistenceControlsDisabled(true);
  const revision = gameState.revision;
  try {
    const envelope = await createSaveEnvelope(gameState);
    await writePrimarySave(envelope);
    if (gameState.revision === revision) setSaveStatus('success', 'Autosave gespeichert · Revision ' + revision + '.');
  } catch (error) {
    if (gameState.revision === revision) setSaveStatus('error', 'Autosave fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
  } finally {
    persistenceBusy = false;
    setPersistenceControlsDisabled(false);
  }
}

async function saveCampaign(): Promise<void> {
  if (persistenceBusy) return;
  persistenceBusy = true;
  setPersistenceControlsDisabled(true);
  try {
    const envelope = await createSaveEnvelope(gameState);
    const metadata = await writePrimarySave(envelope).then(async () => saveRepository.load('campaign-01')).then((saved) => {
      if (!saved) throw new Error('Gespeicherter Datensatz ist nach dem Schreiben nicht lesbar.');
      return { revision: saved.revision, byteLength: JSON.stringify(saved).length };
    });
    setFeedback('success', 'Spielstand gespeichert · Revision ' + metadata.revision + ' · ' + metadata.byteLength + ' Byte.');
    setSaveStatus('success', 'Manueller Spielstand gespeichert · Revision ' + metadata.revision + '.');
  } catch (error) {
    setFeedback('error', 'Speichern fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
    setSaveStatus('error', 'Speichern fehlgeschlagen.');
  } finally {
    persistenceBusy = false;
    setPersistenceControlsDisabled(false);
  }
}

async function applyLoadedSave(): Promise<void> {
  const result = await readBestAvailableSave();
  if (!result) {
    setFeedback('error', 'Es ist noch kein gespeicherter Spielstand vorhanden.');
    setSaveStatus('info', 'Kein Spielstand gespeichert.');
    return;
  }
  gameState = restoreGameState(result.envelope);
  commandSequence = gameState.revision;
  renderManagementUI(gameState, runGameCommand);
  onGameStateChanged();
  if (result.recoveredFromBackup) {
    setFeedback('success', 'Wiederherstellung aus Backup · Revision ' + gameState.revision + '.');
    setSaveStatus('error', 'Primärer Spielstand ungültig; letztes gültiges Backup wurde geladen.');
  } else {
    setFeedback('success', 'Spielstand geladen · Revision ' + gameState.revision + '.');
    setSaveStatus('success', 'Spielstand geladen · Revision ' + gameState.revision + '.');
  }
}

async function loadCampaign(): Promise<void> {
  if (persistenceBusy) return;
  persistenceBusy = true;
  setPersistenceControlsDisabled(true);
  try {
    await applyLoadedSave();
  } catch (error) {
    setFeedback('error', 'Laden fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
    setSaveStatus('error', 'Laden fehlgeschlagen; vorhandene Save-Dateien wurden nicht verändert.');
  } finally {
    persistenceBusy = false;
    setPersistenceControlsDisabled(false);
  }
}

async function exportCampaign(): Promise<void> {
  try {
    const blob = await saveRepository.exportSlot('campaign-01');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'herbal-line-campaign-01.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveStatus('success', 'Spielstandexport gestartet.');
  } catch (error) {
    setSaveStatus('error', 'Export fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
  }
}

async function importCampaign(file: File): Promise<void> {
  if (persistenceBusy) return;
  persistenceBusy = true;
  setPersistenceControlsDisabled(true);
  try {
    const current = await saveRepository.load('campaign-01').catch(() => null);
    if (current) await saveRepository.save('campaign-01-backup', current);
    const metadata = await saveRepository.importSlot('campaign-01', file);
    const imported = await saveRepository.load('campaign-01');
    if (!imported) throw new Error('Import wurde nicht dauerhaft gespeichert.');
    gameState = restoreGameState(imported);
    commandSequence = gameState.revision;
    renderManagementUI(gameState, runGameCommand);
    onGameStateChanged();
    setFeedback('success', 'Spielstand importiert · Revision ' + metadata.revision + '.');
    setSaveStatus('success', 'Import validiert, gespeichert und geladen.');
  } catch (error) {
    setFeedback('error', 'Import abgelehnt: ' + (error instanceof Error ? error.message : String(error)));
    setSaveStatus('error', 'Import fehlgeschlagen; vorheriger gültiger Spielstand bleibt erhalten.');
  } finally {
    persistenceBusy = false;
    setPersistenceControlsDisabled(false);
    if (importSaveInput) importSaveInput.value = '';
  }
}

const handleImportClick = (): void => { importSaveInput?.click(); };
const handleImportChange = (): void => {
  const file = importSaveInput?.files?.[0];
  if (file) void importCampaign(file);
};

function showFatalError(error: unknown): void {
  if (!fatalError) return;
  const detail = error instanceof Error ? error.message : String(error);
  fatalError.hidden = false;
  fatalError.textContent = `Die 3D-Ansicht ist nicht verfügbar. Die Management-Oberfläche bleibt nutzbar. Prüfe die WebGL-Unterstützung oder lade die Seite neu.\n${detail}`;
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
  // Keep the playable management UI independent from WebGL/Pixi initialization.
  // Graphics failures must not prevent campaign controls and persistence from starting.
  try {
    const restored = await readBestAvailableSave();
    if (restored) {
      gameState = restoreGameState(restored.envelope);
      commandSequence = gameState.revision;
      setSaveStatus(restored.recoveredFromBackup ? 'error' : 'success', restored.recoveredFromBackup
        ? 'Autosave beschädigt; letztes gültiges Backup wiederhergestellt.'
        : 'Autosave wiederhergestellt · Revision ' + gameState.revision + '.');
    } else {
      setSaveStatus('info', 'Neue Kampagne · Autosave nach jeder erfolgreichen Aktion.');
    }
  } catch (error) {
    setSaveStatus('error', 'Spielstand konnte nicht automatisch geladen werden: ' + (error instanceof Error ? error.message : String(error)));
  }
  // Bind static controls before rendering the ready state so no visible control can race its handler.
  saveGameButton?.addEventListener('click', saveCampaign);
  loadGameButton?.addEventListener('click', loadCampaign);
  exportGameButton?.addEventListener('click', exportCampaign);
  importGameButton?.addEventListener('click', handleImportClick);
  importSaveInput?.addEventListener('change', handleImportChange);
  renderManagementUI(gameState, runGameCommand);

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
    saveGameButton?.removeEventListener('click', saveCampaign);
    loadGameButton?.removeEventListener('click', loadCampaign);
    exportGameButton?.removeEventListener('click', exportCampaign);
    importGameButton?.removeEventListener('click', handleImportClick);
    importSaveInput?.removeEventListener('change', handleImportChange);
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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId, EntityId, GameState, PlantCareState } from '../contracts/domain';
import { createInitialGameState, createNewCampaignGameState } from './domain/initial-state';
import { GAME_BALANCE } from './domain/balance';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from './domain/vertical-slice';
import { renderManagementUI } from './ui/management';
import { IndexedDbSaveRepository } from './persistence/indexeddb-save-repository';
import { createSaveEnvelope, restoreGameState } from './persistence/save-codec';
import { getPlantCareState } from './domain/plant-care';
import { GAMEPAD_BUTTON, readGamepadFrame } from './ui/gamepad';

const worldRoot = document.querySelector<HTMLDivElement>('#world-root');
const uiRoot = document.querySelector<HTMLDivElement>('#ui-root');
const fatalError = document.querySelector<HTMLDivElement>('#fatal-error');
const resetCameraButton = document.querySelector<HTMLButtonElement>('#reset-camera');
const toggleGamePanelButton = document.querySelector<HTMLButtonElement>('#toggle-game-panel');
const closeGamePanelButton = document.querySelector<HTMLButtonElement>('#close-game-panel');
const gamePanel = document.querySelector<HTMLElement>('#game-panel');
const gamepadHint = document.querySelector<HTMLButtonElement>('#gamepad-hint');

function setGamePanelOpen(open: boolean): void {
  if (!gamePanel || !toggleGamePanelButton) return;
  gamePanel.hidden = !open;
  gamePanel.dataset.open = String(open);
  toggleGamePanelButton.setAttribute('aria-expanded', String(open));
  toggleGamePanelButton.setAttribute('aria-label', open ? 'Management-Menü geöffnet' : 'Management öffnen');
  toggleGamePanelButton.title = open ? 'Management-Menü geöffnet' : 'Management öffnen';
}

setGamePanelOpen(!window.matchMedia('(max-width: 760px)').matches);
toggleGamePanelButton?.addEventListener('click', () => setGamePanelOpen(Boolean(gamePanel?.hidden)));
closeGamePanelButton?.addEventListener('click', () => {
  setGamePanelOpen(false);
  toggleGamePanelButton?.focus({ preventScroll: true });
});
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
let persistenceIdlePromise: Promise<void> = Promise.resolve();
let resolvePersistenceIdle: (() => void) | null = null;
const saveRepository = new IndexedDbSaveRepository();
let onGameStateChanged: () => void = () => {};

function beginPersistence(): void {
  persistenceBusy = true;
  persistenceIdlePromise = new Promise<void>((resolve) => {
    resolvePersistenceIdle = resolve;
  });
  setPersistenceControlsDisabled(true);
}

function finishPersistence(): void {
  persistenceBusy = false;
  setPersistenceControlsDisabled(false);
  const resolve = resolvePersistenceIdle;
  resolvePersistenceIdle = null;
  resolve?.();
}

async function waitForPersistenceIdle(): Promise<void> {
  while (persistenceBusy) await persistenceIdlePromise;
}

async function runGameCommand(type: VerticalSliceCommand['type'], payload: Record<string, unknown>): Promise<void> {
  // Commands wait for a consistent save snapshot instead of being rejected during autosave.
  await waitForPersistenceIdle();
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
  renderManagementUI(gameState, runGameCommand, selectPlant);
  onGameStateChanged();
  void autosaveCampaign();
}

function selectPlant(plantId: EntityId): void {
  const plant = gameState.plants.find((item) => item.id === plantId);
  if (!plant) return;
  gameState = { ...gameState, ui: { ...gameState.ui, selectedEntityId: plantId } };
  renderManagementUI(gameState, runGameCommand, selectPlant);
  onGameStateChanged();
  setFeedback('success', 'Pflanze ausgewählt: ' + plantId + '. Pflegeaktionen werden direkt an diesem Pflanzenobjekt simuliert.');
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
  beginPersistence();
  const revision = gameState.revision;
  let status: { level: 'success' | 'error'; message: string } | null = null;
  try {
    const envelope = await createSaveEnvelope(gameState);
    await writePrimarySave(envelope);
    if (gameState.revision === revision) {
      status = { level: 'success', message: 'Autosave gespeichert · Revision ' + revision + '.' };
      const previousCount = Number(document.documentElement.dataset.autosaveCount ?? '0');
      document.documentElement.dataset.autosaveCount = String(Number.isSafeInteger(previousCount) ? previousCount + 1 : 1);
    }
  } catch (error) {
    if (gameState.revision === revision) {
      status = { level: 'error', message: 'Autosave fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)) };
    }
  } finally {
    finishPersistence();
  }
  // Completion feedback is emitted only after the controls are usable again.
  if (status) setSaveStatus(status.level, status.message);
}

async function saveCampaign(): Promise<void> {
  await waitForPersistenceIdle();
  beginPersistence();
  let feedback: { level: 'success' | 'error'; message: string } | null = null;
  let status: { level: 'success' | 'error'; message: string } | null = null;
  try {
    const envelope = await createSaveEnvelope(gameState);
    const metadata = await writePrimarySave(envelope).then(async () => saveRepository.load('campaign-01')).then((saved) => {
      if (!saved) throw new Error('Gespeicherter Datensatz ist nach dem Schreiben nicht lesbar.');
      return { revision: saved.revision, byteLength: JSON.stringify(saved).length };
    });
    feedback = { level: 'success', message: 'Spielstand gespeichert · Revision ' + metadata.revision + ' · ' + metadata.byteLength + ' Byte.' };
    status = { level: 'success', message: 'Manueller Spielstand gespeichert · Revision ' + metadata.revision + '.' };
  } catch (error) {
    feedback = { level: 'error', message: 'Speichern fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)) };
    status = { level: 'error', message: 'Speichern fehlgeschlagen.' };
  } finally {
    finishPersistence();
  }
  // Completion feedback is emitted only after the controls are usable again.
  if (feedback) setFeedback(feedback.level, feedback.message);
  if (status) setSaveStatus(status.level, status.message);
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
  renderManagementUI(gameState, runGameCommand, selectPlant);
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
  await waitForPersistenceIdle();
  beginPersistence();
  try {
    await applyLoadedSave();
  } catch (error) {
    setFeedback('error', 'Laden fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
    setSaveStatus('error', 'Laden fehlgeschlagen; vorhandene Save-Dateien wurden nicht verändert.');
  } finally {
    finishPersistence();
  }
}

async function exportCampaign(): Promise<void> {
  try {
    const blob = await saveRepository.exportSlot('campaign-01');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dr-green-dump-dopefarm-campaign-01.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaveStatus('success', 'Spielstandexport gestartet.');
  } catch (error) {
    setSaveStatus('error', 'Export fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
  }
}

async function importCampaign(file: File): Promise<void> {
  // A file selection can race the tail of an autosave even after the picker opened.
  // Queue the import instead of silently discarding it while persistence is busy.
  await waitForPersistenceIdle();
  beginPersistence();
  try {
    const current = await saveRepository.load('campaign-01').catch(() => null);
    if (current) await saveRepository.save('campaign-01-backup', current);
    const metadata = await saveRepository.importSlot('campaign-01', file);
    const imported = await saveRepository.load('campaign-01');
    if (!imported) throw new Error('Import wurde nicht dauerhaft gespeichert.');
    gameState = restoreGameState(imported);
    commandSequence = gameState.revision;
    renderManagementUI(gameState, runGameCommand, selectPlant);
    onGameStateChanged();
    setFeedback('success', 'Spielstand importiert · Revision ' + metadata.revision + '.');
    setSaveStatus('success', 'Import validiert, gespeichert und geladen.');
  } catch (error) {
    setFeedback('error', 'Import abgelehnt: ' + (error instanceof Error ? error.message : String(error)));
    setSaveStatus('error', 'Import fehlgeschlagen; vorheriger gültiger Spielstand bleibt erhalten.');
  } finally {
    finishPersistence();
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


function createCannabisPlant(x: number, z: number, variant: number): THREE.Group {
  const plant = new THREE.Group();
  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#527c55', roughness: 0.86 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? '#286b3b' : '#3d824b',
    roughness: 0.76,
    side: THREE.DoubleSide,
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.055, 1.55, 8), stemMaterial);
  stem.position.y = 0.8;
  stem.castShadow = true;
  plant.add(stem);

  // Shared, beveled leaflet silhouette with visible serrations and a raised midrib.
  // This is an original runtime mesh, not an unlicensed imported asset.
  const leafletShape = new THREE.Shape();
  leafletShape.moveTo(0, 0);
  leafletShape.lineTo(-0.035, 0.08);
  leafletShape.lineTo(-0.072, 0.115);
  leafletShape.lineTo(-0.043, 0.145);
  leafletShape.lineTo(-0.092, 0.205);
  leafletShape.lineTo(-0.055, 0.225);
  leafletShape.lineTo(-0.1, 0.3);
  leafletShape.lineTo(-0.059, 0.322);
  leafletShape.lineTo(-0.077, 0.39);
  leafletShape.lineTo(-0.035, 0.41);
  leafletShape.lineTo(0, 0.58);
  leafletShape.lineTo(0.035, 0.41);
  leafletShape.lineTo(0.077, 0.39);
  leafletShape.lineTo(0.059, 0.322);
  leafletShape.lineTo(0.1, 0.3);
  leafletShape.lineTo(0.055, 0.225);
  leafletShape.lineTo(0.092, 0.205);
  leafletShape.lineTo(0.043, 0.145);
  leafletShape.lineTo(0.072, 0.115);
  leafletShape.lineTo(0.035, 0.08);
  leafletShape.closePath();
  const leafletGeometry = new THREE.ExtrudeGeometry(leafletShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.003,
  });
  leafletGeometry.translate(0, 0, -0.006);
  const veinMaterial = new THREE.LineBasicMaterial({
    color: '#8fbd7c',
    transparent: true,
    opacity: 0.62,
  });
  const veinGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0.009),
    new THREE.Vector3(0, 0.53, 0.009),
  ]);
  const attachLeafVein = (leaflet: THREE.Mesh): void => {
    leaflet.add(new THREE.Line(veinGeometry, veinMaterial));
  };
  for (let level = 0; level < 5; level += 1) {
    const y = 0.34 + level * 0.235;
    for (const side of [-1, 1]) {
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.34, 5), stemMaterial);
      branch.position.set(side * (0.11 + level * 0.018), y, 0);
      branch.rotation.z = side * 0.82;
      plant.add(branch);
      const fan = new THREE.Group();
      fan.position.set(side * (0.2 + level * 0.018), y + 0.07, 0);
      fan.rotation.y = (variant % 4) * 0.24 + level * 0.31;
      const leafletCount = 5 + (level % 3);
      for (let index = 0; index < leafletCount; index += 1) {
        const angle = (index / (leafletCount - 1) - 0.5) * 1.9;
        const leaflet = new THREE.Mesh(leafletGeometry, leafMaterial);
        leaflet.position.set(Math.sin(angle) * 0.23, Math.cos(angle) * 0.08, Math.cos(angle) * 0.045);
        leaflet.rotation.z = -angle * 0.9;
        leaflet.rotation.x = -0.2 - Math.abs(angle) * 0.22;
        leaflet.userData.baseRotation = leaflet.rotation.clone();
        leaflet.scale.set(0.62 + (1 - Math.abs(angle)) * 0.3, 0.68 + (1 - Math.abs(angle)) * 0.2, 0.6);
        leaflet.userData.isCannabisLeaflet = true;
        leaflet.userData.baseScale = leaflet.scale.clone();
        leaflet.castShadow = true;
        attachLeafVein(leaflet);
        fan.add(leaflet);
      }
      plant.add(fan);
    }
  }
  const crown = new THREE.Group();
  for (let index = 0; index < 7; index += 1) {
    const leaflet = new THREE.Mesh(leafletGeometry, leafMaterial);
    leaflet.position.set(Math.sin(index * Math.PI * 2 / 7) * 0.08, 1.53, Math.cos(index * Math.PI * 2 / 7) * 0.08);
    leaflet.rotation.z = -Math.sin(index * Math.PI * 2 / 7) * 0.55;
    leaflet.rotation.x = -0.28;
    leaflet.userData.baseRotation = leaflet.rotation.clone();
    leaflet.scale.set(0.72, 0.66, 0.65);
    leaflet.userData.isCannabisLeaflet = true;
    leaflet.userData.baseScale = leaflet.scale.clone();
    leaflet.castShadow = true;
    attachLeafVein(leaflet);
    crown.add(leaflet);
  }
  plant.add(crown);
  const potMaterial = new THREE.MeshStandardMaterial({ color: '#8a795f', roughness: 0.9 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.3, 10), potMaterial);
  pot.name = 'plant-container';
  pot.userData.isPlantContainer = true;
  pot.position.y = 0.15;
  pot.castShadow = true;
  plant.add(pot);
  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#3e4b42', roughness: 1 });
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), soilMaterial);
  soil.name = 'plant-pot-soil';
  soil.userData.isPlantContainer = true;
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.305;
  plant.add(soil);
  const careRingMaterial = new THREE.MeshStandardMaterial({ color: '#51d6ad', emissive: '#17352e', side: THREE.DoubleSide, roughness: 0.6 });
  const careRing = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.3, 24), careRingMaterial);
  careRing.rotation.x = -Math.PI / 2;
  careRing.position.y = 0.035;
  careRing.visible = false;
  plant.add(careRing);
  plant.userData.soilMaterial = soilMaterial;
  plant.userData.careRingMaterial = careRingMaterial;
  plant.userData.careRing = careRing;
  plant.position.set(x, 0, z);
  return plant;
}

function startAutosaveTimer(): void {
  if (autosaveTimer !== undefined) return;
  document.documentElement.dataset.autosaveIntervalMs = String(GAME_BALANCE.autosaveIntervalMs);
  autosaveTimer = window.setInterval(() => {
    void autosaveCampaign();
  }, GAME_BALANCE.autosaveIntervalMs);
}

async function boot(): Promise<() => void> {
  if (!worldRoot || !uiRoot) throw new Error('Required application roots are missing.');
  // Bind persistence controls before the first asynchronous save lookup. Keep them disabled
  // until restore completes so an early click cannot race past an unbound handler or stale state.
  setPersistenceControlsDisabled(true);
  saveGameButton?.addEventListener('click', saveCampaign);
  loadGameButton?.addEventListener('click', loadCampaign);
  exportGameButton?.addEventListener('click', exportCampaign);
  importGameButton?.addEventListener('click', handleImportClick);
  importSaveInput?.addEventListener('change', handleImportChange);
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
      gameState = createNewCampaignGameState();
      setSaveStatus('info', 'Neue Kampagne · Beginne mit Saatgutannahme und Herkunftsprüfung. Autosave nach jeder erfolgreichen Aktion.');
    }
  } catch (error) {
    setSaveStatus('error', 'Spielstand konnte nicht automatisch geladen werden: ' + (error instanceof Error ? error.message : String(error)));
  }
  setPersistenceControlsDisabled(false);
  renderManagementUI(gameState, runGameCommand, selectPlant);
  // Persistence must continue even when the subsequent WebGL setup fails.
  startAutosaveTimer();

  const scene = new THREE.Scene();
  const plantVisuals = new Map<string, THREE.Group[]>();
  const cuttingVisuals = new Map<string, THREE.Group[]>();
  scene.background = new THREE.Color('#c4d0cd');
  scene.fog = new THREE.Fog('#c4d0cd', 82, 142);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
  camera.position.set(15, 13, 18);
  camera.lookAt(0, 0, 0);

  const automatedRenderProfile = window.navigator.webdriver === true;
  const renderer = new THREE.WebGLRenderer({ antialias: !automatedRenderProfile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, automatedRenderProfile ? 0.5 : 2));
  renderer.shadowMap.enabled = !automatedRenderProfile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Third-person game world. Gamepad: left stick move, right stick camera, A select or activate, B reset camera, X/Y change nearby plant, D-pad navigate controls.');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('data-gamepad-support', 'true');
  worldRoot.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.minDistance = 3.5;
  controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.enablePan = false;

  // A visible, controllable third-person avatar. Geometry is intentionally a temporary
  // procedural placeholder; production character art and animation remain a separate asset task.
  const avatar = new THREE.Group();
  avatar.name = 'third-person-player';
  const startsWithExistingPlants = gameState.plants.length > 0;
  avatar.position.set(startsWithExistingPlants ? -7.5 : -17.2, 0, startsWithExistingPlants ? -7.5 : -22);
  avatar.rotation.y = 0;
  camera.position.set(avatar.position.x, avatar.position.y + 3.2, avatar.position.z + 6);
  controls.target.copy(avatar.position);
  camera.lookAt(controls.target);
  avatar.userData.isPlayerAvatar = true;
  const workShirt = new THREE.MeshStandardMaterial({ color: '#92958f', roughness: 0.88 });
  const workVest = new THREE.MeshStandardMaterial({ color: '#707671', roughness: 0.82 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#394a61', roughness: 0.92 });
  const bootMaterial = new THREE.MeshStandardMaterial({ color: '#302b27', roughness: 0.94 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#c99573', roughness: 0.78 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#302b27', roughness: 0.92 });
  const seamMaterial = new THREE.MeshStandardMaterial({ color: '#b4b5a4', roughness: 0.82 });
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: '#e9e5dc', roughness: 0.44 });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: '#211e1b', roughness: 0.38 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.55, 8, 16), workShirt);
  torso.position.y = 1.23; torso.castShadow = true; torso.receiveShadow = true; avatar.add(torso);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.16, 14), skinMaterial);
  neck.position.y = 1.63; neck.castShadow = true; avatar.add(neck);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.085), workVest);
  vest.position.set(0, 1.29, -0.19); vest.castShadow = true; avatar.add(vest);
  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.012), seamMaterial);
  zipper.position.set(0, 1.3, -0.239); avatar.add(zipper);
  for (const pocketX of [-0.12, 0.12]) {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.12, 0.018), workVest);
    pocket.position.set(pocketX, 1.16, -0.244); pocket.castShadow = true; avatar.add(pocket);
  }
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.055, 18), bootMaterial);
  belt.position.y = 0.91; avatar.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 28, 20), skinMaterial);
  head.position.set(0, 1.84, -0.015); head.castShadow = true; head.receiveShadow = true; avatar.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.196, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.47), hairMaterial);
  hair.position.set(0, 1.91, 0.005); hair.castShadow = true; avatar.add(hair);
  const capMaterial = new THREE.MeshStandardMaterial({ color: '#282d2b', roughness: 0.94 });
  const capCrown = new THREE.Mesh(new THREE.SphereGeometry(0.205, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.53), capMaterial);
  capCrown.position.set(0, 1.965, 0.01);
  capCrown.castShadow = true;
  avatar.add(capCrown);
  const capPeak = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.026, 0.145), capMaterial);
  capPeak.position.set(0, 1.93, -0.145);
  capPeak.rotation.x = -0.06;
  capPeak.castShadow = true;
  avatar.add(capPeak);
  for (const earX of [-0.181, 0.181]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 10), skinMaterial);
    ear.position.set(earX, 1.82, -0.005); avatar.add(ear);
  }
  for (const eyeX of [-0.064, 0.064]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.031, 12, 10), eyeWhiteMaterial);
    eyeWhite.position.set(eyeX, 1.855, -0.166); avatar.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), pupilMaterial);
    pupil.position.set(eyeX, 1.854, -0.192); avatar.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.012, 0.02), hairMaterial);
    brow.position.set(eyeX, 1.9, -0.163); brow.rotation.z = eyeX < 0 ? 0.08 : -0.08; avatar.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), skinMaterial);
  nose.position.set(0, 1.81, -0.204); avatar.add(nose);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  for (const [leg, x] of [[leftLeg, -0.13], [rightLeg, 0.13]] as const) {
    leg.position.set(x, 0.83, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.29, 6, 12), trousers);
    thigh.position.y = -0.19; thigh.castShadow = true; thigh.receiveShadow = true; leg.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.097, 12, 10), trousers);
    knee.position.set(0, -0.4, -0.008); leg.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.27, 6, 12), trousers);
    shin.position.y = -0.48; shin.castShadow = true; leg.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.28), bootMaterial);
    boot.position.set(0, -0.7, -0.045); boot.castShadow = true; leg.add(boot);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.025, 0.285), seamMaterial);
    sole.position.set(0, -0.765, -0.045); leg.add(sole);
    avatar.add(leg);
  }
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  for (const [arm, x] of [[leftArm, -0.29], [rightArm, 0.29]] as const) {
    arm.position.set(x, 1.43, 0); arm.rotation.z = x < 0 ? -0.08 : 0.08;
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.28, 6, 12), workShirt);
    sleeve.position.set(0, -0.18, 0); sleeve.castShadow = true; arm.add(sleeve);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.26, 6, 12), workShirt);
    forearm.position.set(0, -0.405, -0.005); forearm.castShadow = true; arm.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), skinMaterial);
    hand.position.set(0, -0.61, -0.008); hand.castShadow = true; arm.add(hand);
    avatar.add(arm);
  }
  scene.add(avatar);

  const movementKeys = new Set<string>();
  const movementObstacles: THREE.Box3[] = [];
  const registerMovementObstacle = (mesh: THREE.Mesh): void => {
    movementObstacles.push(new THREE.Box3().setFromObject(mesh));
  };
  const cameraTargetOffset = new THREE.Vector3(0, 0.6, 0);
  const previousAvatarPosition = avatar.position.clone();
  const movementForward = new THREE.Vector3();
  const movementRight = new THREE.Vector3();
  const movementVector = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const walkClock = new THREE.Clock();
  let walkPhase = 0;
  let lastAutomatedRenderMs = 0;
  const pendingGamepadButtonPresses = new Set<number>();
  renderer.domElement.dataset.thirdPerson = 'true';
  renderer.domElement.dataset.playerX = avatar.position.x.toFixed(3);
  renderer.domElement.dataset.playerZ = avatar.position.z.toFixed(3);
  renderer.domElement.dataset.cameraTargetX = avatar.position.x.toFixed(3);
  renderer.domElement.dataset.cameraTargetZ = avatar.position.z.toFixed(3);
  const spatialRoomZones = [
    { id: 'seed-intake', minX: -31, maxX: -15, minZ: -29, maxZ: -15 },
    { id: 'greenhouse', minX: -10, maxX: 10, minZ: -29, maxZ: -15 },
    { id: 'utilities', minX: 15, maxX: 31, minZ: -29, maxZ: -15 },
    { id: 'seed-storage', minX: -31, maxX: -15, minZ: -8, maxZ: 8 },
    { id: 'production', minX: -12, maxX: 12, minZ: -9, maxZ: 9 },
    { id: 'processing', minX: 15, maxX: 31, minZ: -8, maxZ: 8 },
    { id: 'office', minX: -31, maxX: -15, minZ: 14, maxZ: 28 },
    { id: 'quality', minX: -8, maxX: 8, minZ: 14, maxZ: 28 },
    { id: 'released-storage', minX: 15, maxX: 23, minZ: 14, maxZ: 28 },
    { id: 'dispatch', minX: 23, maxX: 31, minZ: 14, maxZ: 28 },
  ] as const;
  const identifySpatialRoom = (position: THREE.Vector3): string =>
    spatialRoomZones.find((zone) =>
      position.x >= zone.minX && position.x <= zone.maxX &&
      position.z >= zone.minZ && position.z <= zone.maxZ,
    )?.id ?? 'corridor';
  const spatialRoomLabels: Record<string, string> = {
    'seed-intake': 'WARENEINGANG & SAMENARCHIV',
    greenhouse: 'GEWÄCHSHAUS & ANZUCHT',
    utilities: 'KLIMA & GEBÄUDETECHNIK',
    'seed-storage': 'SAATGUTLAGER & QUARANTÄNE',
    production: 'INDOOR-PFLANZENPRODUKTION',
    processing: 'VERARBEITUNG',
    office: 'BÜRO & SCHICHTLEITUNG',
    quality: 'QUALITÄTSSICHERUNG',
    'released-storage': 'FREIGEGEBENES LAGER',
    dispatch: 'VERSAND & APOTHEKENÜBERGABE',
    corridor: 'VERBINDUNGSGANG',
  };
  renderer.domElement.dataset.roomId = identifySpatialRoom(avatar.position);
  const initialCameraOffset = new THREE.Vector3(0, 3.2, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), avatar.rotation.y);
  camera.position.copy(avatar.position).add(initialCameraOffset);
  controls.target.copy(avatar.position).add(cameraTargetOffset);
  controls.update();

  const onMovementKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
      event.preventDefault();
      movementKeys.add(key);
    }
  };
  const onMovementKeyUp = (event: KeyboardEvent): void => {
    movementKeys.delete(event.key.toLowerCase());
  }
  const clearMovementKeys = (): void => movementKeys.clear();
  window.addEventListener('keydown', onMovementKeyDown);
  window.addEventListener('keyup', onMovementKeyUp);
  window.addEventListener('blur', clearMovementKeys);

  scene.add(new THREE.HemisphereLight(0xeaf1e5, 0x596251, 2.15));
  scene.add(new THREE.AmbientLight(0xdfe6d8, automatedRenderProfile ? 0.25 : 0.38));
  const keyLight = new THREE.DirectionalLight(0xf4f7ff, 3.0);
  keyLight.position.set(-18, 24, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 110;
  keyLight.shadow.camera.left = -42;
  keyLight.shadow.camera.right = 42;
  keyLight.shadow.camera.top = 38;
  keyLight.shadow.camera.bottom = -38;
  keyLight.shadow.radius = 3;
  keyLight.shadow.bias = -0.00012;
  scene.add(keyLight);
  const daylightFill = new THREE.DirectionalLight(0xf6e8ce, 0.92);
  daylightFill.position.set(16, 10, -15);
  scene.add(daylightFill);

  const tileTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas texture context unavailable.');
    context.fillStyle = '#4c5151';
    context.fillRect(0, 0, 512, 512);
    const tile = 64;
    for (let y = 0; y < 512; y += tile) {
      for (let x = 0; x < 512; x += tile) {
        const shade = 68 + ((x * 17 + y * 31) % 17);
        context.fillStyle = 'rgb(' + shade + ',' + (shade + 3) + ',' + (shade + 2) + ')';
        context.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        context.fillStyle = 'rgba(255,255,255,0.055)';
        context.fillRect(x + 4, y + 4, tile - 8, 2);
        context.fillStyle = 'rgba(0,0,0,0.13)';
        context.fillRect(x + 3, y + tile - 5, tile - 6, 2);
      }
    }
    for (let index = 0; index < 4800; index += 1) {
      const x = (index * 73 + 19) % 512;
      const y = (index * 151 + 37) % 512;
      const alpha = 0.025 + ((index * 7) % 10) / 250;
      context.fillStyle = index % 2 ? 'rgba(225,229,216,' + alpha + ')' : 'rgba(8,12,13,' + alpha + ')';
      context.fillRect(x, y, 1 + (index % 3), 1 + (index % 2));
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();
  const concreteTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Concrete texture context unavailable.');
    const gradient = context.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#777c78');
    gradient.addColorStop(0.45, '#656b68');
    gradient.addColorStop(1, '#555c59');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    for (let index = 0; index < 9000; index += 1) {
      const x = (index * 97 + 23) % 512;
      const y = (index * 193 + 41) % 512;
      const alpha = 0.018 + ((index * 13) % 11) / 350;
      context.fillStyle = index % 2 ? 'rgba(238,238,223,' + alpha + ')' : 'rgba(8,13,12,' + alpha + ')';
      context.fillRect(x, y, 1 + index % 2, 1 + (index % 3 === 0 ? 1 : 0));
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18, 16);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();
  const masonryTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Masonry texture context unavailable.');
    context.fillStyle = '#68716a';
    context.fillRect(0, 0, 512, 512);
    const blockW = 96;
    const blockH = 38;
    for (let row = 0; row < 14; row += 1) {
      const offset = row % 2 ? -blockW / 2 : 0;
      for (let column = -1; column < 7; column += 1) {
        const x = column * blockW + offset;
        const y = row * blockH;
        const shade = 108 + ((row * 13 + column * 19 + 80) % 29);
        context.fillStyle = 'rgb(' + (shade - 2) + ',' + (shade + 2) + ',' + (shade + 1) + ')';
        context.fillRect(x + 2, y + 2, blockW - 4, blockH - 4);
        context.fillStyle = 'rgba(255,255,255,0.045)';
        context.fillRect(x + 4, y + 4, blockW - 8, 2);
        context.fillStyle = 'rgba(0,0,0,0.16)';
        context.fillRect(x + 3, y + blockH - 5, blockW - 6, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();

  const greenhouseFabricTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Greenhouse fabric texture context unavailable.');
    const gradient = context.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#f5f0e1');
    gradient.addColorStop(0.52, '#e8e2d3');
    gradient.addColorStop(1, '#d9d6c9');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 512; row += 4) {
      context.fillStyle = row % 8 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(89,97,84,0.035)';
      context.fillRect(0, row, 512, 1);
    }
    for (let column = 0; column < 512; column += 5) {
      context.fillStyle = column % 20 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(67,78,68,0.025)';
      context.fillRect(column, 0, 1, 512);
    }
    // Sparse weave specks, with deterministic coordinates and no external texture dependency.
    for (let index = 0; index < 3400; index += 1) {
      const x = (index * 73 + 17) % 512;
      const y = (index * 151 + 41) % 512;
      const alpha = 0.018 + ((index * 11) % 8) / 360;
      context.fillStyle = index % 2 ? 'rgba(255,255,255,' + alpha + ')' : 'rgba(83,90,78,' + alpha + ')';
      context.fillRect(x, y, 1 + (index % 2), 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();

  const greenhouseEarthTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Greenhouse earth texture context unavailable.');
    context.fillStyle = '#40382a';
    context.fillRect(0, 0, 512, 512);
    for (let index = 0; index < 15000; index += 1) {
      const x = (index * 97 + 19) % 512;
      const y = (index * 193 + 29) % 512;
      const alpha = 0.025 + ((index * 5) % 12) / 170;
      context.fillStyle = index % 3 === 0
        ? 'rgba(192,165,113,' + alpha + ')'
        : index % 2 === 0
          ? 'rgba(12,17,12,' + alpha + ')'
          : 'rgba(226,207,166,' + alpha + ')';
      context.fillRect(x, y, 1 + (index % 3), 1 + (index % 2));
    }
    for (let row = 0; row < 512; row += 47) {
      context.fillStyle = 'rgba(10,14,10,0.11)';
      context.fillRect(0, row, 512, 5);
      context.fillStyle = 'rgba(220,198,151,0.07)';
      context.fillRect(0, row + 7, 512, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();

  const greenhouseMulchTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Greenhouse mulch texture context unavailable.');
    context.fillStyle = '#191e19';
    context.fillRect(0, 0, 256, 512);
    for (let index = 0; index < 2400; index += 1) {
      const x = (index * 43 + 7) % 256;
      const y = (index * 97 + 13) % 512;
      const alpha = 0.025 + ((index * 7) % 9) / 160;
      context.fillStyle = index % 2 ? 'rgba(186,193,170,' + alpha + ')' : 'rgba(0,0,0,' + alpha + ')';
      context.fillRect(x, y, 1 + index % 3, 1);
    }
    // Two rows of four planting holes aligned to the in-game bed positions.
    context.globalCompositeOperation = 'destination-out';
    for (const x of [72, 184]) {
      for (const y of [75, 196, 317, 438]) {
        context.beginPath();
        context.ellipse(x, y, 14, 17, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalCompositeOperation = 'source-over';
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();

  const outdoorFieldTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Outdoor field texture context unavailable.');
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#c9b185');
    gradient.addColorStop(0.5, '#b99f73');
    gradient.addColorStop(1, '#a88e65');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    for (let row = -20; row < 540; row += 34) {
      context.strokeStyle = 'rgba(91,83,55,0.18)';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, row);
      context.bezierCurveTo(160, row - 3, 340, row + 4, 512, row + 1);
      context.stroke();
      context.strokeStyle = 'rgba(245,226,184,0.16)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, row + 5);
      context.lineTo(512, row + 6);
      context.stroke();
    }
    for (let index = 0; index < 3600; index += 1) {
      const x = (index * 97 + 31) % 512;
      const y = (index * 173 + 9) % 512;
      context.fillStyle = index % 2 ? 'rgba(244,223,181,0.1)' : 'rgba(75,72,48,0.075)';
      context.fillRect(x, y, 1 + (index % 3), 1 + (index % 2));
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 12);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  })();

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    color: '#d0d1c7',
    roughness: 0.88,
    metalness: 0.04,
  });
  const roomFloorMaterials: Record<string, THREE.Material> = {
    production: new THREE.MeshStandardMaterial({ map: tileTexture, color: '#d5d0c4', roughness: 0.62, metalness: 0.05 }),
    greenhouse: new THREE.MeshStandardMaterial({ map: greenhouseEarthTexture, color: '#b7a17a', roughness: 0.98, metalness: 0.0 }),
    storage: new THREE.MeshStandardMaterial({ color: '#777b75', roughness: 0.83, metalness: 0.12 }),
    processing: new THREE.MeshStandardMaterial({ map: tileTexture, color: '#a5aaa5', roughness: 0.5, metalness: 0.08 }),
    quality: new THREE.MeshStandardMaterial({ color: '#b9c2c1', roughness: 0.34, metalness: 0.12 }),
    utility: new THREE.MeshStandardMaterial({ color: '#68706e', roughness: 0.68, metalness: 0.22 }),
    office: new THREE.MeshStandardMaterial({ color: '#7b776e', roughness: 0.78, metalness: 0.04 }),
    logistics: new THREE.MeshStandardMaterial({ color: '#777d77', roughness: 0.84, metalness: 0.12 }),
    intake: new THREE.MeshStandardMaterial({ color: '#6d746c', roughness: 0.9, metalness: 0.08 }),
  };
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: masonryTexture,
    color: '#e2e2d5',
    roughness: 0.87,
    metalness: 0.04,
  });
  const greenhouseCurtainMaterial = new THREE.MeshPhysicalMaterial({
    map: greenhouseFabricTexture,
    color: '#d9ddd3',
    roughness: 0.94,
    metalness: 0.01,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const greenhouseRoofMaterial = new THREE.MeshPhysicalMaterial({
    map: greenhouseFabricTexture,
    color: '#f0ebdc',
    roughness: 0.9,
    metalness: 0.01,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const greenhouseMulchMaterial = new THREE.MeshStandardMaterial({
    map: greenhouseMulchTexture,
    color: '#d5d6c9',
    roughness: 0.88,
    metalness: 0.0,
    transparent: true,
    alphaTest: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const outdoorFieldMaterial = new THREE.MeshStandardMaterial({
    map: outdoorFieldTexture,
    color: '#d2ba8f',
    roughness: 1.0,
    metalness: 0.0,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: '#6e7b7d',
    roughness: 0.3,
    metalness: 0.8,
  });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: '#222a2c',
    roughness: 0.36,
    metalness: 0.72,
  });
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: '#665b48',
    roughness: 0.76,
    metalness: 0.02,
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: '#b8d7d7',
    roughness: 0.16,
    metalness: 0.04,
    transparent: true,
    opacity: 0.24,
    side: THREE.DoubleSide,
    transmission: 0.16,
    thickness: 0.08,
  });
  const growLightMaterial = new THREE.MeshStandardMaterial({
    color: '#e5e2d6',
    emissive: '#d5e7f3',
    emissiveIntensity: 1.7,
    roughness: 0.28,
  });
  const warmLightMaterial = new THREE.MeshStandardMaterial({
    color: '#e6d7b4',
    emissive: '#ffc96f',
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });

  const addBox = (
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    material: THREE.Material,
    options: { collision?: boolean; castShadow?: boolean; receiveShadow?: boolean } = {},
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    scene.add(mesh);
    if (options.collision) registerMovementObstacle(mesh);
    return mesh;
  };

  const addWallSegment = (
    horizontal: boolean,
    centerAlong: number,
    fixedCoordinate: number,
    length: number,
    material: THREE.Material = wallMaterial,
  ): void => {
    if (length < 0.2) return;
    const size: readonly [number, number, number] = horizontal
      ? [length, 4.5, 0.28]
      : [0.28, 4.5, length];
    const position: readonly [number, number, number] = horizontal
      ? [centerAlong, 2.25, fixedCoordinate]
      : [fixedCoordinate, 2.25, centerAlong];
    addBox(size, position, material, { collision: true });
  };

  const labelMaterialFor = (titleText: string, detailText: string): THREE.Material => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Facility label texture context unavailable.');
    context.fillStyle = '#172321';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#bac8b3';
    context.lineWidth = 6;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    context.fillStyle = '#e7eee5';
    context.font = '700 36px Arial, sans-serif';
    context.fillText(titleText.toLocaleUpperCase('de-DE'), 28, 72, 700);
    context.fillStyle = '#a9c4b2';
    context.font = '24px Arial, sans-serif';
    context.fillText(detailText, 28, 128, 700);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  };

  const addRoomShell = (room: {
    name: string;
    detail: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    type: string;
    north?: boolean;
    south?: boolean;
    east?: boolean;
    west?: boolean;
    greenhouseRoof?: boolean;
  }): void => {
    const { x, z, width, depth } = room;
    const halfWidth = width / 2;
    const roomWallMaterial = room.greenhouseRoof ? greenhouseCurtainMaterial : wallMaterial;
    const halfDepth = depth / 2;
    const doorWidth = room.type === 'intake' || room.greenhouseRoof ? 4.2 : 2.8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), roomFloorMaterials[room.type] ?? floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, -0.025, z);
    floor.receiveShadow = true;
    scene.add(floor);

    const horizontal = (wallZ: number, hasDoor: boolean): void => {
      if (!hasDoor) {
        addWallSegment(true, x, wallZ, width, roomWallMaterial);
        return;
      }
      const sideLength = halfWidth - doorWidth / 2;
      addWallSegment(true, x - doorWidth / 2 - sideLength / 2, wallZ, sideLength, roomWallMaterial);
      addWallSegment(true, x + doorWidth / 2 + sideLength / 2, wallZ, sideLength, roomWallMaterial);
      addBox([doorWidth, 0.2, 0.34], [x, 3.1, wallZ], darkMetalMaterial, { collision: false });
      addBox([0.12, 3.0, 0.36], [x - doorWidth / 2, 1.5, wallZ], metalMaterial, { collision: false });
      addBox([0.12, 3.0, 0.36], [x + doorWidth / 2, 1.5, wallZ], metalMaterial, { collision: false });
    };
    const vertical = (wallX: number, hasDoor: boolean): void => {
      if (!hasDoor) {
        addWallSegment(false, z, wallX, depth, roomWallMaterial);
        return;
      }
      const sideLength = halfDepth - doorWidth / 2;
      addWallSegment(false, z - doorWidth / 2 - sideLength / 2, wallX, sideLength, roomWallMaterial);
      addWallSegment(false, z + doorWidth / 2 + sideLength / 2, wallX, sideLength, roomWallMaterial);
      addBox([0.34, 0.2, doorWidth], [wallX, 3.1, z], darkMetalMaterial, { collision: false });
      addBox([0.36, 3.0, 0.12], [wallX, 1.5, z - doorWidth / 2], metalMaterial, { collision: false });
      addBox([0.36, 3.0, 0.12], [wallX, 1.5, z + doorWidth / 2], metalMaterial, { collision: false });
    };

    horizontal(z - halfDepth, Boolean(room.north));
    horizontal(z + halfDepth, Boolean(room.south));
    vertical(x - halfWidth, Boolean(room.west));
    vertical(x + halfWidth, Boolean(room.east));

    // A readable sign is placed inside the room over its south-side threshold.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width - 2, 7.0), 1.15), labelMaterialFor(room.name, room.detail));
    sign.position.set(x, 3.45, z + halfDepth - 0.2);
    sign.rotation.y = Math.PI;
    scene.add(sign);

    // Indoor rooms have a practical steel ceiling grid. The hoop house keeps its exposed arched ribs.
    const ceilingY = 4.7;
    if (!room.greenhouseRoof) {
      for (let column = -1; column <= 1; column += 1) {
        addBox([0.09, 0.1, depth], [x + column * (width / 3), ceilingY, z], metalMaterial, { collision: false });
      }
      for (let row = -1; row <= 1; row += 1) {
        addBox([width, 0.1, 0.09], [x, ceilingY, z + row * (depth / 3)], metalMaterial, { collision: false });
      }
    }

    if (room.greenhouseRoof) {
      const roofGeometry = (): THREE.BufferGeometry => {
        const widthSegments = 32;
        const depthSegments = 12;
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        for (let row = 0; row <= depthSegments; row += 1) {
          const v = row / depthSegments;
          const roofZ = z - halfDepth + v * depth;
          for (let column = 0; column <= widthSegments; column += 1) {
            const u = column / widthSegments;
            const normalizedX = u * 2 - 1;
            const roofX = x - halfWidth + u * width;
            // Smooth agricultural hoop profile: low at the eaves, high at the ridge.
            const roofY = 5.2 + 1.8 * Math.cos(normalizedX * Math.PI / 2);
            positions.push(roofX, roofY, roofZ);
            uvs.push(u, v);
          }
        }
        const stride = widthSegments + 1;
        for (let row = 0; row < depthSegments; row += 1) {
          for (let column = 0; column < widthSegments; column += 1) {
            const a = row * stride + column;
            const b = a + 1;
            const d = (row + 1) * stride + column;
            const c = d + 1;
            indices.push(a, d, b, b, d, c);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        return geometry;
      };
      const roof = new THREE.Mesh(roofGeometry(), greenhouseRoofMaterial);
      roof.receiveShadow = true;
      roof.castShadow = false;
      scene.add(roof);
      for (let rafter = 0; rafter <= 6; rafter += 1) {
        const roofZ = z - halfDepth + (depth / 6) * rafter;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(x - halfWidth, 5.2, roofZ),
          new THREE.Vector3(x, 7.0, roofZ),
          new THREE.Vector3(x + halfWidth, 5.2, roofZ),
        );
        const rafterMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.075, 6, false), darkMetalMaterial);
        rafterMesh.castShadow = true;
        scene.add(rafterMesh);
      }
      for (const side of [-1, 1]) {
        for (let line = 1; line <= 3; line += 1) {
          const along = (halfWidth / 4) * line;
          const px = x + side * along;
          const py = 5.2 + 1.8 * Math.cos((along / halfWidth) * Math.PI / 2) + 0.03;
          addBox([0.045, 0.045, depth], [px, py, z], metalMaterial, { collision: false });
        }
      }
    } else {
      const fixtureCount = Math.max(1, Math.floor(width / 7));
      for (let fixture = 0; fixture < fixtureCount; fixture += 1) {
        const fixtureX = x - ((fixtureCount - 1) * 3.8) / 2 + fixture * 3.8;
        const fixtureZ = z - 1.5;
        addBox([2.7, 0.08, 0.28], [fixtureX, 4.35, fixtureZ], room.type === 'production' ? growLightMaterial : warmLightMaterial, { collision: false });
        const light = new THREE.PointLight(room.type === 'production' ? 0xdbe9d8 : 0xffe5b5, room.type === 'production' ? 0.62 : 0.35, 9);
        light.position.set(fixtureX, 4.1, fixtureZ);
        if (!automatedRenderProfile) scene.add(light);
      }
    }
  };

  const addStorageRack = (x: number, z: number, width = 4.6, depth = 1.15, crateColor = '#9c9b82'): void => {
    for (const sideX of [-width / 2, width / 2]) {
      for (const sideZ of [-depth / 2, depth / 2]) {
        addBox([0.1, 2.55, 0.1], [x + sideX, 1.28, z + sideZ], metalMaterial, { collision: true });
      }
    }
    for (const shelfY of [0.4, 1.28, 2.16]) {
      addBox([width + 0.12, 0.1, depth + 0.12], [x, shelfY, z], metalMaterial, { collision: false });
      for (let slot = 0; slot < 3; slot += 1) {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(width / 3 - 0.12, 0.46, depth - 0.12),
          new THREE.MeshStandardMaterial({ color: crateColor, roughness: 0.84, metalness: 0.02 }),
        );
        crate.position.set(x - width / 3 + (width / 3) * slot, shelfY + 0.29, z);
        crate.castShadow = true;
        crate.receiveShadow = true;
        scene.add(crate);
      }
    }
  };

  const addWorkBench = (x: number, z: number, width: number, depth: number, topMaterial: THREE.Material): void => {
    addBox([width, 0.16, depth], [x, 0.98, z], topMaterial, { collision: true });
    for (const dx of [-width / 2 + 0.12, width / 2 - 0.12]) {
      for (const dz of [-depth / 2 + 0.12, depth / 2 - 0.12]) {
        addBox([0.09, 0.92, 0.09], [x + dx, 0.46, z + dz], darkMetalMaterial, { collision: true });
      }
    }
  };

  // One contiguous facility: visitors can walk from receiving/seed storage through the greenhouse,
  // cultivation, processing, quality, inventory, administration, utilities and dispatch.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(74, 66), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.07;
  floor.receiveShadow = true;
  scene.add(floor);

  // Exterior envelope. The south gate is a wide opening; movement remains within the building.
  addBox([0.34, 5.6, 66], [-36, 2.8, 0], wallMaterial, { collision: true });
  addBox([0.34, 5.6, 66], [36, 2.8, 0], wallMaterial, { collision: true });
  addBox([24, 5.6, 0.34], [-25, 2.8, -33], wallMaterial, { collision: true });
  addBox([24, 5.6, 0.34], [25, 2.8, -33], wallMaterial, { collision: true });
  addBox([30, 5.6, 0.34], [-22, 2.8, 33], wallMaterial, { collision: true });
  addBox([30, 5.6, 0.34], [22, 2.8, 33], wallMaterial, { collision: true });
  addBox([0.4, 3.5, 0.4], [-7, 1.75, 33], darkMetalMaterial, { collision: false });
  addBox([0.4, 3.5, 0.4], [7, 1.75, 33], darkMetalMaterial, { collision: false });
  addBox([14, 0.18, 1.7], [0, 3.55, 33], darkMetalMaterial, { collision: false });

  const outsideField = new THREE.Mesh(new THREE.PlaneGeometry(180, 160), outdoorFieldMaterial);
  outsideField.rotation.x = -Math.PI / 2;
  outsideField.position.set(0, -0.085, -108);
  outsideField.receiveShadow = true;
  scene.add(outsideField);

  const addHorizon = (
    zPosition: number,
    color: string,
    profile: readonly number[],
  ): void => {
    const shape = new THREE.Shape();
    shape.moveTo(-120, -2);
    shape.lineTo(-120, profile[0] ?? 7);
    for (let index = 1; index < profile.length; index += 1) {
      const nextX = -120 + (240 / (profile.length - 1)) * index;
      const previousX = -120 + (240 / (profile.length - 1)) * (index - 1);
      const currentY = profile[index] ?? 7;
      const previousY = profile[index - 1] ?? 7;
      shape.quadraticCurveTo((previousX + nextX) / 2, Math.max(previousY, currentY) + 3, nextX, currentY);
    }
    shape.lineTo(120, -2);
    shape.closePath();
    const mountain = new THREE.Mesh(
      new THREE.ShapeGeometry(shape, 32),
      new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    );
    mountain.position.z = zPosition;
    mountain.receiveShadow = true;
    scene.add(mountain);
  };
  addHorizon(-126, '#a6b0a7', [7, 11, 8, 15, 9, 13, 7, 11, 8, 14, 7]);
  addHorizon(-117, '#b3b59c', [4, 7, 5, 8, 6, 9, 5, 7, 4, 8, 4]);

  // Room grid. Every room has real walls, doorway openings, its own floor treatment, ceiling frame and purpose-specific props.
  addRoomShell({ name: 'Wareneingang & Samenarchiv', detail: 'ANNAHME · HERKUNFT · RÜCKVERFOLGBARKEIT', x: -23, z: -22, width: 16, depth: 14, type: 'intake', east: true, south: true });
  addRoomShell({ name: 'Gewächshaus & Anzucht', detail: 'PFLANZENWELT · FREIE BEWEGUNG', x: 0, z: -22, width: 20, depth: 14, type: 'greenhouse', greenhouseRoof: true, west: true, east: true, south: true });
  addRoomShell({ name: 'Klima & Gebäudetechnik', detail: 'VERSORGUNG · WARTUNG · ENERGIE', x: 23, z: -22, width: 16, depth: 14, type: 'utility', west: true, south: true });
  addRoomShell({ name: 'Samenlager & Quarantäne', detail: 'GESPERRTE / FREIGEGEBENE BESTÄNDE', x: -23, z: 0, width: 16, depth: 16, type: 'storage', north: true, east: true, south: true });
  addRoomShell({
    name: gameState.rooms.find((room) => room.definitionId === 'room-production')?.displayName ?? 'Indoor-Pflanzenproduktion',
    detail: 'SICHTBARE CANNABIS-PFLANZEN · DIREKTE PFLEGE',
    x: 0, z: 0, width: 24, depth: 18, type: 'production', north: true, east: true, south: true, west: true,
  });
  addRoomShell({
    name: gameState.rooms.find((room) => room.kind === 'processing')?.displayName ?? 'Verarbeitung',
    detail: 'SIMULIERTE VERARBEITUNG · CHARGENSTATUS',
    x: 23, z: 0, width: 16, depth: 16, type: 'processing', north: true, west: true, south: true,
  });
  addRoomShell({ name: 'Büro & Schichtleitung', detail: 'PERSONAL · PLANUNG · SCHICHTÜBERGABE', x: -23, z: 21, width: 16, depth: 14, type: 'office', north: true, east: true });
  addRoomShell({
    name: gameState.rooms.find((room) => room.kind === 'quality')?.displayName ?? 'Qualitätssicherung',
    detail: 'PRÜFUNG · FREIGABE · AUDIT-TRAIL',
    x: 0, z: 21, width: 16, depth: 14, type: 'quality', north: true, east: true, west: true,
  });
  addRoomShell({
    name: gameState.rooms.find((room) => room.definitionId === 'room-storage')?.displayName ?? 'Freigegebenes Lager',
    detail: 'FREIGEGEBENE CHARGEN · BESTAND',
    x: 19, z: 21, width: 8, depth: 14, type: 'storage', north: true, west: true, east: true
  });
  addRoomShell({
    name: gameState.rooms.find((room) => room.kind === 'logistics')?.displayName ?? 'Versand',
    detail: 'VERSAND · LIEFERUNG · APOTHEKENÜBERGABE',
    x: 27, z: 21, width: 8, depth: 14, type: 'logistics', north: true, west: true,
  });

  // Shelf, receiving and logistics props are placed away from doorways to preserve continuous navigation.
  addStorageRack(-26.8, -25.2, 5.0, 1.0, '#b2a483');
  addStorageRack(-26.8, -18.6, 5.0, 1.0, '#8d9f8e');
  addStorageRack(-26.7, 2.8, 4.8, 1.1, '#8a8f7c');
  addStorageRack(-26.7, -2.8, 4.8, 1.1, '#a69c80');
  addStorageRack(18.9, -25.1, 4.0, 1.1, '#788887');
  addStorageRack(27.1, 16.8, 4.1, 1.0, '#8f9a8e');
  addStorageRack(18.9, 25.2, 4.0, 1.0, '#7e897f');
  const greenhouseSoilMaterial = new THREE.MeshStandardMaterial({
    map: greenhouseEarthTexture,
    color: '#a99a79',
    roughness: 0.98,
    metalness: 0.0,
  });
  const greenhouseIrrigationMaterial = new THREE.MeshStandardMaterial({ color: '#3b5550', roughness: 0.52, metalness: 0.28 });
  for (const bedX of [-4.8, 4.8]) {
    addBox([3.7, 0.38, 9.3], [bedX, 0.19, -22.2], woodMaterial, { collision: true });
    addBox([3.42, 0.08, 9.04], [bedX, 0.42, -22.2], greenhouseSoilMaterial, { collision: false, castShadow: false });
    const mulch = new THREE.Mesh(new THREE.PlaneGeometry(3.24, 8.75), greenhouseMulchMaterial);
    mulch.rotation.x = -Math.PI / 2;
    mulch.position.set(bedX, 0.467, -22.2);
    mulch.receiveShadow = true;
    scene.add(mulch);
    const irrigation = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 8.7, 12), greenhouseIrrigationMaterial);
    irrigation.rotation.x = Math.PI / 2;
    irrigation.position.set(bedX, 0.488, -22.2);
    scene.add(irrigation);
    for (let emitter = 0; emitter < 7; emitter += 1) {
      const nozzle = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), greenhouseIrrigationMaterial);
      nozzle.position.set(bedX, 0.455, -25.4 + emitter * 1.05);
      scene.add(nozzle);
    }
    for (const edgeX of [bedX - 1.76, bedX + 1.76]) addBox([0.08, 0.12, 9.25], [edgeX, 0.44, -22.2], woodMaterial, { collision: false });
  }
  addWorkBench(0, -27.5, 4.8, 1.2, woodMaterial);
  addWorkBench(-23, 22.9, 4.8, 1.2, woodMaterial);
  addWorkBench(0, 24.5, 4.8, 1.25, metalMaterial);
  addWorkBench(23, 2.7, 4.6, 1.4, metalMaterial);
  addWorkBench(27, 24.9, 4.2, 1.4, metalMaterial);

  // Ceiling service trunks tie the different rooms together as one industrial facility.
  const ductMaterial = new THREE.MeshStandardMaterial({ color: '#8c9694', roughness: 0.38, metalness: 0.78 });
  for (const ductX of [-5.5, 5.5]) {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 61, 16), ductMaterial);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(ductX, 5.55, -0.5);
    duct.castShadow = true;
    scene.add(duct);
    for (let hanger = -27; hanger <= 27; hanger += 9) {
      addBox([0.1, 0.55, 0.1], [ductX, 5.15, hanger], metalMaterial, { collision: false });
    }
  }
  for (const windowX of [-6.2, 6.2]) {
    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.88, 0.1), glassMaterial);
    windowPane.position.set(windowX, 3.1, -8.82);
    scene.add(windowPane);
    for (const frameX of [-1.8, 0, 1.8]) {
      addBox([0.055, 1.04, 0.14], [windowX + frameX, 3.1, -8.82], darkMetalMaterial, { collision: false });
    }
  }

  const stationMaterial = new THREE.MeshStandardMaterial({ color: '#71817c', roughness: 0.4, metalness: 0.52 });
  const propagationSurface = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 2.6), stationMaterial);
  propagationSurface.position.set(8.1, 0.475, 5.7);
  propagationSurface.castShadow = true;
  propagationSurface.receiveShadow = true;
  scene.add(propagationSurface);
  registerMovementObstacle(propagationSurface);

  const benchLegGeometry = new THREE.BoxGeometry(0.08, 0.43, 0.08);
  const benchLegs = new THREE.InstancedMesh(benchLegGeometry, darkMetalMaterial, 48);
  benchLegs.castShadow = true;
  benchLegs.receiveShadow = true;
  const benchLegTransform = new THREE.Object3D();
  let benchLegIndex = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = -7.5 + column * 5;
      const z = -4.5 + row * 4.2;
      const station = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.09, 2.2), stationMaterial);
      station.position.set(x, 0.475, z);
      station.castShadow = true;
      station.receiveShadow = true;
      scene.add(station);
      registerMovementObstacle(station);
      for (const legX of [x - 1.55, x + 1.55]) {
        for (const legZ of [z - 0.96, z + 0.96]) {
          benchLegTransform.position.set(legX, 0.215, legZ);
          benchLegTransform.updateMatrix();
          benchLegs.setMatrixAt(benchLegIndex, benchLegTransform.matrix);
          benchLegIndex += 1;
        }
      }
    }
  }
  benchLegs.instanceMatrix.needsUpdate = true;
  scene.add(benchLegs);

  const careLevelColours = { low: '#8f9b54', balanced: '#286b3b', high: '#1e7541' } as const;
  const careRingColours: Record<PlantCareState['lastAction'] extends infer _T ? string : never, string> = {
    water: '#7fbfff', light: '#f6d365', temperature: '#ff9b71', humidity: '#83d8e8',
    nutrients: '#8ed081', prune: '#c6b4ff', take_cutting: '#e6c6a8', set_cutting: '#51d6ad',
  };

  function createCuttingVisual(slot: number, roomId?: EntityId): THREE.Group {
    const cutting = new THREE.Group();
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#527c55', roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#3d824b', roughness: 0.8, side: THREE.DoubleSide });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.22, 5), stemMaterial);
    stem.position.y = 0.11;
    cutting.add(stem);
    for (let index = 0; index < 3; index += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 5), leafMaterial);
      leaf.position.set((index - 1) * 0.05, 0.16 + index * 0.025, (index % 2) * 0.025);
      leaf.rotation.z = (index - 1) * 0.45;
      cutting.add(leaf);
    }
    const parentRoom = roomId ? gameState.rooms.find((room) => room.id === roomId) : undefined;
    if (parentRoom?.definitionId === 'room-greenhouse') cutting.position.set(-1.3 + (slot % 4) * 0.78, 0.49, -27.45 + Math.floor(slot / 4) * 0.28);
    else cutting.position.set(6.4 + (slot % 4) * 0.42, 0.52, 4.9 + Math.floor(slot / 4) * 0.38);
    scene.add(cutting);
    return cutting;
  }

  function applyPlantCareVisual(plant: THREE.Group, statePlant: GameState['plants'][number]): void {
    const care = getPlantCareState(statePlant);
    const baseScale = plant.userData.baseScale as THREE.Vector3 | undefined;
    if (baseScale) {
      const growthScale = 0.55 + THREE.MathUtils.clamp(Number(statePlant.progress), 0, 100) / 100 * 0.45;
      const pruningScale = Math.max(0.72, 1 - Math.min(care.pruningCount, 8) * 0.035);
      plant.scale.set(baseScale.x * growthScale, baseScale.y * growthScale * pruningScale, baseScale.z * growthScale);
    }
    const light = plant.userData.growLight as THREE.PointLight | undefined;
    if (light) light.intensity = ({ low: 0.2, balanced: 0.8, high: 1.3 } as const)[care.lightLevel];
    const soilMaterial = plant.userData.soilMaterial as THREE.MeshStandardMaterial | undefined;
    if (soilMaterial) soilMaterial.color.set(({ low: '#ad9869', balanced: '#3e4b42', high: '#294a5e' } as const)[care.waterLevel]);
    const ring = plant.userData.careRing as THREE.Mesh | undefined;
    const ringMaterial = plant.userData.careRingMaterial as THREE.MeshStandardMaterial | undefined;
    if (ring) ring.visible = statePlant.id === gameState.ui.selectedEntityId;
    if (ringMaterial) {
      ringMaterial.color.set(care.lastAction ? (careRingColours[care.lastAction] ?? '#51d6ad') : '#51d6ad');
      ringMaterial.emissive.set(statePlant.id === gameState.ui.selectedEntityId ? '#17352e' : '#000000');
    }
    plant.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || object.userData.isCannabisLeaflet !== true) return;
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      if (material instanceof THREE.MeshStandardMaterial) material.color.set(careLevelColours[care.nutrientLevel]);
      const baseRotation = object.userData.baseRotation as THREE.Euler | undefined;
      if (baseRotation) {
        const stressRatio = THREE.MathUtils.clamp(Number(statePlant.stressIndex) / 100, 0, 1);
        object.rotation.set(baseRotation.x - stressRatio * 0.18, baseRotation.y, baseRotation.z + stressRatio * 0.12);
      }
      const leafBaseScale = object.userData.baseScale as THREE.Vector3 | undefined;
      if (leafBaseScale) {
        const pruneScale = Math.max(0.72, 1 - Math.min(care.pruningCount, 8) * 0.035);
        object.scale.set(leafBaseScale.x * pruneScale, leafBaseScale.y * pruneScale, leafBaseScale.z * pruneScale);
      }
    });
  }

  function disposeSceneObject(object: THREE.Object3D): void {
    scene.remove(object);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    });
  }

  function syncPlantVisuals(state: ReturnType<typeof createInitialGameState>): void {
    const livePlantIds = new Set<string>(state.plants.map((plant) => plant.id));
    for (const [plantId, visuals] of plantVisuals) {
      if (livePlantIds.has(plantId)) continue;
      for (const visual of visuals) disposeSceneObject(visual);
      plantVisuals.delete(plantId);
    }
    for (const [plantId, cuttings] of cuttingVisuals) {
      if (livePlantIds.has(plantId)) continue;
      for (const cutting of cuttings) disposeSceneObject(cutting);
      cuttingVisuals.delete(plantId);
    }

    for (const statePlant of state.plants) {
      let visuals = plantVisuals.get(statePlant.id);
      const room = state.rooms.find((item) => item.id === statePlant.roomId);
      const plantsInRoom = state.plants.filter((item) => item.roomId === statePlant.roomId);
      const roomIndex = Math.max(0, plantsInRoom.findIndex((item) => item.id === statePlant.id));
      const getPlantPosition = (): THREE.Vector3 => {
        if (room?.definitionId === 'room-greenhouse') {
          const bed = Math.floor(roomIndex % 4 / 2);
          const side = roomIndex % 2 === 0 ? -0.72 : 0.72;
          return new THREE.Vector3((bed === 0 ? -4.8 : 4.8) + side, 0.47, -25.3 + Math.floor(roomIndex / 4) * 2.1);
        }
        if (room?.definitionId === 'room-production') return new THREE.Vector3(-8.0 + (roomIndex % 4) * 5, 0.52, -4.5 + Math.floor(roomIndex / 4) * 4.2);
        return new THREE.Vector3(0, 0.45, 0);
      };
      const visualScale = statePlant.propagatedFromPlantId ? 0.34 : room?.definitionId === 'room-greenhouse' ? 0.82 : 0.70;
      if (!visuals) {
        const visual = createCannabisPlant(0, 0, 200 + roomIndex);
        visual.position.copy(getPlantPosition()); visual.scale.setScalar(visualScale);
        visual.userData.plantId = statePlant.id; visual.userData.baseScale = visual.scale.clone(); visual.userData.roomId = statePlant.roomId;
        const growLight = new THREE.PointLight(0xddeeff, 0.58, 3.0);
        growLight.position.set(0, 1.65, 0);
        if (!automatedRenderProfile) visual.add(growLight);
        visual.userData.growLight = growLight;
        scene.add(visual); visuals = [visual]; plantVisuals.set(statePlant.id, visuals);
      } else {
        const visual = visuals[0];
        if (visual && visual.parent === scene && visual.userData.roomId !== statePlant.roomId) {
          visual.position.copy(getPlantPosition()); visual.scale.setScalar(visualScale);
          visual.userData.baseScale = visual.scale.clone(); visual.userData.roomId = statePlant.roomId;
        }
      }
      if (visuals) for (const visual of visuals) {
        const inGreenhouse = room?.definitionId === 'room-greenhouse';
        visual.traverse((object) => {
          if (object.userData.isPlantContainer === true) object.visible = !inGreenhouse;
        });
        applyPlantCareVisual(visual, statePlant);
      }

      const care = getPlantCareState(statePlant);
      const targetCuttings = Math.max(0, care.cuttingsTaken - care.cuttingsSet);
      const existing = cuttingVisuals.get(statePlant.id) ?? [];
      while (existing.length < targetCuttings) {
        const currentCount = [...cuttingVisuals.values()].reduce((sum, list) => sum + list.length, 0);
        existing.push(createCuttingVisual(currentCount, statePlant.roomId));
      }
      while (existing.length > targetCuttings) {
        const removed = existing.pop();
        if (!removed) continue;
        disposeSceneObject(removed);
      }
      cuttingVisuals.set(statePlant.id, existing);
    }
    const selectedPlant = state.plants.find((item) => item.id === state.ui.selectedEntityId) ?? state.plants[0];
    const selectedVisual = selectedPlant ? plantVisuals.get(selectedPlant.id)?.[0] : undefined;
    if (selectedPlant && selectedVisual) {
      const care = getPlantCareState(selectedPlant);
      const soilMaterial = selectedVisual.userData.soilMaterial as THREE.MeshStandardMaterial | undefined;
      const growLight = selectedVisual.userData.growLight as THREE.PointLight | undefined;
      const careRing = selectedVisual.userData.careRing as THREE.Mesh | undefined;
      const careRingMaterial = selectedVisual.userData.careRingMaterial as THREE.MeshStandardMaterial | undefined;
      let leafMaterial: THREE.MeshStandardMaterial | undefined;
      selectedVisual.traverse((object) => {
        if (leafMaterial || !(object instanceof THREE.Mesh) || object.userData.isCannabisLeaflet !== true) return;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        if (material instanceof THREE.MeshStandardMaterial) leafMaterial = material;
      });
      renderer.domElement.dataset.visualPlantId = selectedPlant.id;
      renderer.domElement.dataset.visualWaterColor = soilMaterial?.color.getHexString() ?? '';
      renderer.domElement.dataset.visualLightIntensity = growLight?.intensity.toFixed(2) ?? '';
      renderer.domElement.dataset.visualNutrientColor = leafMaterial?.color.getHexString() ?? '';
      renderer.domElement.dataset.visualCareRingColor = careRingMaterial?.color.getHexString() ?? '';
      renderer.domElement.dataset.visualCareRingVisible = String(careRing?.visible ?? false);
      renderer.domElement.dataset.visualPruningCount = String(care.pruningCount);
      renderer.domElement.dataset.visualPruningScaleY = selectedVisual.scale.y.toFixed(3);
      renderer.domElement.dataset.visualCareLastAction = care.lastAction ?? 'none';
    } else {
      delete renderer.domElement.dataset.visualPlantId;
      delete renderer.domElement.dataset.visualWaterColor;
      delete renderer.domElement.dataset.visualLightIntensity;
      delete renderer.domElement.dataset.visualNutrientColor;
      delete renderer.domElement.dataset.visualCareRingColor;
      delete renderer.domElement.dataset.visualCareRingVisible;
      delete renderer.domElement.dataset.visualPruningCount;
      delete renderer.domElement.dataset.visualPruningScaleY;
      delete renderer.domElement.dataset.visualCareLastAction;
    }
    renderer.domElement.dataset.statePlantCount = String(state.plants.length);
    renderer.domElement.dataset.plantVisualCount = String([...plantVisuals.values()].reduce((sum, visuals) => sum + visuals.length, 0));
    renderer.domElement.dataset.cuttingVisualCount = String([...cuttingVisuals.values()].reduce((sum, visuals) => sum + visuals.length, 0));
  }

  onGameStateChanged = () => syncPlantVisuals(gameState);

  const ui = new Application();
  await ui.init({
    backgroundAlpha: 0,
    antialias: !automatedRenderProfile,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, automatedRenderProfile ? 1 : 1.75),
    resizeTo: uiRoot,
  });
  uiRoot.appendChild(ui.canvas);
  ui.canvas.setAttribute('aria-label', 'Management heads-up display');

  const hud = new Container();
  ui.stage.addChild(hud);

  const panel = new Graphics();
  const title = new Text({
    text: 'DOPEFARM',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 12, fontWeight: 'bold', fill: '#f0f5ff', letterSpacing: 1.4 },
  });
  const subtitle = new Text({
    text: 'ANLAGE  /  ' + (spatialRoomLabels[identifySpatialRoom(avatar.position)] ?? 'VERBINDUNGSGANG'),
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#8fa8c6', letterSpacing: 1.1 },
  });
  let previousHudRoomId = identifySpatialRoom(avatar.position);
  const stateLine = new Text({
    text: 'TAG ' + gameState.time.day + '  ·  ' + gameState.compliance.licenseStatus.toUpperCase(),
    style: { fontFamily: 'Arial, sans-serif', fontSize: 9, fill: '#d8c89b', wordWrap: true, wordWrapWidth: 260 },
  });
  hud.addChild(panel, title, subtitle, stateLine);
  const resetCamera = (): void => {
    const offset = new THREE.Vector3(0, 3.2, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), avatar.rotation.y);
    camera.position.copy(avatar.position).add(offset);
    controls.target.copy(avatar.position).add(cameraTargetOffset);
    controls.update();
  };
  resetCameraButton?.addEventListener('click', resetCamera);

  const layout = (): void => {
    const width = ui.screen.width;
    panel.clear().roundRect(14, 14, Math.min(300, width - 28), 76, 10)
      .fill({ color: 0x0b1423, alpha: 0.76 })
      .stroke({ color: 0x465b69, alpha: 0.74, width: 1 });
    title.position.set(26, 22);
    subtitle.position.set(27, 42);
    stateLine.style.wordWrapWidth = Math.min(250, width - 52);
    stateLine.position.set(27, 61);
  };
  layout();
  onGameStateChanged = () => {
    stateLine.text = 'TAG ' + gameState.time.day + '  /  REV ' + gameState.revision + '  /  ' + gameState.compliance.licenseStatus.toUpperCase();
    syncPlantVisuals(gameState);
    layout();
  };
  onGameStateChanged();
  window.addEventListener('resize', layout);

  const plantRaycaster = new THREE.Raycaster();
  const plantPointer = new THREE.Vector2();
  const selectNearbyPlant = (direction: -1 | 0 | 1 = 0): void => {
    const nearbyPlants = gameState.plants
      .filter((plant) => plant.stage !== 'rejected')
      .map((plant) => {
        const visual = plantVisuals.get(plant.id)?.[0];
        if (!visual) return null;
        return { plant, distance: avatar.position.distanceTo(visual.getWorldPosition(new THREE.Vector3())) };
      })
      .filter((entry): entry is { plant: GameState['plants'][number]; distance: number } => Boolean(entry && entry.distance <= 5.5))
      .sort((left, right) => left.distance - right.distance);
    if (nearbyPlants.length === 0) {
      const hasPlant = gameState.plants.some((plant) => plant.stage !== 'rejected');
      setFeedback('error', hasPlant ? 'Keine Pflanze in Reichweite. Gehe mit dem linken Stick näher heran.' : 'In dieser Kampagnenphase gibt es noch keine Pflanze zum Auswählen.');
      return;
    }
    const currentIndex = nearbyPlants.findIndex((entry) => entry.plant.id === gameState.ui.selectedEntityId);
    const index = direction === 0
      ? (currentIndex < 0 ? 0 : currentIndex)
      : (currentIndex < 0
        ? (direction > 0 ? 0 : nearbyPlants.length - 1)
        : (currentIndex + direction + nearbyPlants.length) % nearbyPlants.length);
    selectPlant(nearbyPlants[index]!.plant.id);
    renderer.domElement.focus({ preventScroll: true });
  };
  const onWorldPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    plantPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    plantPointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    plantRaycaster.setFromCamera(plantPointer, camera);
    const intersections = plantRaycaster.intersectObjects(scene.children, true);
    for (const intersection of intersections) {
      let target: THREE.Object3D | null = intersection.object;
      while (target && typeof target.userData.plantId !== 'string') target = target.parent;
      if (target && typeof target.userData.plantId === 'string') {
        const plantWorldPosition = target.getWorldPosition(new THREE.Vector3());
        if (avatar.position.distanceTo(plantWorldPosition) > 5.5) {
          setFeedback('error', 'Pflanze außerhalb der Interaktionsreichweite. Gehe näher heran.');
          return;
        }
        selectPlant(target.userData.plantId as EntityId);
        return;
      }
    }
  };
  renderer.domElement.addEventListener('pointerdown', onWorldPointerDown);

  let previousGamepadButtons = new Set<number>();
  let previousGamepadConnected = false;
  const gamepadSpherical = new THREE.Spherical();
  const focusableGameControls = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(
      '#game-panel button:not(:disabled), #game-panel select:not(:disabled), #game-panel input:not(:disabled)',
    )).filter((element) => element.getClientRects().length > 0 && !element.hasAttribute('hidden'));

  const focusNextGameControl = (direction: -1 | 1): void => {
    const controlsInPanel = focusableGameControls();
    if (controlsInPanel.length === 0) return;
    const current = document.activeElement instanceof HTMLElement ? controlsInPanel.indexOf(document.activeElement) : -1;
    const nextIndex = current < 0 ? (direction > 0 ? 0 : controlsInPanel.length - 1)
      : (current + direction + controlsInPanel.length) % controlsInPanel.length;
    const next = controlsInPanel[nextIndex];
    next?.focus({ preventScroll: true });
    next?.scrollIntoView({ block: 'nearest' });
  };

  const isGameControlFocused = (): boolean =>
    document.activeElement instanceof HTMLElement &&
    Boolean(document.activeElement.closest('#game-panel')) &&
    document.activeElement.matches('button, select, input, textarea');

  const activateGamepadPrimary = (): void => {
    if (isGameControlFocused() && document.activeElement instanceof HTMLElement) {
      document.activeElement.click();
      return;
    }
    selectNearbyPlant(0);
  };

  const updateGamepadHint = (connected: boolean): void => {
    if (!gamepadHint) return;
    gamepadHint.dataset.connected = String(connected);
    const expanded = gamepadHint.dataset.expanded === 'true';
    gamepadHint.setAttribute('aria-label', expanded ? 'Gamepad-Hinweise ausblenden' : 'Gamepad-Hinweise anzeigen');
    gamepadHint.title = expanded ? 'Gamepad-Hinweise ausblenden' : 'Gamepad-Hinweise anzeigen';
    gamepadHint.textContent = expanded
      ? (connected
        ? 'CONTROLLER VERBUNDEN · Linker Stick: bewegen · rechter Stick: Kamera · A: auswählen/aktivieren · B: Kamera zurücksetzen · X/Y oder L/R: Pflanze wechseln · Steuerkreuz: Oberfläche'
        : 'GAMEPAD BEREIT · Linker Stick: bewegen · rechter Stick: Kamera · A: Pflanze wählen/Aktion aktivieren · B: Kamera zurücksetzen · X/Y oder L/R: Pflanze wechseln · Steuerkreuz: Oberfläche')
      : (connected ? '🎮 Controller verbunden' : '🎮 Gamepad bereit');
  };
  gamepadHint?.addEventListener('click', () => {
    if (!gamepadHint) return;
    gamepadHint.dataset.expanded = String(gamepadHint.dataset.expanded !== 'true');
    updateGamepadHint(gamepadHint.dataset.connected === 'true');
  });
  window.addEventListener('gamepadconnected', () => updateGamepadHint(true));
  window.addEventListener('gamepaddisconnected', () => updateGamepadHint(false));
  updateGamepadHint(false);

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
    const delta = Math.min(walkClock.getDelta(), 0.05);
    const gamepadFrame = readGamepadFrame(
      typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()) : [],
      previousGamepadButtons,
    );
    previousGamepadButtons = new Set(gamepadFrame.pressedButtons);
    for (const buttonIndex of gamepadFrame.justPressedButtons) pendingGamepadButtonPresses.add(buttonIndex);
    if (gamepadFrame.connected !== previousGamepadConnected) {
      previousGamepadConnected = gamepadFrame.connected;
      updateGamepadHint(gamepadFrame.connected);
      renderer.domElement.dataset.gamepadConnected = String(gamepadFrame.connected);
    }
    const pressedThisUpdate = new Set(pendingGamepadButtonPresses);
    pendingGamepadButtonPresses.clear();
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.dpadUp)) focusNextGameControl(-1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.dpadDown)) focusNextGameControl(1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.dpadLeft)) selectNearbyPlant(-1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.dpadRight)) selectNearbyPlant(1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.south)) activateGamepadPrimary();
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.east)) resetCamera();
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.start)) setGamePanelOpen(Boolean(gamePanel?.hidden));
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.west)) selectNearbyPlant(-1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.north)) selectNearbyPlant(1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.leftShoulder)) selectNearbyPlant(-1);
    if (pressedThisUpdate.has(GAMEPAD_BUTTON.rightShoulder)) selectNearbyPlant(1);

    if (Math.abs(gamepadFrame.moveX) > 0 || Math.abs(gamepadFrame.moveY) > 0) renderer.domElement.focus({ preventScroll: true });
    if (Math.abs(gamepadFrame.lookX) + Math.abs(gamepadFrame.lookY) > 0.01) {
      const cameraOffset = camera.position.clone().sub(controls.target);
      gamepadSpherical.setFromVector3(cameraOffset);
      gamepadSpherical.theta -= gamepadFrame.lookX * 2.15 * delta;
      gamepadSpherical.phi = THREE.MathUtils.clamp(gamepadSpherical.phi + gamepadFrame.lookY * 1.45 * delta, 0.22, 1.32);
      cameraOffset.setFromSpherical(gamepadSpherical);
      camera.position.copy(controls.target).add(cameraOffset);
      camera.lookAt(controls.target);
    }

    movementVector.set(0, 0, 0);
    const keyboardForward = Number(movementKeys.has('w') || movementKeys.has('arrowup')) -
      Number(movementKeys.has('s') || movementKeys.has('arrowdown'));
    const keyboardRight = Number(movementKeys.has('d') || movementKeys.has('arrowright')) -
      Number(movementKeys.has('a') || movementKeys.has('arrowleft'));
    const forwardInput = THREE.MathUtils.clamp(keyboardForward - gamepadFrame.moveY, -1, 1);
    const rightInput = THREE.MathUtils.clamp(keyboardRight + gamepadFrame.moveX, -1, 1);
    if (forwardInput !== 0 || rightInput !== 0) {
      movementForward.subVectors(camera.position, controls.target);
      movementForward.y = 0;
      if (movementForward.lengthSq() > 0) movementForward.normalize();
      movementForward.negate();
      movementRight.crossVectors(movementForward, worldUp).normalize();
      movementVector.addScaledVector(movementForward, forwardInput);
      movementVector.addScaledVector(movementRight, rightInput);
      movementVector.normalize().multiplyScalar(3.4 * delta);

      const candidate = avatar.position.clone().add(movementVector);
      candidate.x = THREE.MathUtils.clamp(candidate.x, -35.0, 35.0);
      candidate.z = THREE.MathUtils.clamp(candidate.z, -31.0, 31.8);
      const avatarRadius = 0.32;
      const isBlockedAt = (x: number, z: number): boolean => movementObstacles.some((bounds) =>
        x + avatarRadius > bounds.min.x && x - avatarRadius < bounds.max.x &&
        z + avatarRadius > bounds.min.z && z - avatarRadius < bounds.max.z,
      );
      // Resolve axes independently so the character slides around bench corners instead of sticking on diagonal contact.
      if (!isBlockedAt(candidate.x, avatar.position.z)) avatar.position.x = candidate.x;
      if (!isBlockedAt(avatar.position.x, candidate.z)) avatar.position.z = candidate.z;
      avatar.rotation.y = Math.atan2(-movementVector.x, -movementVector.z);
      walkPhase += delta * 8;
      leftLeg.rotation.x = Math.sin(walkPhase) * 0.42;
      rightLeg.rotation.x = -Math.sin(walkPhase) * 0.42;
      leftArm.rotation.x = -Math.sin(walkPhase) * 0.24;
      rightArm.rotation.x = Math.sin(walkPhase) * 0.24;
    } else {
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, delta);
      leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, 0, 10, delta);
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, 0, 10, delta);
    }
    const avatarDelta = new THREE.Vector3().subVectors(avatar.position, previousAvatarPosition);
    camera.position.add(avatarDelta);
    previousAvatarPosition.copy(avatar.position);
    controls.target.copy(avatar.position).add(cameraTargetOffset);
    controls.update();
    renderer.domElement.dataset.playerX = avatar.position.x.toFixed(3);
    renderer.domElement.dataset.gamepadSupported = String(typeof navigator.getGamepads === 'function');
    renderer.domElement.dataset.gamepadIndex = gamepadFrame.index === null ? '' : String(gamepadFrame.index);
    renderer.domElement.dataset.playerZ = avatar.position.z.toFixed(3);
    renderer.domElement.dataset.cameraTargetX = controls.target.x.toFixed(3);
    renderer.domElement.dataset.cameraTargetZ = controls.target.z.toFixed(3);
    const currentRoomId = identifySpatialRoom(avatar.position);
    renderer.domElement.dataset.roomId = currentRoomId;
    const visualizedPlant = gameState.plants.find((item) => item.id === gameState.ui.selectedEntityId) ?? gameState.plants[0];
    const visualizedPlantRoom = visualizedPlant ? gameState.rooms.find((item) => item.id === visualizedPlant.roomId) : undefined;
    const visualizedRoomId = visualizedPlantRoom?.definitionId === 'room-greenhouse'
      ? 'greenhouse'
      : visualizedPlantRoom?.definitionId === 'room-production'
        ? 'production'
        : visualizedPlantRoom?.definitionId === 'room-intake'
          ? 'seed-intake'
          : visualizedPlantRoom?.definitionId === 'room-processing'
            ? 'processing'
            : visualizedPlantRoom?.definitionId === 'room-quality'
              ? 'quality'
              : visualizedPlantRoom?.definitionId === 'room-storage'
                ? 'released-storage'
                : visualizedPlantRoom?.definitionId === 'room-logistics'
                  ? 'dispatch'
                  : '';
    if (visualizedRoomId) renderer.domElement.dataset.visualPlantRoomId = visualizedRoomId;
    else delete renderer.domElement.dataset.visualPlantRoomId;
    if (currentRoomId !== previousHudRoomId) {
      previousHudRoomId = currentRoomId;
      subtitle.text = 'ANLAGE  /  ' + (spatialRoomLabels[currentRoomId] ?? 'VERBINDUNGSGANG');
      layout();
    }
    const primaryPlantId = gameState.plants[0]?.id;
    const primaryPlantVisual = primaryPlantId ? plantVisuals.get(primaryPlantId)?.[0] : undefined;
    if (primaryPlantVisual) {
      const projectedPlant = primaryPlantVisual.getWorldPosition(new THREE.Vector3()).project(camera);
      const canvasBounds = renderer.domElement.getBoundingClientRect();
      renderer.domElement.dataset.interactablePlantX = ((projectedPlant.x + 1) * 0.5 * canvasBounds.width).toFixed(1);
      renderer.domElement.dataset.interactablePlantY = ((1 - projectedPlant.y) * 0.5 * canvasBounds.height).toFixed(1);
    }
    if (!automatedRenderProfile) {
      renderer.render(scene, camera);
    } else {
      const now = performance.now();
      if (now - lastAutomatedRenderMs >= 100) {
        lastAutomatedRenderMs = now;
        renderer.render(scene, camera);
      }
    }
  });

  return () => {
    renderer.setAnimationLoop(null);
    renderer.domElement.removeEventListener('pointerdown', onWorldPointerDown);
    window.removeEventListener('keydown', onMovementKeyDown);
    window.removeEventListener('keyup', onMovementKeyUp);
    window.removeEventListener('blur', clearMovementKeys);
    window.removeEventListener('resize', resize);
    window.removeEventListener('resize', layout);
    resetCameraButton?.removeEventListener('click', resetCamera);
    saveGameButton?.removeEventListener('click', saveCampaign);
    loadGameButton?.removeEventListener('click', loadCampaign);
    exportGameButton?.removeEventListener('click', exportCampaign);
    importGameButton?.removeEventListener('click', handleImportClick);
    importSaveInput?.removeEventListener('change', handleImportChange);
    controls.dispose();
    avatar.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    });
    movementObstacles.length = 0;
    plantVisuals.clear();
    cuttingVisuals.clear();
    ui.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
    renderer.dispose();
    renderer.domElement.remove();
  };
}

let dispose: (() => void) | undefined;
let autosaveTimer: number | undefined;
void boot().then((cleanup) => {
  dispose = cleanup;
}).catch(showFatalError);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (autosaveTimer !== undefined) window.clearInterval(autosaveTimer);
    dispose?.();
  });
}

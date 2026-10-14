import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId, EntityId, GameState, PlantCareState } from '../contracts/domain';
import { createInitialGameState } from './domain/initial-state';
import { GAME_BALANCE } from './domain/balance';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from './domain/vertical-slice';
import { renderManagementUI } from './ui/management';
import { IndexedDbSaveRepository } from './persistence/indexeddb-save-repository';
import { createSaveEnvelope, restoreGameState } from './persistence/save-codec';
import { getPlantCareState } from './domain/plant-care';

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
  if (persistenceBusy) return;
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
  if (persistenceBusy) return;
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
  pot.position.y = 0.15;
  pot.castShadow = true;
  plant.add(pot);
  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#3e4b42', roughness: 1 });
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.17, 12), soilMaterial);
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
      setSaveStatus('info', 'Neue Kampagne · Autosave nach jeder erfolgreichen Aktion.');
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
  scene.background = new THREE.Color('#0b1220');
  scene.fog = new THREE.Fog('#66716e', 52, 118);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
  camera.position.set(15, 13, 18);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '3D medical cannabis production facility');
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
  avatar.position.set(-7, 0, -6.2);
  avatar.userData.isPlayerAvatar = true;
  const avatarClothing = new THREE.MeshStandardMaterial({ color: '#2e8b78', roughness: 0.78 });
  const avatarTrim = new THREE.MeshStandardMaterial({ color: '#c4d6df', roughness: 0.62 });
  const avatarSkin = new THREE.MeshStandardMaterial({ color: '#c99573', roughness: 0.86 });
  const avatarHair = new THREE.MeshStandardMaterial({ color: '#302b2a', roughness: 0.92 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.58, 4, 8), avatarClothing);
  torso.position.y = 1.13;
  torso.castShadow = true;
  avatar.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), avatarSkin);
  head.position.y = 1.82;
  head.castShadow = true;
  avatar.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.195, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), avatarHair);
  hair.position.y = 1.91;
  hair.castShadow = true;
  avatar.add(hair);
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  for (const [leg, x] of [[leftLeg, -0.13], [rightLeg, 0.13]] as const) {
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.48, 3, 6), avatarTrim);
    limb.position.set(x, 0.48, 0);
    limb.castShadow = true;
    leg.add(limb);
    avatar.add(leg);
  }
  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 3, 6), avatarClothing);
  leftArm.position.set(-0.34, 1.2, 0);
  leftArm.rotation.z = -0.12;
  leftArm.castShadow = true;
  avatar.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 3, 6), avatarClothing);
  rightArm.position.set(0.34, 1.2, 0);
  rightArm.rotation.z = 0.12;
  rightArm.castShadow = true;
  avatar.add(rightArm);
  scene.add(avatar);

  const movementKeys = new Set<string>();
  const movementObstacles: THREE.Mesh[] = [];
  const cameraTargetOffset = new THREE.Vector3(0, 1.2, 0);
  const previousAvatarPosition = avatar.position.clone();
  const movementForward = new THREE.Vector3();
  const movementRight = new THREE.Vector3();
  const movementVector = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const walkClock = new THREE.Clock();
  let walkPhase = 0;
  renderer.domElement.dataset.thirdPerson = 'true';
  renderer.domElement.dataset.playerX = avatar.position.x.toFixed(3);
  renderer.domElement.dataset.playerZ = avatar.position.z.toFixed(3);
  renderer.domElement.dataset.cameraTargetZ = avatar.position.z.toFixed(3);
  camera.position.copy(avatar.position).add(new THREE.Vector3(0, 4.4, 8));
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

  scene.add(new THREE.HemisphereLight(0xc8ddff, 0x172235, 2.0));
  const keyLight = new THREE.DirectionalLight(0xf4f7ff, 3.0);
  keyLight.position.set(8, 16, 7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 95;
  keyLight.shadow.bias = -0.00012;
  scene.add(keyLight);

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
    context.fillStyle = '#3c4545';
    context.fillRect(0, 0, 512, 512);
    const blockW = 96;
    const blockH = 38;
    for (let row = 0; row < 14; row += 1) {
      const offset = row % 2 ? -blockW / 2 : 0;
      for (let column = -1; column < 7; column += 1) {
        const x = column * blockW + offset;
        const y = row * blockH;
        const shade = 62 + ((row * 13 + column * 19 + 80) % 25);
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

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: concreteTexture,
    color: '#d0d1c7',
    roughness: 0.88,
    metalness: 0.04,
  });
  const roomFloorMaterials: Record<string, THREE.Material> = {
    production: new THREE.MeshStandardMaterial({ map: tileTexture, color: '#d5d0c4', roughness: 0.62, metalness: 0.05 }),
    greenhouse: new THREE.MeshStandardMaterial({ color: '#776c54', roughness: 0.96, metalness: 0.01 }),
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
    color: '#c2c2b2',
    roughness: 0.87,
    metalness: 0.04,
  });
  const partitionMaterial = new THREE.MeshStandardMaterial({
    color: '#b2b7b1',
    roughness: 0.76,
    metalness: 0.12,
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
    if (options.collision) movementObstacles.push(mesh);
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
    const halfDepth = depth / 2;
    const doorWidth = 2.8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), roomFloorMaterials[room.type] ?? floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, -0.025, z);
    floor.receiveShadow = true;
    scene.add(floor);

    const horizontal = (wallZ: number, hasDoor: boolean): void => {
      if (!hasDoor) {
        addWallSegment(true, x, wallZ, width);
        return;
      }
      const sideLength = halfWidth - doorWidth / 2;
      addWallSegment(true, x - doorWidth / 2 - sideLength / 2, wallZ, sideLength);
      addWallSegment(true, x + doorWidth / 2 + sideLength / 2, wallZ, sideLength);
      addBox([doorWidth, 0.2, 0.34], [x, 3.1, wallZ], darkMetalMaterial, { collision: false });
      addBox([0.12, 3.0, 0.36], [x - doorWidth / 2, 1.5, wallZ], metalMaterial, { collision: false });
      addBox([0.12, 3.0, 0.36], [x + doorWidth / 2, 1.5, wallZ], metalMaterial, { collision: false });
    };
    const vertical = (wallX: number, hasDoor: boolean): void => {
      if (!hasDoor) {
        addWallSegment(false, z, wallX, depth);
        return;
      }
      const sideLength = halfDepth - doorWidth / 2;
      addWallSegment(false, z - doorWidth / 2 - sideLength / 2, wallX, sideLength);
      addWallSegment(false, z + doorWidth / 2 + sideLength / 2, wallX, sideLength);
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
    scene.add(sign);

    // Exposed steel ceiling grid and practical fixtures keep the room readable from the player camera.
    const ceilingY = room.greenhouseRoof ? 5.15 : 4.7;
    for (let column = -1; column <= 1; column += 1) {
      addBox([0.09, 0.1, depth], [x + column * (width / 3), ceilingY, z], metalMaterial, { collision: false });
    }
    for (let row = -1; row <= 1; row += 1) {
      addBox([width, 0.1, 0.09], [x, ceilingY, z + row * (depth / 3)], metalMaterial, { collision: false });
    }

    if (room.greenhouseRoof) {
      const roofGeometry = (left: boolean): THREE.BufferGeometry => {
        const z0 = z - halfDepth;
        const z1 = z + halfDepth;
        const vertices = left
          ? [-halfWidth, 5.2, z0, x, 7.0, z0, x, 7.0, z1, -halfWidth, 5.2, z1]
          : [x, 7.0, z0, x + halfWidth, 5.2, z0, x + halfWidth, 5.2, z1, x, 7.0, z1];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.computeVertexNormals();
        return geometry;
      };
      const roofMaterial = new THREE.MeshPhysicalMaterial({
        color: '#dbe5dc',
        roughness: 0.22,
        metalness: 0.06,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        transmission: 0.12,
      });
      for (const left of [true, false]) {
        const roof = new THREE.Mesh(roofGeometry(left), roofMaterial);
        roof.receiveShadow = true;
        scene.add(roof);
      }
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
          const py = 7.0 - (along / halfWidth) * 1.8 + 0.03;
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
        scene.add(light);
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
  addBox([74, 5.6, 0.34], [0, 2.8, -33], wallMaterial, { collision: true });
  addBox([30, 5.6, 0.34], [-22, 2.8, 33], wallMaterial, { collision: true });
  addBox([30, 5.6, 0.34], [22, 2.8, 33], wallMaterial, { collision: true });
  addBox([0.4, 3.5, 0.4], [-7, 1.75, 33], darkMetalMaterial, { collision: false });
  addBox([0.4, 3.5, 0.4], [7, 1.75, 33], darkMetalMaterial, { collision: false });
  addBox([14, 0.18, 1.7], [0, 3.55, 33], darkMetalMaterial, { collision: false });

  // Room grid. Every room has real walls, doorway openings, its own floor treatment, ceiling frame and purpose-specific props.
  addRoomShell({ name: 'Wareneingang & Samenarchiv', detail: 'ANNAHME · HERKUNFT · RÜCKVERFOLGBARKEIT', x: -23, z: -22, width: 16, depth: 14, type: 'intake', east: true, south: true });
  addRoomShell({ name: 'Gewächshaus & Anzucht', detail: 'PFLANZENWELT · FREIE BEWEGUNG', x: 0, z: -22, width: 20, depth: 14, type: 'greenhouse', greenhouseRoof: true, west: true, east: true, south: true });
  addRoomShell({ name: 'Klima & Gebäudetechnik', detail: 'VERSORGUNG · WARTUNG · ENERGIE', x: 23, z: -22, width: 16, depth: 14, type: 'utility', west: true, south: true });
  addRoomShell({ name: 'Samenlager & Quarantäne', detail: 'GESPERRTE / FREIGEGEBENE BESTÄNDE', x: -23, z: 0, width: 16, depth: 16, type: 'storage', north: true, east: true, south: true });
  addRoomShell({
    name: gameState.rooms.find((room) => room.kind === 'production')?.displayName ?? 'Pflanzenproduktion',
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
    name: gameState.rooms.find((room) => room.kind === 'storage')?.displayName ?? 'Freigegebenes Lager',
    detail: 'FREIGEGEBENE CHARGEN · BESTAND',
    x: 19, z: 21, width: 8, depth: 14, type: 'storage', north: true, west: true,
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
  addWorkBench(0, -25.1, 6.0, 1.2, woodMaterial);
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

  const stationMaterial = new THREE.MeshStandardMaterial({ color: '#33465c', roughness: 0.45, metalness: 0.35 });
  const propagationSurface = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 2.6), stationMaterial);
  propagationSurface.position.set(8.1, 0.14, 5.7);
  propagationSurface.castShadow = true;
  propagationSurface.receiveShadow = true;
  scene.add(propagationSurface);
  movementObstacles.push(propagationSurface);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = -7.5 + column * 5;
      const z = -4.5 + row * 4.2;
      const station = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 2.2), stationMaterial);
      station.position.set(x, 0.28, z);
      station.castShadow = true;
      station.receiveShadow = true;
      scene.add(station);
      movementObstacles.push(station);

      // Distinct cannabis silhouettes are fictional game assets; all cultivation and process values are abstract game balance only.
      for (let pod = 0; pod < 3; pod += 1) {
        const plant = createCannabisPlant(-0.7 + pod * 0.7, 0, row * 4 + column * 3 + pod);
        plant.scale.setScalar(0.62 + ((row + column + pod) % 3) * 0.05);
        if (row === 0 && column === 0 && pod === 0) {
          // The physical primary-bed plant must keep its domain identity across reloads.
          // Selection is UI state; it must never rebind a different plant to this mesh.
          const primaryPlant = gameState.plants.find((item) => item.propagatedFromPlantId === null) ?? gameState.plants[0];
          if (primaryPlant) {
            plant.userData.plantId = primaryPlant.id;
            plant.userData.baseScale = plant.scale.clone();
            const growLight = new THREE.PointLight(0xddeeff, 0.8, 4);
            growLight.position.set(0, 2.6, 0);
            plant.add(growLight);
            plant.userData.growLight = growLight;
            plantVisuals.set(primaryPlant.id, [plant]);
          }
        }
        station.add(plant);
      }
    }
  }

  const careLevelColours = { low: '#8f9b54', balanced: '#286b3b', high: '#1e7541' } as const;
  const careRingColours: Record<PlantCareState['lastAction'] extends infer _T ? string : never, string> = {
    water: '#7fbfff', light: '#f6d365', temperature: '#ff9b71', humidity: '#83d8e8',
    nutrients: '#8ed081', prune: '#c6b4ff', take_cutting: '#e6c6a8', set_cutting: '#51d6ad',
  };

  function createCuttingVisual(slot: number): THREE.Group {
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
    cutting.position.set(6.7 + (slot % 4) * 0.46, 0.27, 5.0 + Math.floor(slot / 4) * 0.42);
    scene.add(cutting);
    return cutting;
  }

  function applyPlantCareVisual(plant: THREE.Group, statePlant: GameState['plants'][number]): void {
    const care = getPlantCareState(statePlant);
    const baseScale = plant.userData.baseScale as THREE.Vector3 | undefined;
    if (baseScale) {
      const pruningScale = Math.max(0.72, 1 - Math.min(care.pruningCount, 8) * 0.035);
      plant.scale.set(baseScale.x, baseScale.y * pruningScale, baseScale.z);
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
      if (!visuals && statePlant.propagatedFromPlantId) {
        const propagatedIndex = state.plants.filter((item) => item.propagatedFromPlantId).findIndex((item) => item.id === statePlant.id);
        const visual = createCannabisPlant(7.1 + (propagatedIndex % 3) * 0.8, 0, 100 + propagatedIndex);
        visual.position.y = 0.34;
        visual.scale.setScalar(0.24);
        visual.userData.plantId = statePlant.id;
        visual.userData.baseScale = visual.scale.clone();
        const growLight = new THREE.PointLight(0xddeeff, 0.4, 2);
        growLight.position.set(0, 1.2, 0);
        visual.add(growLight);
        visual.userData.growLight = growLight;
        scene.add(visual);
        visuals = [visual];
        plantVisuals.set(statePlant.id, visuals);
      }
      if (visuals) for (const visual of visuals) applyPlantCareVisual(visual, statePlant);

      const care = getPlantCareState(statePlant);
      const targetCuttings = Math.max(0, care.cuttingsTaken - care.cuttingsSet);
      const existing = cuttingVisuals.get(statePlant.id) ?? [];
      while (existing.length < targetCuttings) {
        const currentCount = [...cuttingVisuals.values()].reduce((sum, list) => sum + list.length, 0);
        existing.push(createCuttingVisual(currentCount));
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
    text: 'DR. GREEN DUMP / DOPEFARM',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 'bold', fill: '#f0f5ff', letterSpacing: 2 },
  });
  const subtitle = new Text({
    text: 'MEDICAL CANNABIS OPERATIONS  /  FACILITY VIEW',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#8fa8c6', letterSpacing: 1.4 },
  });
  const stateLine = new Text({
    text: 'FOUNDATION BUILD  •  FICTIONAL GAME VALUES  •  VERTICAL SLICE IN PROGRESS',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 10, fill: '#d8c89b', wordWrap: true, wordWrapWidth: 380 },
  });
  hud.addChild(panel, title, subtitle, stateLine);
  const resetCamera = (): void => {
    camera.position.copy(avatar.position).add(new THREE.Vector3(0, 4.4, 8));
    controls.target.copy(avatar.position).add(cameraTargetOffset);
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
    syncPlantVisuals(gameState);
    layout();
  };
  onGameStateChanged();
  window.addEventListener('resize', layout);

  const plantRaycaster = new THREE.Raycaster();
  const plantPointer = new THREE.Vector2();
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
    movementVector.set(0, 0, 0);
    const forwardInput = Number(movementKeys.has('w') || movementKeys.has('arrowup')) -
      Number(movementKeys.has('s') || movementKeys.has('arrowdown'));
    const rightInput = Number(movementKeys.has('d') || movementKeys.has('arrowright')) -
      Number(movementKeys.has('a') || movementKeys.has('arrowleft'));
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
      let blocked = false;
      for (const obstacle of movementObstacles) {
        const bounds = new THREE.Box3().setFromObject(obstacle);
        if (candidate.x + avatarRadius > bounds.min.x && candidate.x - avatarRadius < bounds.max.x &&
            candidate.z + avatarRadius > bounds.min.z && candidate.z - avatarRadius < bounds.max.z) {
          blocked = true;
          break;
        }
      }
      if (!blocked) avatar.position.copy(candidate);
      avatar.rotation.y = Math.atan2(-movementVector.x, -movementVector.z);
      walkPhase += delta * 8;
      leftLeg.rotation.x = Math.sin(walkPhase) * 0.42;
      rightLeg.rotation.x = -Math.sin(walkPhase) * 0.42;
    } else {
      leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, 0, 10, delta);
      rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, 0, 10, delta);
    }
    const avatarDelta = new THREE.Vector3().subVectors(avatar.position, previousAvatarPosition);
    camera.position.add(avatarDelta);
    previousAvatarPosition.copy(avatar.position);
    controls.target.copy(avatar.position).add(cameraTargetOffset);
    controls.update();
    renderer.domElement.dataset.playerX = avatar.position.x.toFixed(3);
    renderer.domElement.dataset.playerZ = avatar.position.z.toFixed(3);
    renderer.domElement.dataset.cameraTargetZ = controls.target.z.toFixed(3);
    const primaryPlantId = gameState.plants[0]?.id;
    const primaryPlantVisual = primaryPlantId ? plantVisuals.get(primaryPlantId)?.[0] : undefined;
    if (primaryPlantVisual) {
      const projectedPlant = primaryPlantVisual.getWorldPosition(new THREE.Vector3()).project(camera);
      renderer.domElement.dataset.interactablePlantX = ((projectedPlant.x + 1) * 0.5 * renderer.domElement.clientWidth).toFixed(1);
      renderer.domElement.dataset.interactablePlantY = ((1 - projectedPlant.y) * 0.5 * renderer.domElement.clientHeight).toFixed(1);
    }
    renderer.render(scene, camera);
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

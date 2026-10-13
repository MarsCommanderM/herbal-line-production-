import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Application, Container, Graphics, Text } from 'pixi.js';
import './styles.css';
import type { CommandId, EntityId, GameState, PlantCareState } from '../contracts/domain';
import { createInitialGameState } from './domain/initial-state';
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
    if (gameState.revision === revision) status = { level: 'success', message: 'Autosave gespeichert · Revision ' + revision + '.' };
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

  // Distinct palmate, serrated-looking leaflets make the plant read as cannabis,
  // rather than a generic round-leaf botanical placeholder.
  const leafletGeometry = new THREE.ConeGeometry(0.105, 0.58, 7, 1);
  leafletGeometry.translate(0, 0.29, 0);
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

  const scene = new THREE.Scene();
  const plantVisuals = new Map<string, THREE.Group[]>();
  const cuttingVisuals = new Map<string, THREE.Group[]>();
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
    movementObstacles.push(mesh);
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
          const activePlant = gameState.plants.find((item) => item.id === gameState.ui.selectedEntityId) ?? gameState.plants[0];
          if (activePlant) {
            plant.userData.plantId = activePlant.id;
            plant.userData.baseScale = plant.scale.clone();
            const growLight = new THREE.PointLight(0xddeeff, 0.8, 4);
            growLight.position.set(0, 2.6, 0);
            plant.add(growLight);
            plant.userData.growLight = growLight;
            plantVisuals.set(activePlant.id, [plant]);
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
      candidate.x = THREE.MathUtils.clamp(candidate.x, -10.4, 10.4);
      candidate.z = THREE.MathUtils.clamp(candidate.z, -7.4, 7.4);
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
void boot().then((cleanup) => { dispose = cleanup; }).catch(showFatalError);

if (import.meta.hot) {
  import.meta.hot.dispose(() => dispose?.());
}

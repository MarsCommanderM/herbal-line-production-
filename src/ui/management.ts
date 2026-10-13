import type { EntityId, GameState } from '../../contracts/domain';
import { calculateDailyOperatingCosts, getCashRunwayDays, getFinancialHealth, projectCampaignBalance } from '../domain/finance';
import { ECONOMY_UPGRADES, isEconomyUpgradePurchased } from '../domain/upgrades';
import { getCampaignBalance, isOperationBlocked, type VerticalSliceCommand } from '../domain/vertical-slice';
import { roomSupportsStaffRole } from '../domain/facility';
import { getCampaignGuidance } from './campaign-guidance';
import { getTutorialProgress } from './tutorial';
import { getPlantCareState } from '../domain/plant-care';
import type { CareLevel, PlantCareAction, PlantCareState } from '../../contracts/domain';

type Action = {
  label: string;
  detail: string;
  type: VerticalSliceCommand['type'];
  payload: Record<string, unknown>;
  disabled?: boolean;
};

const entityId = (value: string): EntityId => value as EntityId;

function availableActions(state: GameState): Action[] {
  const actions: Action[] = [];
  const plant = state.plants.find((item) => item.id === state.ui.selectedEntityId) ?? state.plants.find((item) => item.stage === 'active') ?? state.plants[0];
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];

  if (plant && plant.stage === 'active') {
    actions.push({ label: 'Simulationsschritt ausführen', detail: 'Fortschritt im fiktiven Kampagnenmodell aktualisieren.', type: 'PLANT/ADVANCE_FICTIONAL_STEP', payload: { plantId: plant.id } });
  } else if (plant && plant.stage === 'ready_for_harvest' && plant.batchId === null) {
    actions.push({ label: 'Einheit in Batch überführen', detail: 'Den freigegebenen Spielzustand für den nächsten Prozessschritt protokollieren.', type: 'PLANT/HARVEST', payload: { plantId: plant.id } });
  } else if (plant && plant.stage === 'harvested' && plant.batchId === null) {
    actions.push({ label: 'Batch erstellen', detail: 'Herkunft und Einheiten unter einer eindeutigen Batch-ID verbinden.', type: 'BATCH/CREATE', payload: { batchId: entityId('batch-001'), plantIds: [plant.id], profileId: 'fictional-medical-cannabis-batch' } });
  }

  if (batch && batch.status === 'created') {
    const room = state.rooms.find((item) => item.kind === 'processing' && item.unlocked);
    if (room) {
      const blocked = isOperationBlocked(state, 'BATCH/QUEUE');
      actions.push({
        label: 'Verarbeitung einplanen',
        detail: blocked
          ? 'Compliance-Sperre aktiv. Die Verarbeitung bleibt gesperrt, bis Lizenzstatus und Auditfreigabe wieder gültig sind.'
          : 'Kapazität und Compliance prüfen, bevor der Batch eingeplant wird.',
        type: 'BATCH/QUEUE',
        payload: { batchId: batch.id, roomId: room.id },
        disabled: blocked,
      });
    }
  } else if (batch && batch.status === 'queued') {
    const machine = state.machines.find((item) => item.status === 'idle' && item.roomId === batch.currentRoomId);
    if (machine) {
      const blocked = isOperationBlocked(state, 'BATCH/START_PROCESSING');
      actions.push({
        label: 'Spielprozess starten',
        detail: blocked
          ? 'Compliance-Sperre aktiv. Der Spielprozess bleibt gesperrt, bis Lizenzstatus und Auditfreigabe wieder gültig sind.'
          : 'Den rein fiktiven Verarbeitungsschritt starten.',
        type: 'BATCH/START_PROCESSING',
        payload: { batchId: batch.id, machineId: machine.id },
        disabled: blocked,
      });
    }
  } else if (batch && batch.status === 'processing') {
    actions.push({ label: 'Qualitätsprüfung ausführen', detail: 'Die versionierten fiktiven Spielregeln und die Rückverfolgbarkeit prüfen.', type: 'BATCH/SUBMIT_QC', payload: { batchId: batch.id, assessmentId: entityId('assessment-001') } });
  } else if (batch && batch.status === 'awaiting_qc') {
    const assessment = [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id);
    if (assessment && assessment.decision === 'pass') {
      actions.push({ label: 'Batch freigeben', detail: 'Nur bestandene Spiel-QA, vollständige Rückverfolgbarkeit und Compliance erlauben die Freigabe.', type: 'BATCH/RELEASE', payload: { batchId: batch.id } });
    } else if (assessment && (assessment.decision === 'fail' || assessment.decision === 'review')) {
      actions.push({ label: 'Batch ablehnen', detail: 'Die Qualitätsprüfung ist nicht bestanden oder ungeklärt. Dokumentiere die Ablehnung; der Batch wird terminal gesperrt und aus der aktiven Queue entfernt.', type: 'BATCH/REJECT', payload: { batchId: batch.id, reasonCode: assessment.decision === 'fail' ? 'QUALITY_GATE_FAILED' : 'QUALITY_REVIEW_NOT_ACCEPTED' } });
    }
  }

  if (order && order.status === 'available') {
    const blocked = isOperationBlocked(state, 'ORDER/ACCEPT');
    actions.push({
      label: 'Abnehmerauftrag annehmen',
      detail: blocked
        ? 'Compliance-Sperre aktiv. Der Auftrag bleibt gesperrt, bis Lizenzstatus und Auditfreigabe wieder gültig sind.'
        : 'Kundenstatus, Reputation und Lizenzstatus prüfen.',
      type: 'ORDER/ACCEPT',
      payload: { orderId: order.id },
      disabled: blocked,
    });
  } else if (order && order.status === 'accepted') {
    const lots = state.inventoryLots.filter((item) => item.status === 'released' && item.quantityAvailable > item.quantityReserved && item.qualityScore >= order.minQuality);
    if (lots.length > 0) actions.push({ label: 'Freigegebenen Bestand reservieren', detail: 'Die angeforderte Menge atomar aus freigegebenen Lots reservieren.', type: 'ORDER/ALLOCATE', payload: { orderId: order.id, lotIds: lots.map((item) => item.id) } });
  } else if (order && order.status === 'allocated' && order.deliveryId === null) {
    actions.push({ label: 'Lieferung vorbereiten', detail: 'Auftrag, reservierte Lots und Lieferroute verknüpfen.', type: 'DELIVERY/CREATE', payload: { deliveryId: entityId('delivery-001'), orderId: order.id, routeId: 'fictional-route-local-01' } });
  } else if (order && order.status === 'ready_to_ship' && order.deliveryId) {
    const blocked = isOperationBlocked(state, 'DELIVERY/DISPATCH');
    actions.push({
      label: 'Lieferung versenden',
      detail: blocked
        ? 'Compliance-Sperre aktiv. Der Versand bleibt gesperrt, bis Lizenzstatus und Auditfreigabe wieder gültig sind.'
        : 'Lizenzstatus und reservierten Bestand vor dem Versand erneut prüfen.',
      type: 'DELIVERY/DISPATCH',
      payload: { deliveryId: order.deliveryId },
      disabled: blocked,
    });
  } else if (order && order.status === 'shipped' && order.deliveryId) {
    actions.push({ label: 'Wareneingang bestätigen', detail: 'Den Empfang idempotent bestätigen und den Umsatz einmalig verbuchen.', type: 'DELIVERY/CONFIRM', payload: { deliveryId: order.deliveryId, proofCode: 'RX-ACK-001' } });
  }
  for (const staff of state.staff) {
    if (staff.activeAssignmentId !== null) continue;
    const targetRoom = state.rooms.find((room) =>
      room.unlocked && room.id !== staff.assignedRoomId && roomSupportsStaffRole(room.kind, staff.role),
    );
    if (targetRoom) {
      actions.push({
        label: staff.displayName + ': ' + targetRoom.displayName + ' zuweisen',
        detail: 'Die Raumzuordnung wird auf beiden Seiten atomar aktualisiert und auf Rollenkonformität geprüft.',
        type: 'FACILITY/ASSIGN_STAFF',
        payload: { staffId: staff.id, roomId: targetRoom.id },
      });
    }
  }

  for (const machine of state.machines) {
    if (machine.status === 'maintenance') {
      actions.push({
        label: 'Wartung abschließen',
        detail: 'Die fiktive Wartung beendet den Wartungsstatus und erhöht den Zustandswert um bis zu 30 Punkte.',
        type: 'MACHINE/COMPLETE_MAINTENANCE',
        payload: { machineId: machine.id },
      });
    } else if (machine.status === 'idle' && machine.condition < 100) {
      actions.push({
        label: 'Spielstation warten',
        detail: 'Startet eine abstrakte Wartungsaktion. Eine verfügbare Wartungsfachkraft muss im selben Raum zugewiesen sein.',
        type: 'MACHINE/START_MAINTENANCE',
        payload: { machineId: machine.id },
      });
    }
  }

  if (
    getCampaignBalance(state) <= 0
    && !state.economy.ledger.some((entry) => entry.idempotencyKey === 'distress-support:campaign-1')
  ) {
    actions.push({
      label: 'Krisenhilfe aktivieren',
      detail: 'Einmalige fiktive Spielhilfe gleicht den Fehlbetrag aus und stellt mindestens sieben Tage Betriebskosten bereit.',
      type: 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT',
      payload: {},
    });
  }

  for (const upgrade of ECONOMY_UPGRADES) {
    const stateUpgrade = state.upgrades.find((item) => item.id === upgrade.id);
    if (!stateUpgrade || !stateUpgrade.unlocked || isEconomyUpgradePurchased(state, upgrade.id)) continue;
    const cost = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(upgrade.costCents) / 100);
    actions.push({
      label: upgrade.label + ' kaufen',
      detail: upgrade.description + ' Einmalige Spielinvestition: ' + cost + '.',
      type: 'UPGRADE/PURCHASE',
      payload: { upgradeId: upgrade.id },
      disabled: getCampaignBalance(state) < Number(upgrade.costCents),
    });
  }

  actions.push({
    label: 'Tag abschließen',
    detail: 'Schließt den aktuellen Kampagnentag ab und bucht fiktive Tageslöhne sowie Betriebskosten genau einmal ins Finanz-Ledger.',
    type: 'TIME/END_DAY',
    payload: {},
  });
  return actions;
}

function metric(labelText: string, valueText: string): HTMLElement {
  const card = document.createElement('article');
  card.className = 'metric-card';
  const label = document.createElement('span');
  label.className = 'metric-label';
  label.textContent = labelText;
  const value = document.createElement('strong');
  value.className = 'metric-value';
  value.textContent = valueText;
  card.append(label, value);
  return card;
}

function renderFacilityOverview(state: GameState, root: HTMLElement): void {
  root.replaceChildren();
  for (const room of state.rooms) {
    const card = document.createElement('article');
    card.className = 'facility-room-card';
    const title = document.createElement('h3');
    title.textContent = room.displayName;
    const capacity = document.createElement('p');
    capacity.className = 'facility-room-capacity';
    capacity.textContent = 'Belegung: ' + room.occupied + '/' + room.capacity + ' · Zustand: ' + room.condition + '/100';
    const staff = document.createElement('p');
    staff.className = 'facility-room-detail';
    const assignedStaff = room.assignedStaffIds
      .map((id) => state.staff.find((person) => person.id === id)?.displayName)
      .filter((name): name is string => name !== undefined);
    staff.textContent = 'Personal: ' + (assignedStaff.length > 0 ? assignedStaff.join(', ') : 'niemand zugewiesen');
    const machines = document.createElement('p');
    machines.className = 'facility-room-detail';
    const assignedMachines = room.assignedMachineIds
      .map((id) => state.machines.find((machine) => machine.id === id))
      .filter((machine): machine is GameState['machines'][number] => machine !== undefined)
      .map((machine) => machine.id + ' · ' + machine.status + ' · Zustand ' + machine.condition + '/100');
    machines.textContent = 'Spielstationen: ' + (assignedMachines.length > 0 ? assignedMachines.join('; ') : 'keine');
    card.append(title, capacity, staff, machines);
    root.append(card);
  }
}

type CareSettingAction = Extract<PlantCareAction, 'water' | 'light' | 'temperature' | 'humidity' | 'nutrients'>;
type CareSettingField = keyof Pick<PlantCareState, 'waterLevel' | 'lightLevel' | 'temperatureLevel' | 'humidityLevel' | 'nutrientLevel'>;

function renderPlantCare(
  state: GameState,
  root: HTMLElement,
  runCommand: (type: VerticalSliceCommand['type'], payload: Record<string, unknown>) => void,
  selectPlant?: (plantId: EntityId) => void,
): void {
  root.replaceChildren();
  const plant = state.plants.find((item) => item.id === state.ui.selectedEntityId)
    ?? state.plants.find((item) => item.stage === 'active')
    ?? state.plants[0];
  if (!plant) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Noch keine Pflanze angelegt.';
    root.append(empty);
    return;
  }

  const care = getPlantCareState(plant);
  const plantPicker = document.createElement('select');
  plantPicker.className = 'plant-picker';
  plantPicker.setAttribute('aria-label', 'Pflanze für Pflege auswählen');
  for (const item of state.plants) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.id + ' · ' + item.stage.replaceAll('_', ' ');
    option.selected = item.id === plant.id;
    plantPicker.append(option);
  }
  plantPicker.addEventListener('change', () => selectPlant?.(entityId(plantPicker.value)));

  const summary = document.createElement('p');
  summary.className = 'plant-care-summary';
  summary.textContent = 'Ausgewählt: ' + plant.id + ' · Vitalität ' + plant.vitality + '/100 · Stress ' + plant.stressIndex + '/100 · Pflegewerte sind ausschließlich fiktive Spielstufen.';

  const stageNote = document.createElement('p');
  stageNote.className = 'plant-care-note';
  stageNote.textContent = plant.stage === 'active'
    ? 'Die folgenden Aktionen werden am gewählten Pflanzenobjekt simuliert und im Betriebsprotokoll gespeichert.'
    : 'Pflegeaktionen sind für diese Pflanze gesperrt, solange sie nicht aktiv ist.';

  const levels: CareLevel[] = ['low', 'balanced', 'high'];
  const levelNames: Record<CareLevel, string> = { low: 'niedrig', balanced: 'Standard', high: 'hoch' };
  const groups: { action: CareSettingAction; label: string; field: CareSettingField }[] = [
    { action: 'water', label: 'Bewässerung', field: 'waterLevel' },
    { action: 'light', label: 'Licht', field: 'lightLevel' },
    { action: 'temperature', label: 'Temperatur', field: 'temperatureLevel' },
    { action: 'humidity', label: 'Luftfeuchtigkeit', field: 'humidityLevel' },
    { action: 'nutrients', label: 'Nährstoffniveau', field: 'nutrientLevel' },
  ];

  const settingsGrid = document.createElement('div');
  settingsGrid.className = 'care-settings-grid';
  for (const group of groups) {
    const card = document.createElement('div');
    card.className = 'care-setting-card';
    const heading = document.createElement('h4');
    heading.textContent = group.label;
    const buttons = document.createElement('div');
    buttons.className = 'care-setting-buttons';
    for (const level of levels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'care-setting-button';
      button.textContent = group.label + ': ' + levelNames[level].toLowerCase();
      button.setAttribute('aria-pressed', String(care[group.field] === level));
      button.disabled = plant.stage !== 'active';
      button.addEventListener('click', () => runCommand('PLANT/CARE_ACTION', { plantId: plant.id, action: group.action, setting: level }));
      buttons.append(button);
    }
    card.append(heading, buttons);
    settingsGrid.append(card);
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'plant-care-action-row';
  const addAction = (label: string, action: PlantCareAction, disabled: boolean, detail: string): void => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'care-action-button';
    button.textContent = label;
    button.title = detail;
    button.disabled = disabled;
    button.addEventListener('click', () => runCommand('PLANT/CARE_ACTION', { plantId: plant.id, action }));
    actionRow.append(button);
  };
  addAction('Beschneiden', 'prune', plant.stage !== 'active', 'Fiktive Pflegeaktion; verändert die Pflanzenwerte und Darstellung.');
  addAction('Steckling schneiden', 'take_cutting', plant.stage !== 'active', 'Erzeugt ein verfügbares Stecklingsobjekt in der Spielsimulation.');
  addAction(
    'Steckling setzen (' + Math.max(0, care.cuttingsTaken - care.cuttingsSet) + ')',
    'set_cutting',
    plant.stage !== 'active' || care.cuttingsTaken <= care.cuttingsSet || !state.rooms.some((room) => room.id === plant.roomId && room.unlocked && room.occupied < room.capacity),
    'Setzt einen zuvor geschnittenen Spiel-Steckling in die Kampagne.',
  );
  root.append(plantPicker, summary, stageNote, settingsGrid, actionRow);
}

export function renderManagementUI(
  state: GameState,
  runCommand: (type: VerticalSliceCommand['type'], payload: Record<string, unknown>) => void,
  selectPlant?: (plantId: EntityId) => void,
): void {
  const metricsRoot = document.querySelector<HTMLDivElement>('#game-metrics');
  const actionsRoot = document.querySelector<HTMLDivElement>('#game-actions');
  const logRoot = document.querySelector<HTMLDivElement>('#game-log');
  const guidanceRoot = document.querySelector<HTMLDivElement>('#campaign-guidance');
  const tutorialRoot = document.querySelector<HTMLDivElement>('#campaign-tutorial');
  const facilityRoot = document.querySelector<HTMLDivElement>('#facility-overview');
  const plantCareRoot = document.querySelector<HTMLDivElement>('#plant-care');
  if (!metricsRoot || !actionsRoot || !logRoot || !guidanceRoot || !tutorialRoot || !facilityRoot) return;

  const plant = state.plants[0];
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];
  const balance = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(getCampaignBalance(state) / 100);
  const dailyCosts = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(calculateDailyOperatingCosts(state).totalCents / 100);
  const runwayDays = getCashRunwayDays(state);
  const runway = runwayDays === null ? 'Kein Nettoverbrauch' : runwayDays + ' Tage';
  const projectedBalance = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((projectCampaignBalance(state, 30).at(-1)?.closingBalanceCents ?? getCampaignBalance(state)) / 100);
  const financialHealth = ({ stable: 'Stabil', watch: 'Beobachten', critical: 'Kritisch' } as const)[getFinancialHealth(state)];

  metricsRoot.replaceChildren(
    metric('Spieltag', String(state.time.day)),
    metric('Kontostand', balance),
    metric('Tageskosten', dailyCosts),
    metric('Reichweite (0 € Umsatz)', runway),
    metric('30-Tage-Szenario (0 € Umsatz)', projectedBalance),
    metric('Finanzstatus', financialHealth),
    metric('Lizenzstatus', state.compliance.licenseStatus.replaceAll('_', ' ')),
    metric('Einheitenstatus', plant ? plant.stage.replaceAll('_', ' ') : '—'),
    metric('Batchstatus', batch ? batch.status.replaceAll('_', ' ') : 'Kein Batch'),
    metric('Abnehmernauftrag', order ? order.status.replaceAll('_', ' ') : 'Kein Auftrag'),
  );

  renderFacilityOverview(state, facilityRoot);
  if (plantCareRoot) renderPlantCare(state, plantCareRoot, runCommand, selectPlant);

  const guidance = getCampaignGuidance(state);
  guidanceRoot.replaceChildren();
  guidanceRoot.dataset.tone = guidance.tone;
  const guidanceCard = document.createElement('article');
  guidanceCard.className = 'guidance-card';
  const guidanceTitle = document.createElement('h3');
  guidanceTitle.textContent = guidance.title;
  const guidanceDetail = document.createElement('p');
  guidanceDetail.textContent = guidance.detail;
  const guidanceNext = document.createElement('p');
  guidanceNext.className = 'guidance-next';
  const nextLabel = document.createElement('span');
  nextLabel.textContent = 'Empfohlener nächster Schritt';
  const nextValue = document.createElement('strong');
  nextValue.textContent = guidance.nextStep;
  guidanceNext.append(nextLabel, nextValue);
  guidanceCard.append(guidanceTitle, guidanceDetail, guidanceNext);
  guidanceRoot.append(guidanceCard);

  const tutorial = getTutorialProgress(state);
  tutorialRoot.dataset.status = tutorial.status;
  const tutorialCard = document.createElement('article');
  tutorialCard.className = 'tutorial-card';
  const tutorialStep = document.createElement('p');
  tutorialStep.className = 'tutorial-step';
  tutorialStep.textContent = 'Schritt ' + tutorial.step + ' von ' + tutorial.total;
  const tutorialProgress = document.createElement('progress');
  tutorialProgress.id = 'tutorial-progress';
  tutorialProgress.max = tutorial.total;
  tutorialProgress.value = tutorial.step;
  tutorialProgress.setAttribute('aria-label', 'Einführungsfortschritt');
  tutorialProgress.setAttribute('aria-valuetext', 'Schritt ' + tutorial.step + ' von ' + tutorial.total);
  const tutorialTitle = document.createElement('h3');
  tutorialTitle.id = 'tutorial-heading';
  tutorialTitle.textContent = tutorial.title;
  const tutorialDetail = document.createElement('p');
  tutorialDetail.textContent = tutorial.detail;
  tutorialCard.append(tutorialStep, tutorialProgress, tutorialTitle, tutorialDetail);
  tutorialRoot.replaceChildren(tutorialCard);

  actionsRoot.replaceChildren();
  const actions = availableActions(state);
  if (actions.length === 0) {
    const message = document.createElement('p');
    const assessment = batch ? [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id) : undefined;
    if (batch && batch.status === 'awaiting_qc' && assessment && assessment.decision !== 'pass') {
      message.textContent = 'Batch bleibt gesperrt: Die Spiel-QA verlangt eine Prüfung. Eine Freigabe ist nicht verfügbar.';
    } else if (order && order.status === 'delivered') {
      message.textContent = 'Kampagnenziel erreicht: Auftrag ausgeliefert und Umsatz verbucht.';
    } else {
      message.textContent = 'Aktuell ist keine zulässige Aktion verfügbar.';
    }
    message.className = 'empty-state';
    actionsRoot.append(message);
  }
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-action';
    button.textContent = action.label;
    button.title = action.detail;
    button.disabled = action.disabled ?? false;
    button.addEventListener('click', () => runCommand(action.type, action.payload));
    actionsRoot.append(button);
    const detail = document.createElement('p');
    detail.className = 'action-detail';
    detail.textContent = action.detail;
    actionsRoot.append(detail);
  }

  if (ECONOMY_UPGRADES.length === 0) {
    const upgradeNotice = document.createElement('p');
    upgradeNotice.className = 'action-detail upgrade-policy-notice';
    upgradeNotice.setAttribute('role', 'note');
    upgradeNotice.textContent = 'Upgrades derzeit nicht verfügbar: Für sensor_pack_1 und drying_rack_1 sind noch keine bestätigten fiktiven Preise oder Wirkungen definiert. Es werden daher keine unbestätigten Upgrades angeboten.';
    actionsRoot.append(upgradeNotice);
  }

  logRoot.replaceChildren();
  for (const entry of [...state.logs].slice(-5).reverse()) {
    const item = document.createElement('article');
    item.className = 'log-entry';
    const code = document.createElement('strong');
    code.textContent = entry.code.replaceAll('_', ' ');
    const message = document.createElement('p');
    message.textContent = entry.message;
    item.append(code, message);
    logRoot.append(item);
  }
}

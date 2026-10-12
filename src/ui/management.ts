import type { EntityId, GameState } from '../../contracts/domain';
import { getCampaignBalance, type VerticalSliceCommand } from '../domain/vertical-slice';
import { roomSupportsStaffRole } from '../domain/facility';
import { getCampaignGuidance } from './campaign-guidance';

type Action = {
  label: string;
  detail: string;
  type: VerticalSliceCommand['type'];
  payload: Record<string, unknown>;
};

const entityId = (value: string): EntityId => value as EntityId;

function availableActions(state: GameState): Action[] {
  const actions: Action[] = [];
  const plant = state.plants[0];
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];

  if (plant && plant.stage === 'active') {
    actions.push({ label: 'Simulationsschritt ausführen', detail: 'Fortschritt im fiktiven Kampagnenmodell aktualisieren.', type: 'PLANT/ADVANCE_FICTIONAL_STEP', payload: { plantId: plant.id } });
  } else if (plant && plant.stage === 'ready_for_harvest' && plant.batchId === null) {
    actions.push({ label: 'Einheit in Batch überführen', detail: 'Den freigegebenen Spielzustand für den nächsten Prozessschritt protokollieren.', type: 'PLANT/HARVEST', payload: { plantId: plant.id } });
  } else if (plant && plant.stage === 'harvested' && plant.batchId === null) {
    actions.push({ label: 'Batch erstellen', detail: 'Herkunft und Einheiten unter einer eindeutigen Batch-ID verbinden.', type: 'BATCH/CREATE', payload: { batchId: entityId('batch-001'), plantIds: [plant.id], profileId: 'fictional-botanical-batch' } });
  }

  if (batch && batch.status === 'created') {
    const room = state.rooms.find((item) => item.kind === 'processing' && item.unlocked);
    if (room) actions.push({ label: 'Verarbeitung einplanen', detail: 'Kapazität und Compliance prüfen, bevor der Batch eingeplant wird.', type: 'BATCH/QUEUE', payload: { batchId: batch.id, roomId: room.id } });
  } else if (batch && batch.status === 'queued') {
    const machine = state.machines.find((item) => item.status === 'idle' && item.roomId === batch.currentRoomId);
    if (machine) actions.push({ label: 'Spielprozess starten', detail: 'Den rein fiktiven Verarbeitungsschritt starten.', type: 'BATCH/START_PROCESSING', payload: { batchId: batch.id, machineId: machine.id } });
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
    actions.push({ label: 'Abnehmerauftrag annehmen', detail: 'Kundenstatus, Reputation und Lizenzstatus prüfen.', type: 'ORDER/ACCEPT', payload: { orderId: order.id } });
  } else if (order && order.status === 'accepted') {
    const lots = state.inventoryLots.filter((item) => item.status === 'released' && item.quantityAvailable > item.quantityReserved && item.qualityScore >= order.minQuality);
    if (lots.length > 0) actions.push({ label: 'Freigegebenen Bestand reservieren', detail: 'Die angeforderte Menge atomar aus freigegebenen Lots reservieren.', type: 'ORDER/ALLOCATE', payload: { orderId: order.id, lotIds: lots.map((item) => item.id) } });
  } else if (order && order.status === 'allocated' && order.deliveryId === null) {
    actions.push({ label: 'Lieferung vorbereiten', detail: 'Auftrag, reservierte Lots und Lieferroute verknüpfen.', type: 'DELIVERY/CREATE', payload: { deliveryId: entityId('delivery-001'), orderId: order.id, routeId: 'fictional-route-local-01' } });
  } else if (order && order.status === 'ready_to_ship' && order.deliveryId) {
    actions.push({ label: 'Lieferung versenden', detail: 'Lizenzstatus und reservierten Bestand vor dem Versand erneut prüfen.', type: 'DELIVERY/DISPATCH', payload: { deliveryId: order.deliveryId } });
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

export function renderManagementUI(
  state: GameState,
  runCommand: (type: VerticalSliceCommand['type'], payload: Record<string, unknown>) => void,
): void {
  const metricsRoot = document.querySelector<HTMLDivElement>('#game-metrics');
  const actionsRoot = document.querySelector<HTMLDivElement>('#game-actions');
  const logRoot = document.querySelector<HTMLDivElement>('#game-log');
  const guidanceRoot = document.querySelector<HTMLDivElement>('#campaign-guidance');
  const facilityRoot = document.querySelector<HTMLDivElement>('#facility-overview');
  if (!metricsRoot || !actionsRoot || !logRoot || !guidanceRoot || !facilityRoot) return;

  const plant = state.plants[0];
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];
  const balance = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(getCampaignBalance(state) / 100);

  metricsRoot.replaceChildren(
    metric('Spieltag', String(state.time.day)),
    metric('Kontostand', balance),
    metric('Lizenzstatus', state.compliance.licenseStatus.replaceAll('_', ' ')),
    metric('Einheitenstatus', plant ? plant.stage.replaceAll('_', ' ') : '—'),
    metric('Batchstatus', batch ? batch.status.replaceAll('_', ' ') : 'Kein Batch'),
    metric('Abnehmernauftrag', order ? order.status.replaceAll('_', ' ') : 'Kein Auftrag'),
  );

  renderFacilityOverview(state, facilityRoot);

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
    button.addEventListener('click', () => runCommand(action.type, action.payload));
    actionsRoot.append(button);
    const detail = document.createElement('p');
    detail.className = 'action-detail';
    detail.textContent = action.detail;
    actionsRoot.append(detail);
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

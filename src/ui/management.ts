import type { EntityId, GameState } from '../../contracts/domain';
import { getCampaignBalance, type VerticalSliceCommand } from '../domain/vertical-slice';

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
    actions.push({ label: 'Batch erstellen', detail: 'Herkunft und Einheiten unter einer eindeutigen Batch-ID verbinden.', type: 'BATCH/CREATE', payload: { batchId: entityId('batch-001'), plantIds: [plant.id], profileId: 'fictional-medical-cannabis-batch' } });
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

export function renderManagementUI(
  state: GameState,
  runCommand: (type: VerticalSliceCommand['type'], payload: Record<string, unknown>) => void,
): void {
  const metricsRoot = document.querySelector<HTMLDivElement>('#game-metrics');
  const actionsRoot = document.querySelector<HTMLDivElement>('#game-actions');
  const logRoot = document.querySelector<HTMLDivElement>('#game-log');
  if (!metricsRoot || !actionsRoot || !logRoot) return;

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

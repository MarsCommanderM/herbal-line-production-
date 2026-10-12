import type { EntityId, GameState } from '../../contracts/domain';
import { getCampaignBalance, ROOM_CATALOG, type VerticalSliceCommand } from '../domain/vertical-slice';

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
  const expansion = ROOM_CATALOG.find((item) => item.definitionId === 'production_room_small');
  if (expansion && !state.rooms.some((room) => room.definitionId === expansion.definitionId)
    && getCampaignBalance(state) >= expansion.costCents) {
    actions.push({
      label: 'Kleinen Produktionsraum kaufen',
      detail: 'Eine definierte Raum-Erweiterung als Investition erwerben; Budget und Raum-ID werden geprüft.',
      type: 'ROOM/PURCHASE',
      payload: { roomId: entityId('room-production-expansion-001'), definitionId: expansion.definitionId },
    });
  }

  const maintenanceMachine = state.machines.find((machine) => Number(machine.condition) < 100 || machine.status === 'broken');
  if (maintenanceMachine) {
    const maintenanceAssignment = state.assignments.find((assignment) =>
      assignment.taskCode === 'MACHINE/MAINTENANCE'
      && assignment.entityId === maintenanceMachine.id
      && assignment.status === 'active',
    );
    if (maintenanceAssignment && maintenanceMachine.status === 'maintenance') {
      actions.push({
        label: 'Wartung abschließen',
        detail: 'Die aktive Wartung abschließen, den Maschinenzustand verbessern und Personalenergie verbuchen.',
        type: 'MACHINE/COMPLETE_MAINTENANCE',
        payload: { machineId: maintenanceMachine.id, assignmentId: maintenanceAssignment.id },
      });
    } else if (maintenanceAssignment) {
      actions.push({
        label: 'Wartung starten',
        detail: 'Maschine und Wartungszuweisung prüfen, bevor die Anlage in den Wartungszustand wechselt.',
        type: 'MACHINE/START_MAINTENANCE',
        payload: { machineId: maintenanceMachine.id, assignmentId: maintenanceAssignment.id },
      });
    } else {
      const availableTechnician = state.staff.find((staff) => staff.role === 'maintenance' && staff.activeAssignmentId === null);
      if (availableTechnician) {
        actions.push({
          label: 'Wartungsauftrag zuweisen',
          detail: 'Einen verfügbaren Wartungsspezialisten exklusiv dieser Maschine zuweisen.',
          type: 'STAFF/ASSIGN',
          payload: {
            assignmentId: entityId('assignment-maintenance-' + (state.revision + 1)),
            staffId: availableTechnician.id,
            taskCode: 'MACHINE/MAINTENANCE',
            entityId: maintenanceMachine.id,
          },
        });
      }
    }
  }

  const openViolation = state.compliance.violations.find((item) => item.resolvedAt === null);
  if (openViolation) {
    actions.push({
      label: 'Korrekturmaßnahme bestätigen',
      detail: 'Die Maßnahme wird protokolliert; Wiederfreigabe ist erst nach dem Audit zulässig.',
      type: 'COMPLIANCE/RESOLVE_VIOLATION',
      payload: { violationId: openViolation.id, resolutionCode: 'CORRECTIVE_ACTION_VERIFIED' },
    });
  } else if (state.compliance.licenseStatus !== 'valid') {
    actions.push({
      label: 'Compliance-Audit ausführen',
      detail: 'Offene Vorfälle, Lizenzstatus und Operationssperren erneut prüfen.',
      type: 'COMPLIANCE/START_AUDIT',
      payload: { auditId: entityId('audit-' + (state.revision + 1)) },
    });
  } else if (state.compliance.violations.length === 0) {
    actions.push({
      label: 'Simulierten Compliance-Vorfall erfassen',
      detail: 'Fiktiven schweren Rückverfolgbarkeitsvorfall erfassen, um Sperrung, Korrekturmaßnahme und Audit zu demonstrieren.',
      type: 'COMPLIANCE/RECORD_VIOLATION',
      payload: {
        violationId: entityId('violation-' + (state.revision + 1)),
        code: 'SIMULATED_TRACE_GAP',
        severity: 'high',
        relatedEntityIds: plant ? [plant.id] : [],
        operationCodes: ['BATCH/RELEASE'],
      },
    });
  }
  return actions;
}

type QueueLevel = 'warning' | 'error';

type QueueEntry = {
  title: string;
  status: string;
  detail: string;
  level?: QueueLevel | undefined;
  capacity?: { used: number; total: number; label: string };
};

function queueGroup(title: string, entries: QueueEntry[], emptyMessage: string): HTMLElement {
  const group = document.createElement('section');
  group.className = 'queue-group';
  const heading = document.createElement('h3');
  heading.textContent = title;
  group.append(heading);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'queue-empty';
    empty.textContent = emptyMessage;
    group.append(empty);
    return group;
  }

  const list = document.createElement('ul');
  list.className = 'queue-list';
  list.setAttribute('aria-label', title);
  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = 'queue-item';
    const row = document.createElement('div');
    row.className = 'queue-item-heading';
    const itemTitle = document.createElement('strong');
    itemTitle.className = 'queue-item-title';
    itemTitle.textContent = entry.title;
    const status = document.createElement('span');
    status.className = 'queue-status';
    status.textContent = entry.status;
    if (entry.level) status.dataset.level = entry.level;
    row.append(itemTitle, status);

    const detail = document.createElement('p');
    detail.className = 'queue-item-detail';
    detail.textContent = entry.detail;
    item.append(row, detail);
    if (entry.capacity) {
      const meter = document.createElement('progress');
      meter.className = 'queue-capacity-meter';
      meter.max = Math.max(1, entry.capacity.total);
      meter.value = Math.max(0, Math.min(entry.capacity.used, meter.max));
      meter.setAttribute('aria-label', entry.capacity.label);
      item.append(meter);
    }
    list.append(item);
  }
  group.append(list);
  return group;
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
  const queuesRoot = document.querySelector<HTMLDivElement>('#operations-queues');
  if (!metricsRoot || !actionsRoot || !logRoot || !queuesRoot) return;

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
    metric('Abnehmerauftrag', order ? order.status.replaceAll('_', ' ') : 'Kein Auftrag'),
  );

  actionsRoot.replaceChildren();
  const actions = availableActions(state);
  if (order && order.status === 'delivered') {
    const completion = document.createElement('p');
    completion.className = 'empty-state campaign-complete';
    completion.textContent = 'Kampagnenziel erreicht: Auftrag ausgeliefert und Umsatz verbucht.';
    actionsRoot.append(completion);
  }
  if (actions.length === 0) {
    const assessment = batch ? [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id) : undefined;
    if (batch && batch.status === 'awaiting_qc' && assessment && assessment.decision !== 'pass') {
      const message = document.createElement('p');
      message.textContent = 'Batch bleibt gesperrt: Die Spiel-QA verlangt eine Prüfung. Eine Freigabe ist nicht verfügbar.';
      message.className = 'empty-state';
      actionsRoot.append(message);
    } else if (!(order && order.status === 'delivered')) {
      const message = document.createElement('p');
      message.textContent = 'Aktuell ist keine zulässige Aktion verfügbar.';
      message.className = 'empty-state';
      actionsRoot.append(message);
    }
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

  queuesRoot.replaceChildren(
    queueGroup(
      'Prozesspipeline',
      state.batches.map((item) => {
        const room = item.currentRoomId ? state.rooms.find((candidate) => candidate.id === item.currentRoomId) : undefined;
        const detail = [
          String(item.quantity) + ' fiktive Einheiten',
          room ? 'Raum: ' + room.displayName : 'Noch keinem Raum zugewiesen',
          item.holdReason ? 'Sperrgrund: ' + item.holdReason : 'Trace-Einträge: ' + item.trace.length,
        ].join(' · ');
        return {
          title: 'Batch ' + item.id,
          status: item.status.replaceAll('_', ' '),
          detail,
          level: item.holdReason || item.status === 'awaiting_qc' ? 'warning' as const : undefined,
        };
      }),
      'Keine aktiven Batches.',
    ),
    queueGroup(
      'Raumkapazitäten',
      state.rooms.map((room) => ({
        title: room.displayName,
        status: room.unlocked ? 'verfügbar' : 'gesperrt',
        detail: room.occupied + ' / ' + room.capacity + ' Plätze belegt · Zustand ' + room.condition + ' / 100',
        level: room.unlocked ? undefined : 'warning' as const,
        capacity: { used: room.occupied, total: room.capacity, label: 'Belegung ' + room.displayName },
      })),
      'Keine Räume konfiguriert.',
    ),
    queueGroup(
      'Anlagenstatus',
      state.machines.map((machine) => {
        const room = state.rooms.find((candidate) => candidate.id === machine.roomId);
        return {
          title: 'Maschine ' + machine.id,
          status: machine.status.replaceAll('_', ' '),
          detail: (room ? 'Raum: ' + room.displayName : 'Raum unbekannt')
            + ' · Zustand ' + machine.condition + ' / 100'
            + (machine.activeJobId ? ' · Aktiver Auftrag: ' + machine.activeJobId : ''),
          level: machine.status === 'idle' || machine.status === 'active' ? undefined : 'warning' as const,
        };
      }),
      'Keine Anlagen registriert.',
    ),
    queueGroup(
      'Compliance & Korrekturmaßnahmen',
      state.compliance.violations.map((item) => ({
        title: 'Vorfall ' + item.id,
        status: item.resolvedAt === null ? 'offen' : 'korrigiert',
        detail: item.code + ' · ' + item.severity + ' · ' + (item.resolutionCode ?? 'Korrekturmaßnahme ausstehend')
          + ' · ' + (item.operationCodes ?? []).join(', '),
        level: item.resolvedAt === null ? 'warning' as const : undefined,
      })),
      'Keine Compliance-Vorfälle protokolliert.',
    ),
    queueGroup(
      'Aufträge & Auslieferung',
      state.orders.map((item) => {
        const customer = state.customers.find((candidate) => candidate.id === item.customerId);
        const delivery = item.deliveryId ? state.deliveries.find((candidate) => candidate.id === item.deliveryId) : undefined;
        return {
          title: 'Auftrag ' + item.id,
          status: item.status.replaceAll('_', ' '),
          detail: (customer ? customer.name : 'Kunde unbekannt')
            + ' · ' + item.requestedQuantity + ' Einheiten angefordert'
            + ' · Lieferung: ' + (delivery ? delivery.status.replaceAll('_', ' ') : 'noch nicht angelegt'),
          level: item.status === 'delivered' ? undefined : item.status === 'available' ? undefined : 'warning' as const,
        };
      }),
      'Keine Aufträge vorhanden.',
    ),
  );

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

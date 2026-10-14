import type {
  BatchState,
  Score0To100,
  EntityId,
  EventId,
  GameState,
  GameLogEntry,
  QualityAssessment,
  PlantState,
  InventoryLotState,
  LedgerEntry,
  SimulationMinute,
  TraceEntry,
  PlantCareAction,
} from '../../contracts/domain';
import type { CommandBase, CommandFailureCode, DomainCommand, CommandResult } from '../../contracts/commands';
import type { DomainEvent } from '../../contracts/events';
import { calculateDailyOperatingCosts, createDailyOperatingLedgerEntries, getBalanceCents } from './finance';
import { getEconomyUpgradeDefinition } from './upgrades';
import { validateGameStateInvariants } from './invariants';
import { clampScore, roomSupportsStaffRole, validateFacilityInvariants } from './facility';
import { reserveInventory, transitionBatch } from './transitions';
import { DEFAULT_PLANT_CARE, getPlantCareState, isCareLevel } from './plant-care';
import { GAME_BALANCE } from './balance';

export type VerticalSliceCommand = Extract<DomainCommand, {
  type:
    | 'SOURCE/RECEIVE'
    | 'SOURCE/INSPECT'
    | 'PLANT/CREATE'
    | 'PLANT/REJECT'
    | 'PLANT/MOVE'
    | 'PLANT/ADVANCE_FICTIONAL_STEP'
    | 'PLANT/HARVEST'
    | 'PLANT/CARE_ACTION'
    | 'BATCH/CREATE'
    | 'BATCH/QUEUE'
    | 'BATCH/START_PROCESSING'
    | 'BATCH/SUBMIT_QC'
    | 'BATCH/RELEASE'
    | 'BATCH/REJECT'
    | 'ORDER/ACCEPT'
    | 'ORDER/ALLOCATE'
    | 'DELIVERY/CREATE'
    | 'DELIVERY/DISPATCH'
    | 'DELIVERY/CONFIRM'
    | 'FACILITY/ASSIGN_STAFF'
    | 'FACILITY/UNASSIGN_STAFF'
    | 'FACILITY/MOVE_MACHINE'
    | 'MACHINE/START_MAINTENANCE'
    | 'MACHINE/COMPLETE_MAINTENANCE'
    | 'TIME/END_DAY'
    | 'UPGRADE/PURCHASE'
    | 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT'
    | 'COMPLIANCE/START_AUDIT'
    | 'COMPLIANCE/COMPLETE_AUDIT'
    | 'COMPLIANCE/RECORD_INCIDENT'
    | 'COMPLIANCE/RECORD_CORRECTIVE_ACTION'
    | 'COMPLIANCE/SUBMIT_CORRECTIVE_ACTION'
    | 'COMPLIANCE/VERIFY_CORRECTIVE_ACTION'
    | 'COMPLIANCE/FINALIZE_RECOVERY'
}>;

const entityId = (value: string): EntityId => value as EntityId;
const eventId = (value: string): EventId => value as EventId;
const minute = (value: number): SimulationMinute => value as SimulationMinute;

function failure(state: GameState, code: CommandFailureCode, message: string): CommandResult {
  return { ok: false, state, error: { code, message } };
}

function eventBase(state: GameState, command: CommandBase, entity: EntityId, suffix = 1) {
  return {
    eventId: eventId('event-' + command.commandId + '-' + suffix),
    simulationMinute: state.time.totalMinutes,
    schemaVersion: 1 as const,
    entityId: entity,
  };
}

function logEntry(state: GameState, command: CommandBase, code: string, message: string, relatedEntityIds: EntityId[]): GameLogEntry {
  return {
    id: entityId('log-' + (state.revision + 1)),
    at: state.time.totalMinutes,
    category: 'gameplay',
    code,
    message,
    actorId: command.actorId,
    relatedEntityIds,
  };
}

function commit(
  state: GameState,
  command: CommandBase,
  patch: Partial<GameState>,
  events: DomainEvent[],
  code: string,
  message: string,
  relatedEntityIds: EntityId[],
): CommandResult {
  const next: GameState = {
    ...state,
    ...patch,
    revision: state.revision + 1,
    logs: [...state.logs, logEntry(state, command, code, message, relatedEntityIds)],
  };
  const violations = validateGameStateInvariants(next);
  const firstViolation = violations[0];
  if (firstViolation) {
    return failure(state, 'PRECONDITION_FAILED', 'Die Aktion verletzt eine Zustandsinvariante (' + firstViolation.code + '): ' + firstViolation.message);
  }
  const facilityViolation = validateFacilityInvariants(next)[0];
  if (facilityViolation) {
    return failure(state, 'PRECONDITION_FAILED', 'Aktion verletzt die Anlageninvarianten: ' + facilityViolation.message);
  }
  return { ok: true, state: next, events };
}

function traceFromEvent(event: DomainEvent, actorId: EntityId, noteCode: string, relatedEntityIds: EntityId[]): TraceEntry {
  return {
    eventId: event.eventId,
    simulationMinute: event.simulationMinute,
    eventType: event.type,
    actorId,
    entityId: event.entityId,
    noteCode,
    relatedEntityIds,
  };
}

function withTrace(batch: BatchState, event: DomainEvent, actorId: EntityId, noteCode: string, relatedEntityIds: EntityId[]): BatchState {
  return { ...batch, trace: [...batch.trace, traceFromEvent(event, actorId, noteCode, relatedEntityIds)] };
}

function hasCompleteTrace(state: GameState, batch: BatchState): boolean {
  if (batch.plantIds.length === 0 || batch.sourceLotIds.length === 0 || batch.trace.length === 0) return false;
  return batch.plantIds.every((plantId) => {
    const plant = state.plants.find((item) => item.id === plantId);
    if (!plant || plant.stage !== 'harvested' || plant.batchId !== batch.id) return false;
    const source = state.sourceLots.find((item) => item.id === plant.sourceLotId);
    return Boolean(source && source.status === 'accepted' && source.traceEventIds.length > 0 && batch.sourceLotIds.includes(source.id));
  });
}

export function isOperationBlocked(state: GameState, operationCode: string): boolean {
  return state.compliance.licenseStatus === 'suspended'
    || state.compliance.licenseStatus === 'recovery_review'
    || state.compliance.blockedOperationCodes.includes(operationCode);
}

function nextTime(state: GameState): GameState['time'] {
  // totalMinutes is elapsed simulation time from the campaign start; the campaign starts at 08:00.
  const total = Number(state.time.totalMinutes) + 60;
  const absoluteMinuteOfDay = (480 + total) % 1440;
  return {
    ...state.time,
    totalMinutes: minute(total),
    day: Math.floor((480 + total) / 1440) + 1,
    minuteOfDay: absoluteMinuteOfDay,
  };
}

function qualityScoreFor(state: GameState, batch: BatchState): number {
  const plants = batch.plantIds.map((id) => state.plants.find((plant) => plant.id === id)).filter((plant) => plant !== undefined);
  if (plants.length === 0) return 0;
  const potential = plants.reduce((sum, plant) => sum + plant.qualityPotential, 0) / plants.length;
  const contamination = plants.reduce((sum, plant) => sum + plant.contaminationIndex, 0) / plants.length;
  return Math.max(0, Math.min(100, Math.round(potential - contamination * 0.5)));
}

export function applyVerticalSliceCommand(state: GameState, command: VerticalSliceCommand): CommandResult {
  if (command.expectedRevision !== state.revision) return failure(state, 'STALE_REVISION', 'Der Spielstand wurde zwischenzeitlich geändert.');
  if (command.actorId !== state.player.id) return failure(state, 'COMPLIANCE_BLOCKED', 'Nur der aktuelle Kampagnenleiter darf diese Aktion ausführen.');

  switch (command.type) {
    case 'ECONOMY/ACTIVATE_DISTRESS_SUPPORT': {
      const idempotencyKey = 'distress-support:campaign-1';
      if (state.economy.ledger.some((entry) => entry.idempotencyKey === idempotencyKey)) {
        return failure(state, 'DUPLICATE_COMMAND', 'Die einmalige Krisenhilfe wurde bereits verwendet.');
      }
      const balance = Number(getBalanceCents(state.economy));
      if (balance > 0) return failure(state, 'PRECONDITION_FAILED', 'Krisenhilfe ist erst bei ausgeschöpftem Spielbudget verfügbar.');
      const dailyCosts = calculateDailyOperatingCosts(state).totalCents;
      const amount = Math.max(2_500_000, -balance + dailyCosts * 7);
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        return failure(state, 'PRECONDITION_FAILED', 'Der erforderliche Krisenhilfebetrag liegt außerhalb des zulässigen Zahlenbereichs.');
      }
      const ledgerEntry: LedgerEntry = {
        id: entityId('ledger-distress-support-001'),
        simulationMinute: state.time.totalMinutes,
        account: 'grant',
        amountCents: amount as LedgerEntry['amountCents'],
        referenceId: state.player.id,
        reasonCode: 'DISTRESS_SUPPORT_GRANT',
        idempotencyKey,
      };
      const supportEvent: DomainEvent = {
        ...eventBase(state, command, state.player.id, 1),
        type: 'economy.distress_support_granted',
        ledgerEntryId: ledgerEntry.id,
        amountCents: amount,
        daysOfRunway: 7,
      };
      const ledgerEvent: DomainEvent = {
        ...eventBase(state, command, state.player.id, 2),
        type: 'finance.ledger_posted',
        ledgerEntryId: ledgerEntry.id,
        amountCents: amount,
        account: 'grant',
      };
      return commit(state, command, {
        economy: { ...state.economy, ledger: [...state.economy.ledger, ledgerEntry] },
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, {
            id: entityId('notification-distress-support-001'),
            code: 'DISTRESS_SUPPORT_GRANTED',
            level: 'success',
            title: 'Krisenhilfe aktiviert',
            message: 'Einmalige fiktive Unterstützung wurde gebucht. Der Betrag deckt den bestehenden Fehlbetrag und mindestens sieben Tage Betriebskosten.',
            createdAt: state.time.totalMinutes,
            read: false,
          }],
        },
      }, [supportEvent, ledgerEvent], 'DISTRESS_SUPPORT_GRANTED', 'Krisenhilfe gebucht; die Kampagne erhält mindestens sieben Tage Betriebsspielraum.', [state.player.id, ledgerEntry.id]);
    }
    case 'UPGRADE/PURCHASE': {
      const definition = getEconomyUpgradeDefinition(command.upgradeId);
      if (!definition) return failure(state, 'NOT_FOUND', 'Dieses Spielupgrade ist nicht verfügbar.');
      const upgrade = state.upgrades.find((item) => item.id === definition.id);
      if (!upgrade || !upgrade.unlocked) return failure(state, 'PRECONDITION_FAILED', 'Dieses Upgrade ist noch nicht freigeschaltet.');
      if (upgrade.purchasedAt !== null) return failure(state, 'INVALID_TRANSITION', 'Dieses Upgrade wurde bereits gekauft.');
      const balance = getCampaignBalance(state);
      if (balance < Number(definition.costCents)) {
        return failure(state, 'INSUFFICIENT_FUNDS', 'Für dieses Upgrade reicht der aktuelle Kontostand nicht aus.');
      }
      const idempotencyKey = 'upgrade-purchase:' + definition.id;
      if (state.economy.ledger.some((entry) => entry.idempotencyKey === idempotencyKey)) {
        return failure(state, 'DUPLICATE_COMMAND', 'Für dieses Upgrade existiert bereits eine Finanzbuchung.');
      }
      const ledgerEntry: LedgerEntry = {
        id: entityId('ledger-upgrade-' + definition.id),
        simulationMinute: state.time.totalMinutes,
        account: 'investment',
        amountCents: definition.costCents,
        referenceId: entityId('upgrade-' + definition.id),
        reasonCode: 'UPGRADE_PURCHASE_' + definition.id.toUpperCase().replaceAll('-', '_'),
        idempotencyKey,
      };
      const upgradeEvent: DomainEvent = {
        ...eventBase(state, command, state.player.id, 1),
        type: 'upgrade.purchased',
        upgradeId: definition.id,
        costCents: Number(definition.costCents),
      };
      const ledgerEvent: DomainEvent = {
        ...eventBase(state, command, state.player.id, 2),
        type: 'finance.ledger_posted',
        ledgerEntryId: ledgerEntry.id,
        amountCents: Number(ledgerEntry.amountCents),
        account: ledgerEntry.account,
      };
      return commit(state, command, {
        upgrades: state.upgrades.map((item) => {
          if (item.id === definition.id) return { ...item, purchasedAt: state.time.totalMinutes };
          const dependentDefinition = getEconomyUpgradeDefinition(item.id);
          if (dependentDefinition?.prerequisiteUpgradeId === definition.id) return { ...item, unlocked: true };
          return item;
        }),
        economy: { ...state.economy, ledger: [...state.economy.ledger, ledgerEntry] },
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, {
            id: entityId('notification-upgrade-' + definition.id),
            code: 'ECONOMY_UPGRADE_PURCHASED',
            level: 'success',
            title: definition.label,
            message: definition.description,
            createdAt: state.time.totalMinutes,
            read: false,
          }],
        },
      }, [upgradeEvent, ledgerEvent], 'ECONOMY_UPGRADE_PURCHASED', definition.label + ' gekauft. ' + definition.description, [state.player.id, ledgerEntry.id, entityId('upgrade-' + definition.id)]);
    }
    case 'TIME/END_DAY': {
      if (!Number.isSafeInteger(state.time.minuteOfDay) || state.time.minuteOfDay < 0 || state.time.minuteOfDay >= 1440) {
        return failure(state, 'PRECONDITION_FAILED', 'Die aktuelle Spielzeit ist ungültig; der Tag kann nicht abgeschlossen werden.');
      }
      const completedDay = state.time.day;
      const nextDay = completedDay + 1;
      const minutesToNextDayStart = ((480 - state.time.minuteOfDay + 1440) % 1440) || 1440;
      const totalMinutes = Number(state.time.totalMinutes) + minutesToNextDayStart;
      if (!Number.isSafeInteger(totalMinutes) || totalMinutes < 0) {
        return failure(state, 'PRECONDITION_FAILED', 'Die nächste Spielzeit liegt außerhalb des zulässigen Zahlenbereichs.');
      }
      const nextTotalMinutes = minute(totalMinutes);
      const postings = createDailyOperatingLedgerEntries(state, completedDay, nextTotalMinutes);
      const timeEvent: DomainEvent = {
        ...eventBase(state, command, state.player.id, 1),
        type: 'time.day_ended',
        completedDay,
        nextDay,
      };
      const ledgerEvents: DomainEvent[] = postings.map((entry, index) => ({
        ...eventBase(state, command, state.player.id, index + 2),
        type: 'finance.ledger_posted',
        ledgerEntryId: entry.id,
        amountCents: Number(entry.amountCents),
        account: entry.account,
      }));
      const costs = postings.reduce((sum, entry) => sum + Number(entry.amountCents), 0);
      return commit(state, command, {
        time: { ...state.time, day: nextDay, minuteOfDay: 480, totalMinutes: nextTotalMinutes },
        economy: { ...state.economy, ledger: [...state.economy.ledger, ...postings] },
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, {
            id: entityId('notification-day-end-' + nextDay),
            code: 'DAILY_SETTLEMENT',
            level: getBalanceCents({ ...state.economy, ledger: [...state.economy.ledger, ...postings] }) < 0 ? 'danger' : 'info',
            title: 'Tagesabschluss',
            message: 'Tag ' + completedDay + ' abgeschlossen. Betriebskosten: ' + (costs / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) + '.',
            createdAt: nextTotalMinutes,
            read: false,
          }],
        },
      }, [timeEvent, ...ledgerEvents], 'CAMPAIGN_DAY_ENDED', 'Tag ' + completedDay + ' abgeschlossen; Löhne und Betriebskosten wurden im Ledger gebucht.', [state.player.id, ...postings.map((entry) => entry.id)]);
    }
    case 'COMPLIANCE/START_AUDIT': {
      const audits = state.compliance.audits ?? [];
      if (!command.auditId.trim()) return failure(state, 'INVALID_PAYLOAD', 'Die Audit-ID darf nicht leer sein.');
      if (audits.some((item) => item.id === command.auditId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Audit-ID wurde bereits verwendet.');
      if (audits.some((item) => item.status === 'in_progress')) return failure(state, 'INVALID_TRANSITION', 'Ein Audit ist bereits aktiv.');
      let licenseStatus = state.compliance.licenseStatus;
      if (Number(state.compliance.risk) >= GAME_BALANCE.licenseSuspendedRisk) licenseStatus = 'suspended';
      else if (licenseStatus !== 'suspended' && licenseStatus !== 'recovery_review'
        && Number(state.compliance.risk) >= GAME_BALANCE.licenseWarningRisk) licenseStatus = 'warning';
      const audit = {
        id: command.auditId, startedAt: state.time.totalMinutes, completedAt: null,
        status: 'in_progress' as const, outcome: null, findingCodes: [], violationIds: [],
      };
      const events: DomainEvent[] = [{
        ...eventBase(state, command, command.auditId), type: 'compliance.audit_started',
        code: 'COMPLIANCE_AUDIT_STARTED', status: 'in_progress',
      }];
      if (licenseStatus !== state.compliance.licenseStatus) events.push({
        ...eventBase(state, command, command.auditId, 2), type: 'compliance.license_changed',
        code: 'LICENSE_STATUS_UPDATED_FROM_RISK', status: licenseStatus,
      });
      return commit(state, command, {
        compliance: { ...state.compliance, audits: [...audits, audit], licenseStatus },
      }, events, 'COMPLIANCE_AUDIT_STARTED', 'Audit gestartet; offene Abweichungen und Lizenzstatus werden im Spiel geprüft.', [command.auditId]);
    }
    case 'COMPLIANCE/COMPLETE_AUDIT': {
      const audits = state.compliance.audits ?? [];
      const audit = audits.find((item) => item.id === command.auditId);
      if (!audit) return failure(state, 'NOT_FOUND', 'Audit nicht gefunden.');
      if (audit.status !== 'in_progress') return failure(state, 'INVALID_TRANSITION', 'Nur ein laufendes Audit kann abgeschlossen werden.');
      const cases = state.compliance.cases ?? [];
      const unresolvedViolations = state.compliance.violations.filter((item) => item.resolvedAt === null);
      const openCases = cases.filter((item) => item.status !== 'closed');
      const findingCodes = [...new Set([...unresolvedViolations.map((item) => item.code), ...openCases.map((item) => item.code)])].sort();
      const outcome = findingCodes.length === 0 ? 'clear' as const : 'findings' as const;
      const completedAudit = {
        ...audit, completedAt: state.time.totalMinutes, status: 'completed' as const, outcome,
        findingCodes, violationIds: unresolvedViolations.map((item) => item.id).sort(),
      };
      const priorStatus = state.compliance.licenseStatus;
      let licenseStatus = priorStatus;
      if (outcome === 'clear') {
        if (priorStatus === 'suspended' && Number(state.compliance.risk) < GAME_BALANCE.licenseSuspendedRisk) licenseStatus = 'recovery_review';
        else if (priorStatus === 'recovery_review') licenseStatus = 'recovery_review';
        else if (priorStatus === 'warning' && Number(state.compliance.risk) < GAME_BALANCE.licenseWarningRisk) licenseStatus = 'valid';
        else if (Number(state.compliance.risk) >= GAME_BALANCE.licenseSuspendedRisk) licenseStatus = 'suspended';
        else if (Number(state.compliance.risk) >= GAME_BALANCE.licenseWarningRisk && priorStatus !== 'suspended') licenseStatus = 'warning';
      } else {
        if (Number(state.compliance.risk) >= GAME_BALANCE.licenseSuspendedRisk) licenseStatus = 'suspended';
        else if (priorStatus !== 'suspended' && priorStatus !== 'recovery_review'
          && Number(state.compliance.risk) >= GAME_BALANCE.licenseWarningRisk) licenseStatus = 'warning';
      }
      const events: DomainEvent[] = [{
        ...eventBase(state, command, audit.id), type: 'compliance.audit_completed',
        code: 'COMPLIANCE_AUDIT_COMPLETED', status: outcome,
      }];
      if (licenseStatus !== priorStatus) events.push({
        ...eventBase(state, command, audit.id, 2), type: 'compliance.license_changed',
        code: outcome === 'clear' ? 'COMPLIANCE_AUDIT_PASSED' : 'COMPLIANCE_AUDIT_FINDINGS', status: licenseStatus,
      });
      return commit(state, command, {
        compliance: { ...state.compliance, audits: audits.map((item) => item.id === audit.id ? completedAudit : item), lastAuditAt: state.time.totalMinutes, licenseStatus },
      }, events, 'COMPLIANCE_AUDIT_COMPLETED',
      outcome === 'clear' ? 'Audit abgeschlossen: keine offenen Compliance-Abweichungen gefunden.' : 'Audit abgeschlossen: offene Abweichungen bleiben sichtbar und müssen bearbeitet werden.',
      [audit.id, ...completedAudit.violationIds, ...openCases.map((item) => item.id)]);
    }
    case 'COMPLIANCE/RECORD_INCIDENT': {
      const cases = state.compliance.cases ?? [];
      if (!command.caseId.trim() || !command.violationId.trim() || !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(command.code)) return failure(state, 'INVALID_PAYLOAD', 'Fall-ID, Befund-ID oder Befundcode ist ungültig.');
      if (!['low', 'medium', 'high', 'critical'].includes(command.severity)) return failure(state, 'INVALID_PAYLOAD', 'Der Schweregrad des Befunds ist ungültig.');
      if (cases.some((item) => item.id === command.caseId) || state.compliance.violations.some((item) => item.id === command.violationId)) return failure(state, 'DUPLICATE_COMMAND', 'Fall-ID oder Befund-ID existiert bereits.');
      const knownIds = new Set<string>([
        state.player.id, ...state.rooms.map((item) => item.id), ...state.sourceLots.map((item) => item.id),
        ...state.plants.map((item) => item.id), ...state.batches.map((item) => item.id),
        ...state.inventoryLots.map((item) => item.id), ...state.qualityAssessments.map((item) => item.id),
        ...state.orders.map((item) => item.id), ...state.customers.map((item) => item.id),
        ...state.deliveries.map((item) => item.id), ...state.staff.map((item) => item.id),
        ...state.assignments.map((item) => item.id), ...state.machines.map((item) => item.id),
      ]);
      if (command.relatedEntityIds.length === 0 || command.relatedEntityIds.some((id) => !knownIds.has(id))) return failure(state, 'INVALID_PAYLOAD', 'Mindestens eine gültige Bezugseinheit muss verknüpft sein.');
      const violation = {
        id: command.violationId, code: command.code, severity: command.severity,
        occurredAt: state.time.totalMinutes, relatedEntityIds: [...new Set(command.relatedEntityIds)],
        resolvedAt: null, resolutionCode: null,
      };
      const complianceCase = {
        id: command.caseId, violationId: violation.id, code: violation.code, severity: violation.severity,
        status: 'open' as const, openedAt: state.time.totalMinutes, relatedEntityIds: violation.relatedEntityIds,
        correctiveActionCode: null, submittedAt: null, verifiedAt: null, closedAt: null,
      };
      let licenseStatus = state.compliance.licenseStatus;
      if (Number(state.compliance.risk) >= GAME_BALANCE.licenseSuspendedRisk) licenseStatus = 'suspended';
      else if (licenseStatus !== 'suspended' && licenseStatus !== 'recovery_review'
        && Number(state.compliance.risk) >= GAME_BALANCE.licenseWarningRisk) licenseStatus = 'warning';
      const events: DomainEvent[] = [
        { ...eventBase(state, command, violation.id), type: 'compliance.violation_recorded', code: violation.code, status: 'open' },
        { ...eventBase(state, command, complianceCase.id, 2), type: 'compliance.case_opened', code: complianceCase.code, status: complianceCase.status },
      ];
      if (licenseStatus !== state.compliance.licenseStatus) events.push({
        ...eventBase(state, command, complianceCase.id, 3), type: 'compliance.license_changed',
        code: 'LICENSE_STATUS_UPDATED_FROM_RISK', status: licenseStatus,
      });
      return commit(state, command, {
        compliance: { ...state.compliance, violations: [...state.compliance.violations, violation], cases: [...cases, complianceCase], licenseStatus },
      }, events, 'COMPLIANCE_CASE_OPENED', 'Fiktive Betriebsabweichung dokumentiert; Korrektur und Verifikation sind erforderlich.', [complianceCase.id, violation.id, ...violation.relatedEntityIds]);
    }
    case 'COMPLIANCE/RECORD_CORRECTIVE_ACTION': {
      const cases = state.compliance.cases ?? [];
      const complianceCase = cases.find((item) => item.id === command.caseId);
      if (!complianceCase) return failure(state, 'NOT_FOUND', 'Compliance-Fall nicht gefunden.');
      if (complianceCase.status !== 'open') return failure(state, 'INVALID_TRANSITION', 'Eine Korrekturmaßnahme kann nur für einen offenen Fall erfasst werden.');
      if (!/^[A-Z][A-Z0-9_:-]{1,63}$/.test(command.actionCode)) return failure(state, 'INVALID_PAYLOAD', 'Der Korrekturmaßnahmencode ist ungültig.');
      const updatedCase = { ...complianceCase, status: 'corrective_action' as const, correctiveActionCode: command.actionCode, submittedAt: null, verifiedAt: null, closedAt: null };
      const event: DomainEvent = { ...eventBase(state, command, complianceCase.id), type: 'compliance.corrective_action_recorded', code: command.actionCode, status: 'corrective_action' };
      return commit(state, command, { compliance: { ...state.compliance, cases: cases.map((item) => item.id === complianceCase.id ? updatedCase : item) } }, [event], 'COMPLIANCE_CORRECTIVE_ACTION_RECORDED', 'Korrekturmaßnahme dokumentiert; sie muss zur Prüfung eingereicht werden.', [complianceCase.id, complianceCase.violationId]);
    }
    case 'COMPLIANCE/SUBMIT_CORRECTIVE_ACTION': {
      const cases = state.compliance.cases ?? [];
      const complianceCase = cases.find((item) => item.id === command.caseId);
      if (!complianceCase) return failure(state, 'NOT_FOUND', 'Compliance-Fall nicht gefunden.');
      if (complianceCase.status !== 'corrective_action' || !complianceCase.correctiveActionCode) return failure(state, 'INVALID_TRANSITION', 'Nur eine dokumentierte Korrekturmaßnahme kann eingereicht werden.');
      const updatedCase = { ...complianceCase, status: 'verification' as const, submittedAt: state.time.totalMinutes };
      const event: DomainEvent = { ...eventBase(state, command, complianceCase.id), type: 'compliance.corrective_action_submitted', code: complianceCase.correctiveActionCode, status: 'verification' };
      return commit(state, command, { compliance: { ...state.compliance, cases: cases.map((item) => item.id === complianceCase.id ? updatedCase : item) } }, [event], 'COMPLIANCE_CORRECTIVE_ACTION_SUBMITTED', 'Korrekturmaßnahme zur Verifikation eingereicht.', [complianceCase.id, complianceCase.violationId]);
    }
    case 'COMPLIANCE/VERIFY_CORRECTIVE_ACTION': {
      const cases = state.compliance.cases ?? [];
      const complianceCase = cases.find((item) => item.id === command.caseId);
      if (!complianceCase) return failure(state, 'NOT_FOUND', 'Compliance-Fall nicht gefunden.');
      if (complianceCase.status !== 'verification') return failure(state, 'INVALID_TRANSITION', 'Nur eine eingereichte Korrekturmaßnahme kann verifiziert werden.');
      if (typeof command.passed !== 'boolean' || !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(command.resolutionCode)) return failure(state, 'INVALID_PAYLOAD', 'Verifikationsergebnis oder Abschlusscode ist ungültig.');
      const violation = state.compliance.violations.find((item) => item.id === complianceCase.violationId);
      if (!violation) return failure(state, 'PRECONDITION_FAILED', 'Der Compliance-Fall verweist auf keinen vorhandenen Befund.');
      const updatedCase = command.passed
        ? { ...complianceCase, status: 'closed' as const, verifiedAt: state.time.totalMinutes, closedAt: state.time.totalMinutes }
        : { ...complianceCase, status: 'corrective_action' as const, submittedAt: null, verifiedAt: null, closedAt: null };
      const updatedViolation = command.passed ? { ...violation, resolvedAt: state.time.totalMinutes, resolutionCode: command.resolutionCode } : violation;
      const event: DomainEvent = { ...eventBase(state, command, complianceCase.id), type: 'compliance.corrective_action_verified', code: command.resolutionCode, status: command.passed ? 'closed' : 'corrective_action' };
      return commit(state, command, {
        compliance: {
          ...state.compliance,
          cases: cases.map((item) => item.id === complianceCase.id ? updatedCase : item),
          violations: state.compliance.violations.map((item) => item.id === violation.id ? updatedViolation : item),
        },
      }, [event], command.passed ? 'COMPLIANCE_CORRECTIVE_ACTION_VERIFIED' : 'COMPLIANCE_CORRECTIVE_ACTION_REWORK',
      command.passed ? 'Korrekturmaßnahme verifiziert; Fall und Befund wurden geschlossen.' : 'Verifikation nicht bestanden; die Korrekturmaßnahme muss überarbeitet werden.',
      [complianceCase.id, complianceCase.violationId]);
    }
    case 'COMPLIANCE/FINALIZE_RECOVERY': {
      if (state.compliance.licenseStatus !== 'recovery_review') return failure(state, 'INVALID_TRANSITION', 'Die Lizenz befindet sich nicht in der Wiederherstellungsprüfung.');
      const audits = state.compliance.audits ?? [];
      const latestAudit = [...audits].reverse().find((item) => item.status === 'completed');
      const hasOpenCases = (state.compliance.cases ?? []).some((item) => item.status !== 'closed');
      const hasOpenViolations = state.compliance.violations.some((item) => item.resolvedAt === null);
      if (!latestAudit || latestAudit.outcome !== 'clear' || hasOpenCases || hasOpenViolations) return failure(state, 'PRECONDITION_FAILED', 'Wiederherstellung benötigt ein bestandenes letztes Audit und keine offenen Fälle oder Befunde.');
      if (Number(state.compliance.risk) >= GAME_BALANCE.licenseSuspendedRisk) return failure(state, 'COMPLIANCE_BLOCKED', 'Das Compliance-Risiko liegt weiterhin im Lizenzsperrbereich.');
      const licenseStatus = Number(state.compliance.risk) >= GAME_BALANCE.licenseWarningRisk ? 'warning' as const : 'valid' as const;
      const events: DomainEvent[] = [{ ...eventBase(state, command, state.player.id), type: 'compliance.recovery_finalized', code: 'LICENSE_RECOVERY_FINALIZED', status: licenseStatus }];
      events.push({
        ...eventBase(state, command, state.player.id, 2), type: 'compliance.license_changed', code: 'LICENSE_RECOVERY_FINALIZED', status: licenseStatus,
      });
      return commit(state, command, { compliance: { ...state.compliance, licenseStatus } }, events, 'LICENSE_RECOVERY_FINALIZED', 'Lizenz-Wiederherstellung abgeschlossen; Status: ' + licenseStatus + '.', [state.player.id, latestAudit.id]);
    }
    case 'SOURCE/RECEIVE': {
      if (isOperationBlocked(state, 'SOURCE/RECEIVE')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert die Saatgutannahme.');
      if (state.sourceLots.some((lot) => lot.id === command.sourceLotId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Saatgutlos-ID wurde bereits erfasst.');
      const sourceRef = typeof command.sourceRef === 'string' ? command.sourceRef.trim().toUpperCase() : '';
      if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(sourceRef)) return failure(state, 'INVALID_PAYLOAD', 'Die externe Saatgut-Referenz ist ungültig.');
      if (state.sourceLots.some((lot) => lot.sourceRef.toUpperCase() === sourceRef)) return failure(state, 'DUPLICATE_COMMAND', 'Diese externe Saatgut-Referenz ist bereits vorhanden.');
      if (!Number.isSafeInteger(command.quantity) || command.quantity < 1 || command.quantity > 999) return failure(state, 'INVALID_PAYLOAD', 'Die fiktive Losmenge muss zwischen 1 und 999 Spiel-Einheiten liegen.');
      const room = state.rooms.find((item) => item.definitionId === 'room-intake' && item.unlocked)
        ?? state.rooms.find((item) => item.kind === 'storage' && item.unlocked);
      if (!room) return failure(state, 'NOT_FOUND', 'Es ist kein freigeschalteter Wareneingangs-/Saatgutraum vorhanden.');
      if (room.occupied >= room.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Im Wareneingang ist kein freier Spiel-Lagerplatz verfügbar.');
      const event: DomainEvent = { ...eventBase(state, command, command.sourceLotId), type: 'source.received', sourceLotId: command.sourceLotId };
      const sourceLot: GameState['sourceLots'][number] = {
        id: command.sourceLotId, sourceRef, receivedAt: state.time.totalMinutes, status: 'received',
        quantity: command.quantity, qualityScore: null, roomId: room.id, inspectionFindings: [], traceEventIds: [event.eventId],
      };
      return commit(state, command, {
        sourceLots: [...state.sourceLots, sourceLot],
        rooms: state.rooms.map((item) => item.id === room.id ? { ...item, occupied: item.occupied + 1 } : item),
      }, [event], 'SOURCE_LOT_RECEIVED', 'Saatgutlos angenommen und im Wareneingang verbucht. Als Nächstes ist eine dokumentierte Spielprüfung erforderlich.', [sourceLot.id, room.id]);
    }
    case 'SOURCE/INSPECT': {
      const sourceLot = state.sourceLots.find((item) => item.id === command.sourceLotId);
      if (!sourceLot) return failure(state, 'NOT_FOUND', 'Saatgutlos nicht gefunden.');
      if (sourceLot.status !== 'received') return failure(state, 'INVALID_TRANSITION', 'Nur ein neu eingegangenes Saatgutlos kann geprüft werden.');
      if (isOperationBlocked(state, 'SOURCE/INSPECT')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert die Saatgutprüfung.');
      if (!Number.isSafeInteger(command.qualityScore) || command.qualityScore < 0 || command.qualityScore > 100
        || !Array.isArray(command.findingCodes)
        || command.findingCodes.some((code) => typeof code !== 'string' || !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(code))) {
        return failure(state, 'INVALID_PAYLOAD', 'Prüfwert oder Befundcodes sind ungültig.');
      }
      if (command.accepted && command.findingCodes.length > 0) return failure(state, 'PRECONDITION_FAILED', 'Ein Los mit offenen Befundcodes kann nicht direkt freigegeben werden.');
      const seedStorage = command.accepted ? state.rooms.find((item) => item.definitionId === 'room-seed-storage' && item.unlocked) : undefined;
      const destination = seedStorage ?? state.rooms.find((item) => item.id === sourceLot.roomId);
      if (!destination) return failure(state, 'NOT_FOUND', 'Der Zielraum für das Saatgutlos ist nicht verfügbar.');
      const movingToSeedStorage = command.accepted && destination.id !== sourceLot.roomId;
      if (movingToSeedStorage && destination.occupied >= destination.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Das Saatgutlager hat keinen freien Spiel-Lagerplatz.');
      const nextStatus: GameState['sourceLots'][number]['status'] = command.accepted ? 'accepted' : 'rejected';
      const reasonCodes = command.accepted ? [] : (command.findingCodes.length > 0 ? command.findingCodes : ['SEED_LOT_REJECTED']);
      const event: DomainEvent = { ...eventBase(state, command, sourceLot.id), type: command.accepted ? 'source.accepted' : 'source.rejected', sourceLotId: sourceLot.id, reasonCodes };
      const updatedSourceLot = { ...sourceLot, status: nextStatus, qualityScore: clampScore(command.qualityScore), roomId: destination.id, inspectionFindings: reasonCodes, traceEventIds: [...sourceLot.traceEventIds, event.eventId] };
      return commit(state, command, {
        sourceLots: state.sourceLots.map((item) => item.id === sourceLot.id ? updatedSourceLot : item),
        rooms: movingToSeedStorage ? state.rooms.map((item) => {
          if (item.id === sourceLot.roomId) return { ...item, occupied: Math.max(0, item.occupied - 1) };
          if (item.id === destination.id) return { ...item, occupied: item.occupied + 1 };
          return item;
        }) : state.rooms,
      }, [event], command.accepted ? 'SOURCE_LOT_ACCEPTED' : 'SOURCE_LOT_REJECTED',
      command.accepted ? 'Saatgutprüfung bestanden; das Los wurde mit seiner Herkunft im Saatgutlager freigegeben.' : 'Saatgutlos nach der fiktiven Eingangsprüfung abgelehnt und für die Aussaat gesperrt.',
      [sourceLot.id, ...(sourceLot.roomId ? [sourceLot.roomId] : []), destination.id]);
    }
    case 'PLANT/CREATE': {
      if (state.plants.some((item) => item.id === command.plantId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Pflanzen-ID existiert bereits.');
      if (isOperationBlocked(state, 'PLANT/CREATE')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert die Aussaat.');
      if (typeof command.profileId !== 'string' || !/^[a-z0-9][a-z0-9_-]{2,79}$/i.test(command.profileId)) return failure(state, 'INVALID_PAYLOAD', 'Das fiktive Pflanzenprofil ist ungültig.');
      const sourceLot = state.sourceLots.find((item) => item.id === command.sourceLotId);
      if (!sourceLot || sourceLot.status !== 'accepted') return failure(state, 'COMPLIANCE_BLOCKED', 'Für die Aussaat wird ein geprüftes, freigegebenes Saatgutlos benötigt.');
      if (!Number.isSafeInteger(sourceLot.quantity) || sourceLot.quantity <= 0) return failure(state, 'INSUFFICIENT_STOCK', 'Das freigegebene Saatgutlos enthält keine verfügbaren Spiel-Einheiten mehr.');
      const room = state.rooms.find((item) => item.id === command.roomId);
      if (!room || !room.unlocked || room.kind !== 'production' || !['room-greenhouse', 'room-production'].includes(room.definitionId)) {
        return failure(state, 'PRECONDITION_FAILED', 'Die Aussaat benötigt einen freigeschalteten Gewächshaus- oder Produktionsraum.');
      }
      if (room.occupied >= room.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Der gewählte Pflanzenraum ist im Spiel vollständig belegt.');
      const plant: PlantState = {
        id: command.plantId, profileId: command.profileId, sourceLotId: sourceLot.id, roomId: room.id,
        stage: 'active', progress: clampScore(0), vitality: clampScore(80), qualityPotential: clampScore(Number(sourceLot.qualityScore ?? 80)),
        stressIndex: clampScore(8), contaminationIndex: clampScore(0), createdAt: state.time.totalMinutes, lastUpdatedAt: state.time.totalMinutes,
        batchId: null, rejectedReason: null, care: { ...DEFAULT_PLANT_CARE }, propagatedFromPlantId: null,
      };
      const event: DomainEvent = { ...eventBase(state, command, plant.id), type: 'plant.created', plantId: plant.id, previousStage: 'seed', nextStage: 'active' };
      const sourceRoom = state.rooms.find((item) => item.id === sourceLot.roomId);
      const quantityAfterSowing = sourceLot.quantity - 1;
      return commit(state, command, {
        plants: [...state.plants, plant],
        sourceLots: state.sourceLots.map((item) => item.id === sourceLot.id ? { ...item, quantity: quantityAfterSowing, traceEventIds: [...item.traceEventIds, event.eventId] } : item),
        rooms: state.rooms.map((item) => {
          if (item.id === room.id) return { ...item, occupied: item.occupied + 1 };
          if (quantityAfterSowing === 0 && sourceRoom?.id === item.id && sourceRoom.id !== room.id) return { ...item, occupied: Math.max(0, item.occupied - 1) };
          return item;
        }),
        ui: { ...state.ui, selectedEntityId: plant.id },
      }, [event], 'PLANT_CREATED_FROM_SEED', 'Samen wurden als neue, rückverfolgbare Cannabis-Pflanze im gewählten Pflanzenraum angelegt. Alle Werte sind fiktive Spielmechaniken.', [plant.id, sourceLot.id, room.id]);
    }
    case 'PLANT/MOVE': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Pflanze nicht gefunden.');
      if (plant.stage !== 'ready_for_harvest' || plant.batchId !== null) return failure(state, 'INVALID_TRANSITION', 'Nur eine bereitstehende, noch keinem Batch zugeordnete Pflanze kann in die Indoor-Produktion überführt werden.');
      if (isOperationBlocked(state, 'PLANT/MOVE')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert den Raumwechsel.');
      const sourceRoom = state.rooms.find((item) => item.id === plant.roomId);
      const targetRoom = state.rooms.find((item) => item.id === command.roomId);
      if (!sourceRoom || sourceRoom.definitionId !== 'room-greenhouse') return failure(state, 'PRECONDITION_FAILED', 'Die Pflanze befindet sich nicht im Gewächshaus.');
      if (!targetRoom || targetRoom.definitionId !== 'room-production' || targetRoom.kind !== 'production' || !targetRoom.unlocked) return failure(state, 'PRECONDITION_FAILED', 'Das Ziel ist kein freigeschalteter Indoor-Produktionsraum.');
      if (targetRoom.occupied >= targetRoom.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Der Indoor-Produktionsraum ist im Spiel vollständig belegt.');
      const event: DomainEvent = { ...eventBase(state, command, plant.id), type: 'plant.moved', plantId: plant.id, previousRoomId: sourceRoom.id, nextRoomId: targetRoom.id };
      return commit(state, command, {
        plants: state.plants.map((item) => item.id === plant.id ? { ...item, roomId: targetRoom.id, lastUpdatedAt: state.time.totalMinutes } : item),
        rooms: state.rooms.map((item) => {
          if (item.id === sourceRoom.id) return { ...item, occupied: Math.max(0, item.occupied - 1) };
          if (item.id === targetRoom.id) return { ...item, occupied: item.occupied + 1 };
          return item;
        }),
      }, [event], 'PLANT_MOVED_TO_INDOOR_PRODUCTION', 'Bereitstehende Pflanze in die Indoor-Produktion überführt; Pflanzen-ID und Herkunft bleiben erhalten.', [plant.id, sourceRoom.id, targetRoom.id]);
    }
    case 'PLANT/REJECT': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Pflanze nicht gefunden.');
      if (plant.batchId !== null || !['active', 'ready_for_harvest'].includes(plant.stage)) return failure(state, 'INVALID_TRANSITION', 'Nur eine noch nicht geerntete, nicht zugeordnete Pflanze kann abgelehnt werden.');
      if (typeof command.reasonCode !== 'string' || !/^[A-Z][A-Z0-9_:-]{1,63}$/.test(command.reasonCode)) return failure(state, 'INVALID_PAYLOAD', 'Ein gültiger Ablehnungscode ist erforderlich.');
      const event: DomainEvent = { ...eventBase(state, command, plant.id), type: 'plant.rejected', plantId: plant.id, reasonCode: command.reasonCode, previousStage: plant.stage, nextStage: 'rejected' };
      const room = state.rooms.find((item) => item.id === plant.roomId);
      return commit(state, command, {
        plants: state.plants.map((item) => item.id === plant.id ? { ...item, stage: 'rejected', rejectedReason: command.reasonCode, lastUpdatedAt: state.time.totalMinutes } : item),
        rooms: room ? state.rooms.map((item) => item.id === room.id ? { ...item, occupied: Math.max(0, item.occupied - 1) } : item) : state.rooms,
      }, [event], 'PLANT_REJECTED', 'Pflanze im Spiel mit dokumentiertem Grund abgelehnt und aus der belegten Raumkapazität entfernt.', [plant.id, ...(room ? [room.id] : [])]);
    }
    case 'PLANT/CARE_ACTION': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Cannabis-Pflanze nicht gefunden.');
      if (plant.stage !== 'active') return failure(state, 'INVALID_TRANSITION', 'Pflegeaktionen sind nur für aktive Pflanzen verfügbar.');
      if (isOperationBlocked(state, 'PLANT/CARE_ACTION')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert diese Pflegeaktion.');

      const settingActions: PlantCareAction[] = ['water', 'light', 'temperature', 'humidity', 'nutrients'];
      const level = isCareLevel(command.setting) ? command.setting : undefined;
      if (settingActions.includes(command.action) && !level) {
        return failure(state, 'INVALID_PAYLOAD', 'Für diese Pflegeaktion ist eine gültige fiktive Spielstufe erforderlich.');
      }

      let care = getPlantCareState(plant);
      let vitalityDelta = 0;
      let stressDelta = 0;
      let qualityDelta = 0;
      let contaminationDelta = 0;
      let newPlant: PlantState | undefined;

      switch (command.action) {
        case 'water':
          if (!level) return failure(state, 'INVALID_PAYLOAD', 'Bewässerungsstufe fehlt.');
          care = { ...care, waterLevel: level, lastAction: command.action };
          vitalityDelta += level === 'balanced' ? 2 : -1;
          stressDelta += level === 'balanced' ? -3 : 3;
          if (level === 'high') contaminationDelta += 1;
          break;
        case 'light':
          if (!level) return failure(state, 'INVALID_PAYLOAD', 'Lichtstufe fehlt.');
          care = { ...care, lightLevel: level, lastAction: command.action };
          vitalityDelta += level === 'balanced' ? 1 : -1;
          stressDelta += level === 'balanced' ? -3 : 2;
          qualityDelta += level === 'balanced' ? 1 : -1;
          break;
        case 'temperature':
          if (!level) return failure(state, 'INVALID_PAYLOAD', 'Temperaturstufe fehlt.');
          care = { ...care, temperatureLevel: level, lastAction: command.action };
          vitalityDelta += level === 'balanced' ? 1 : -1;
          stressDelta += level === 'balanced' ? -3 : 3;
          break;
        case 'humidity':
          if (!level) return failure(state, 'INVALID_PAYLOAD', 'Luftfeuchtigkeitsstufe fehlt.');
          care = { ...care, humidityLevel: level, lastAction: command.action };
          vitalityDelta += level === 'balanced' ? 1 : -1;
          stressDelta += level === 'balanced' ? -3 : 3;
          if (level === 'high') contaminationDelta += 1;
          break;
        case 'nutrients':
          if (!level) return failure(state, 'INVALID_PAYLOAD', 'Nährstoffstufe fehlt.');
          care = { ...care, nutrientLevel: level, lastAction: command.action };
          vitalityDelta += level === 'balanced' ? 1 : -1;
          stressDelta += level === 'balanced' ? -2 : 2;
          qualityDelta += level === 'balanced' ? 1 : -1;
          break;
        case 'prune':
          care = { ...care, pruningCount: care.pruningCount + 1, lastAction: command.action };
          vitalityDelta -= 1;
          stressDelta += 1;
          qualityDelta += 1;
          break;
        case 'take_cutting':
          care = { ...care, cuttingsTaken: care.cuttingsTaken + 1, lastAction: command.action };
          vitalityDelta -= 1;
          stressDelta += 2;
          break;
        case 'set_cutting': {
          if (care.cuttingsTaken <= care.cuttingsSet) {
            return failure(state, 'PRECONDITION_FAILED', 'Es ist kein ungesetzter Steckling verfügbar. Schneide zuerst einen Steckling als Spielaktion.');
          }
          const room = state.rooms.find((item) => item.id === plant.roomId);
          if (!room || !room.unlocked) return failure(state, 'PRECONDITION_FAILED', 'Der zugewiesene Pflanzenraum ist nicht verfügbar.');
          if (room.occupied >= room.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Der Pflanzenraum hat keine freie Spielkapazität.');
          const cuttingId = entityId('plant-cutting-' + (state.revision + 1));
          if (state.plants.some((item) => item.id === cuttingId)) return failure(state, 'DUPLICATE_COMMAND', 'Die Stecklings-ID existiert bereits.');
          care = { ...care, cuttingsSet: care.cuttingsSet + 1, lastAction: command.action };
          newPlant = {
            id: cuttingId,
            profileId: plant.profileId,
            sourceLotId: plant.sourceLotId,
            roomId: plant.roomId,
            stage: 'active',
            progress: clampScore(0),
            vitality: clampScore(70),
            qualityPotential: clampScore(Number(plant.qualityPotential) - 5),
            stressIndex: clampScore(12),
            contaminationIndex: clampScore(3),
            createdAt: state.time.totalMinutes,
            lastUpdatedAt: state.time.totalMinutes,
            batchId: null,
            rejectedReason: null,
            care: { ...DEFAULT_PLANT_CARE },
            propagatedFromPlantId: plant.id,
          };
          break;
        }
      }

      const updatedPlant: PlantState = {
        ...plant,
        care,
        vitality: clampScore(Number(plant.vitality) + vitalityDelta),
        stressIndex: clampScore(Number(plant.stressIndex) + stressDelta),
        qualityPotential: clampScore(Number(plant.qualityPotential) + qualityDelta),
        contaminationIndex: clampScore(Number(plant.contaminationIndex) + contaminationDelta),
        lastUpdatedAt: state.time.totalMinutes,
      };
      const actionNames: Record<PlantCareAction, string> = {
        water: 'Bewässerung',
        light: 'Lichteinstellung',
        temperature: 'Temperatursimulation',
        humidity: 'Luftfeuchtigkeitssimulation',
        nutrients: 'Nährstoffsimulation',
        prune: 'Beschneiden',
        take_cutting: 'Steckling schneiden',
        set_cutting: 'Steckling setzen',
      };
      const levelLabel = level ? ' · Spielstufe ' + ({ low: 'niedrig', balanced: 'standard', high: 'hoch' } as const)[level] : '';
      const careEvent: DomainEvent = {
        ...eventBase(state, command, plant.id),
        type: 'plant.care_applied',
        plantId: plant.id,
        action: command.action,
        ...(level ? { setting: level } : {}),
        ...(newPlant ? { createdPlantId: newPlant.id } : {}),
      };
      const nextPlants = newPlant
        ? [...state.plants.map((item) => item.id === plant.id ? updatedPlant : item), newPlant]
        : state.plants.map((item) => item.id === plant.id ? updatedPlant : item);
      const patch: Partial<GameState> = {
        plants: nextPlants,
        ...(newPlant ? {
          rooms: state.rooms.map((room) => room.id === plant.roomId ? { ...room, occupied: room.occupied + 1 } : room),
          ui: { ...state.ui, selectedEntityId: newPlant.id },
        } : {}),
      };
      const related = newPlant ? [plant.id, newPlant.id] : [plant.id];
      return commit(
        state,
        command,
        patch,
        [careEvent],
        'PLANT_CARE_ACTION',
        actionNames[command.action] + levelLabel + ' ausgeführt. Die Pflanzenwerte wurden ausschließlich mit fiktiver Spielbalance aktualisiert.' + (newPlant ? ' Neue Pflanzen-ID: ' + newPlant.id + '.' : ''),
        related,
      );
    }
    case 'PLANT/ADVANCE_FICTIONAL_STEP': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Produktionseinheit nicht gefunden.');
      if (plant.stage !== 'active') return failure(state, 'INVALID_TRANSITION', 'Nur aktive Produktionseinheiten können im Spiel fortschreiten.');
      const progress = Math.min(100, plant.progress + 20);
      const stage: PlantState['stage'] = progress === 100 ? 'ready_for_harvest' : 'active';
      const updatedPlant = { ...plant, progress: progress as typeof plant.progress, stage, lastUpdatedAt: state.time.totalMinutes };
      const event: DomainEvent = {
        ...eventBase(state, command, plant.id),
        type: 'plant.stage_changed',
        plantId: plant.id,
        previousStage: plant.stage,
        nextStage: stage,
      };
      const patch: Partial<GameState> = {
        plants: state.plants.map((item) => item.id === plant.id ? updatedPlant : item),
        time: nextTime(state),
      };
      return commit(state, command, patch, [event], 'PLANT_STAGE_ADVANCED', stage === 'ready_for_harvest' ? 'Spielinterner Reife-Meilenstein erreicht.' : 'Fiktiver Simulationsschritt abgeschlossen.', [plant.id]);
    }
    case 'PLANT/HARVEST': {
      const plant = state.plants.find((item) => item.id === command.plantId);
      if (!plant) return failure(state, 'NOT_FOUND', 'Produktionseinheit nicht gefunden.');
      if (plant.stage !== 'ready_for_harvest' || plant.batchId !== null) return failure(state, 'INVALID_TRANSITION', 'Die Produktionseinheit ist nicht für den nächsten Spielschritt freigegeben.');
      const plantRoom = state.rooms.find((item) => item.id === plant.roomId);
      if (plantRoom?.definitionId !== 'room-production') return failure(state, 'PRECONDITION_FAILED', 'Die Pflanze muss erst aus dem Gewächshaus in die Indoor-Produktion überführt werden.');
      const updatedPlant = { ...plant, stage: 'harvested' as const, lastUpdatedAt: state.time.totalMinutes };
      const event: DomainEvent = {
        ...eventBase(state, command, plant.id),
        type: 'plant.stage_changed',
        plantId: plant.id,
        previousStage: plant.stage,
        nextStage: 'harvested',
      };
      return commit(state, command, {
        plants: state.plants.map((item) => item.id === plant.id ? updatedPlant : item),
        rooms: plantRoom ? state.rooms.map((item) => item.id === plantRoom.id ? { ...item, occupied: Math.max(0, item.occupied - 1) } : item) : state.rooms,
      }, [event], 'PLANT_HARVESTED', 'Einheit in den nächsten fiktiven Prozessschritt überführt.', [plant.id, ...(plantRoom ? [plantRoom.id] : [])]);
    }
    case 'BATCH/CREATE': {
      if (state.batches.some((batch) => batch.id === command.batchId)) return failure(state, 'DUPLICATE_COMMAND', 'Diese Batch-ID existiert bereits.');
      if (command.plantIds.length === 0 || new Set(command.plantIds).size !== command.plantIds.length) return failure(state, 'INVALID_PAYLOAD', 'Mindestens eine eindeutige Produktionseinheit ist erforderlich.');
      const plants = command.plantIds.map((id) => state.plants.find((plant) => plant.id === id));
      if (plants.some((plant) => !plant || plant.stage !== 'harvested' || plant.batchId !== null)) return failure(state, 'INVALID_TRANSITION', 'Alle Einheiten müssen geerntet und noch keinem Batch zugeordnet sein.');
      const validPlants = plants.filter((plant) => plant !== undefined);
      const sourceLotIds = [...new Set(validPlants.map((plant) => plant.sourceLotId))];
      if (sourceLotIds.some((id) => !state.sourceLots.some((lot) => lot.id === id && lot.status === 'accepted'))) return failure(state, 'COMPLIANCE_BLOCKED', 'Herkunft ist nicht vollständig freigegeben.');
      const batch: BatchState = {
        id: command.batchId,
        profileId: command.profileId,
        sourceLotIds,
        plantIds: command.plantIds,
        quantity: command.plantIds.length * 6,
        qualityScore: null,
        status: 'created',
        createdAt: state.time.totalMinutes,
        updatedAt: state.time.totalMinutes,
        currentRoomId: null,
        inventoryLotIds: [],
        assessmentIds: [],
        trace: [],
        holdReason: null,
      };
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.created', batchId: batch.id };
      const tracedBatch = withTrace(batch, event, command.actorId, 'BATCH_CREATED', [...command.plantIds, ...sourceLotIds]);
      return commit(state, command, {
        batches: [...state.batches, tracedBatch],
        plants: state.plants.map((plant) => command.plantIds.includes(plant.id) ? { ...plant, batchId: batch.id } : plant),
      }, [event], 'BATCH_CREATED', 'Batch angelegt und Herkunft verknüpft.', [batch.id, ...command.plantIds, ...sourceLotIds]);
    }
    case 'BATCH/QUEUE': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      const room = state.rooms.find((item) => item.id === command.roomId);
      if (!batch || !room) return failure(state, 'NOT_FOUND', 'Batch oder Verarbeitungsraum nicht gefunden.');
      if (batch.status !== 'created' || room.kind !== 'processing' || !room.unlocked) return failure(state, 'INVALID_TRANSITION', 'Batch oder Raum ist nicht für die Einplanung verfügbar.');
      if (room.occupied >= room.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Der Verarbeitungsraum hat keine freie Spielkapazität.');
      if (isOperationBlocked(state, 'BATCH/QUEUE')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren diesen Vorgang.');
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.queued', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'queued', currentRoomId: room.id, updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_QUEUED', [room.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        rooms: state.rooms.map((item) => item.id === room.id ? { ...item, occupied: item.occupied + 1 } : item),
      }, [event], 'BATCH_QUEUED', 'Batch in die fiktive Verarbeitung eingeplant.', [batch.id, room.id]);
    }
    case 'BATCH/START_PROCESSING': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      const machine = state.machines.find((item) => item.id === command.machineId);
      if (!batch || !machine) return failure(state, 'NOT_FOUND', 'Batch oder Anlage nicht gefunden.');
      if (batch.status !== 'queued' || machine.status !== 'idle' || machine.roomId !== batch.currentRoomId) return failure(state, 'INVALID_TRANSITION', 'Batch und Anlage sind nicht startbereit.');
      if (isOperationBlocked(state, 'BATCH/START_PROCESSING')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren die Verarbeitung.');
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.processing_started', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'processing', updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_PROCESSING_STARTED', [machine.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, status: 'active', activeJobId: batch.id } : item),
      }, [event], 'BATCH_PROCESSING_STARTED', 'Fiktiver Verarbeitungsschritt gestartet.', [batch.id, machine.id]);
    }
    case 'BATCH/SUBMIT_QC': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      if (!batch) return failure(state, 'NOT_FOUND', 'Batch nicht gefunden.');
      if (batch.status !== 'processing') return failure(state, 'INVALID_TRANSITION', 'Nur ein abgeschlossener Verarbeitungsschritt kann zur Spiel-QA übergeben werden.');
      const qualityRoom = state.rooms.find((item) => item.kind === 'quality' && item.unlocked);
      const processingRoom = state.rooms.find((item) => item.id === batch.currentRoomId);
      const assessor = state.staff.find((item) => item.role === 'quality');
      if (!qualityRoom || !processingRoom || !assessor) return failure(state, 'PRECONDITION_FAILED', 'Qualitätssicherung ist nicht verfügbar.');
      if (qualityRoom.occupied >= qualityRoom.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Die Qualitätssicherung hat keine freie Spielkapazität.');
      const scoreValue = qualityScoreFor(state, batch);
      const traceComplete = hasCompleteTrace(state, batch);
      const decision: QualityAssessment['decision'] = scoreValue >= GAME_BALANCE.qcPassThreshold && traceComplete ? 'pass' : scoreValue >= GAME_BALANCE.qcReviewThreshold ? 'review' : 'fail';
      const assessmentId = command.assessmentId;
      if (state.batches.some((item) => item.assessmentIds.includes(assessmentId))) return failure(state, 'DUPLICATE_COMMAND', 'Diese Prüf-ID existiert bereits.');
      const assessment: QualityAssessment = {
        id: assessmentId,
        batchId: batch.id,
        ruleSetVersion: 'fictional-game-balance-v1',
        performedAt: state.time.totalMinutes,
        score: scoreValue as Score0To100,
        findings: traceComplete ? (decision === 'pass' ? [] : ['FICTIONAL_SCORE_BELOW_RELEASE_THRESHOLD']) : ['TRACE_CHAIN_INCOMPLETE'],
        decision,
        assessorId: assessor.id,
        traceComplete,
      };
      const qualityEvent: DomainEvent = { ...eventBase(state, command, batch.id, 1), type: 'quality.assessed', batchId: batch.id, assessmentId, score: scoreValue as Score0To100, decision };
      const awaitingEvent: DomainEvent = { ...eventBase(state, command, batch.id, 2), type: 'batch.awaiting_qc', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'awaiting_qc', qualityScore: scoreValue as BatchState['qualityScore'], updatedAt: state.time.totalMinutes, currentRoomId: qualityRoom.id, assessmentIds: [...batch.assessmentIds, assessmentId] }, awaitingEvent, command.actorId, 'BATCH_AWAITING_QC', [assessmentId, qualityRoom.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        rooms: state.rooms.map((room) => room.id === processingRoom.id ? { ...room, occupied: Math.max(0, room.occupied - 1) } : room.id === qualityRoom.id ? { ...room, occupied: room.occupied + 1 } : room),
        machines: state.machines.map((machine) => machine.activeJobId === batch.id ? { ...machine, status: 'idle', activeJobId: null } : machine),
        ui: { ...state.ui, notifications: [...state.ui.notifications, { id: entityId('notification-qc-' + (state.revision + 1)), code: 'QC_COMPLETED', level: decision === 'pass' ? 'success' : 'warning', title: 'Qualitätssicherung', message: decision === 'pass' ? 'Spielinterne Qualitätsfreigabe möglich.' : 'Manuelle Prüfung erforderlich.', createdAt: state.time.totalMinutes, read: false }] },
        qualityAssessments: [...state.qualityAssessments, assessment],
      }, [qualityEvent, awaitingEvent], 'BATCH_QC_COMPLETED', 'Fiktive Qualitätsprüfung abgeschlossen: ' + decision + '.', [batch.id, assessmentId]);
    }
    case 'BATCH/RELEASE': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      if (!batch) return failure(state, 'NOT_FOUND', 'Batch nicht gefunden.');
      if (batch.status !== 'awaiting_qc' || batch.qualityScore === null) return failure(state, 'INVALID_TRANSITION', 'Batch wartet nicht auf eine Qualitätsentscheidung.');
      const assessment = [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id);
      if (!assessment) return failure(state, 'PRECONDITION_FAILED', 'Für diesen Batch liegt keine gespeicherte Qualitätsentscheidung vor.');
      const latestTraceComplete = assessment.traceComplete;
      const gate = transitionBatch('awaiting_qc', 'released', {
        qualityDecision: assessment.decision,
        traceComplete: latestTraceComplete,
        compliance: { licenseStatus: state.compliance.licenseStatus, blockedOperationCodes: state.compliance.blockedOperationCodes },
      });
      if (!gate.ok) return failure(state, gate.error, 'Die Qualitäts-, Rückverfolgbarkeits- oder Compliance-Freigabe wurde nicht bestanden.');
      const storageRoom = state.rooms.find((room) => room.kind === 'storage' && room.unlocked);
      if (!storageRoom) return failure(state, 'PRECONDITION_FAILED', 'Kein freigegebenes Lager verfügbar.');
      if (storageRoom.occupied + batch.quantity > storageRoom.capacity) return failure(state, 'CAPACITY_EXCEEDED', 'Das freigegebene Lager hat nicht genug Kapazität.');
      const lotId = entityId('inventory-' + batch.id);
      if (state.inventoryLots.some((lot) => lot.id === lotId)) return failure(state, 'DUPLICATE_COMMAND', 'Bestandslos existiert bereits.');
      const lot: InventoryLotState = {
        id: lotId, batchId: batch.id, itemDefinitionId: 'MED-CANNABIS-01', quantityAvailable: batch.quantity, quantityReserved: 0,
        qualityScore: batch.qualityScore, status: 'released', createdAt: state.time.totalMinutes,
        expiresAt: minute(Number(state.time.totalMinutes) + 10080), storageRoomId: storageRoom.id,
      };
      const event: DomainEvent = { ...eventBase(state, command, batch.id), type: 'batch.released', batchId: batch.id };
      const updated = withTrace({ ...batch, status: 'released', currentRoomId: storageRoom.id, inventoryLotIds: [...batch.inventoryLotIds, lotId], updatedAt: state.time.totalMinutes }, event, command.actorId, 'BATCH_RELEASED', [lotId, storageRoom.id]);
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        inventoryLots: [...state.inventoryLots, lot],
        rooms: state.rooms.map((room) => room.id === storageRoom.id ? { ...room, occupied: room.occupied + batch.quantity } : room.id === batch.currentRoomId ? { ...room, occupied: Math.max(0, room.occupied - 1) } : room),
      }, [event], 'BATCH_RELEASED', 'Batch freigegeben und Bestand gebucht.', [batch.id, lotId]);
    }
    case 'BATCH/REJECT': {
      const batch = state.batches.find((item) => item.id === command.batchId);
      if (!batch) return failure(state, 'NOT_FOUND', 'Batch nicht gefunden.');
      if (!['created', 'queued', 'processing', 'awaiting_qc'].includes(batch.status)) {
        return failure(state, 'INVALID_TRANSITION', 'Dieser Batch kann nicht mehr abgelehnt werden.');
      }
      const reasonCode = command.reasonCode.trim();
      if (reasonCode.length < 3) return failure(state, 'INVALID_PAYLOAD', 'Ein dokumentierter Ablehnungsgrund ist erforderlich.');
      const event: DomainEvent = {
        ...eventBase(state, command, batch.id),
        type: 'batch.rejected',
        batchId: batch.id,
        reasonCode,
      };
      const updated = withTrace(
        { ...batch, status: 'rejected', holdReason: reasonCode, currentRoomId: null, updatedAt: state.time.totalMinutes },
        event,
        command.actorId,
        'BATCH_REJECTED',
        [],
      );
      const occupiedRoomId = batch.currentRoomId;
      return commit(state, command, {
        batches: state.batches.map((item) => item.id === batch.id ? updated : item),
        rooms: state.rooms.map((room) => room.id === occupiedRoomId ? { ...room, occupied: Math.max(0, room.occupied - 1) } : room),
        machines: state.machines.map((machine) => machine.activeJobId === batch.id ? { ...machine, status: 'idle', activeJobId: null } : machine),
      }, [event], 'BATCH_REJECTED', 'Batch abgelehnt und aus der aktiven Queue entfernt.', [batch.id]);
    }
    case 'ORDER/ACCEPT': {
      const order = state.orders.find((item) => item.id === command.orderId);
      const customer = order ? state.customers.find((item) => item.id === order.customerId) : undefined;
      if (!order || !customer) return failure(state, 'NOT_FOUND', 'Auftrag oder Kunde nicht gefunden.');
      if (order.status !== 'available') return failure(state, 'INVALID_TRANSITION', 'Dieser Auftrag ist nicht mehr verfügbar.');
      if (!customer.unlocked || state.reputation < customer.minimumReputation) return failure(state, 'COMPLIANCE_BLOCKED', 'Kundenanforderungen sind nicht erfüllt.');
      if (isOperationBlocked(state, 'ORDER/ACCEPT')) return failure(state, 'COMPLIANCE_BLOCKED', 'Die Compliance-Regeln blockieren die Auftragsannahme.');
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'order.accepted', orderId: order.id };
      return commit(state, command, { orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'accepted', acceptedAt: state.time.totalMinutes } : item) }, [event], 'ORDER_ACCEPTED', 'Kundenauftrag angenommen.', [order.id, customer.id]);
    }
    case 'ORDER/ALLOCATE': {
      const order = state.orders.find((item) => item.id === command.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Auftrag nicht gefunden.');
      if (order.status !== 'accepted') return failure(state, 'INVALID_TRANSITION', 'Nur angenommene Aufträge können Bestand reservieren.');
      if (command.lotIds.length === 0 || new Set(command.lotIds).size !== command.lotIds.length) return failure(state, 'INVALID_PAYLOAD', 'Mindestens ein eindeutiges Bestandslos ist erforderlich.');
      let remaining = order.requestedQuantity;
      const updatedLots = new Map<EntityId, InventoryLotState>();
      for (const lotId of command.lotIds) {
        const lot = state.inventoryLots.find((item) => item.id === lotId);
        if (!lot) return failure(state, 'NOT_FOUND', 'Bestandslos nicht gefunden.');
        if (lot.qualityScore < order.minQuality) return failure(state, 'QUALITY_GATE_FAILED', 'Die spielinterne Mindestqualität des Auftrags wird nicht erfüllt.');
        const freeQuantity = lot.quantityAvailable - lot.quantityReserved;
        if (freeQuantity <= 0) return failure(state, 'INSUFFICIENT_STOCK', 'Bestandslos hat keine freie Menge.');
        const reservation = reserveInventory(lot, Math.min(remaining, freeQuantity));
        if (!reservation.ok) return failure(state, reservation.error === 'INSUFFICIENT_STOCK' ? 'INSUFFICIENT_STOCK' : 'PRECONDITION_FAILED', 'Bestand kann nicht reserviert werden.');
        const reservedNow = reservation.reservation.quantityReserved - lot.quantityReserved;
        updatedLots.set(lot.id, { ...lot, quantityReserved: reservation.reservation.quantityReserved });
        remaining -= reservedNow;
        if (remaining <= 0) break;
      }
      if (remaining > 0) return failure(state, 'INSUFFICIENT_STOCK', 'Freigegebener Bestand reicht für den Auftrag nicht aus.');
      const allocatedIds = [...updatedLots.keys()];
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'order.allocated', orderId: order.id };
      return commit(state, command, {
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'allocated', allocatedLotIds: allocatedIds } : item),
        inventoryLots: state.inventoryLots.map((lot) => updatedLots.get(lot.id) ?? lot),
      }, [event], 'ORDER_ALLOCATED', 'Freigegebener Bestand atomar reserviert.', [order.id, ...allocatedIds]);
    }
    case 'DELIVERY/CREATE': {
      const order = state.orders.find((item) => item.id === command.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Auftrag nicht gefunden.');
      if (order.status !== 'allocated' || order.deliveryId !== null) return failure(state, 'INVALID_TRANSITION', 'Auftrag muss eindeutig reserviert sein und darf noch keine Lieferung haben.');
      if (state.deliveries.some((item) => item.id === command.deliveryId)) return failure(state, 'DUPLICATE_COMMAND', 'Liefer-ID existiert bereits.');
      const delivery = {
        id: command.deliveryId, orderId: order.id, lotIds: [...order.allocatedLotIds], quantity: order.requestedQuantity,
        status: 'planned' as const, plannedAt: state.time.totalMinutes, dispatchedAt: null, deliveredAt: null,
        routeId: command.routeId, proofCode: null, complianceCaseIds: [],
      };
      const event: DomainEvent = { ...eventBase(state, command, order.id), type: 'delivery.created', deliveryId: delivery.id, orderId: order.id };
      return commit(state, command, {
        deliveries: [...state.deliveries, delivery],
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'ready_to_ship', deliveryId: delivery.id } : item),
      }, [event], 'DELIVERY_CREATED', 'Lieferung vorbereitet.', [delivery.id, order.id]);
    }
    case 'DELIVERY/DISPATCH': {
      const delivery = state.deliveries.find((item) => item.id === command.deliveryId);
      if (!delivery) return failure(state, 'NOT_FOUND', 'Lieferung nicht gefunden.');
      if (delivery.status !== 'planned' && delivery.status !== 'packed') return failure(state, 'INVALID_TRANSITION', 'Lieferung ist nicht versandbereit.');
      if (isOperationBlocked(state, 'DELIVERY/DISPATCH')) return failure(state, 'COMPLIANCE_BLOCKED', 'Der Lizenz-/Compliance-Status blockiert den Versand.');
      const order = state.orders.find((item) => item.id === delivery.orderId);
      if (!order || order.status !== 'ready_to_ship') return failure(state, 'PRECONDITION_FAILED', 'Auftrag ist nicht versandbereit.');
      const reserved = delivery.lotIds.reduce((sum, id) => {
        const lot = state.inventoryLots.find((item) => item.id === id);
        return sum + (lot ? lot.quantityReserved : 0);
      }, 0);
      if (reserved < delivery.quantity) return failure(state, 'INSUFFICIENT_STOCK', 'Reservierter Bestand reicht nicht aus.');
      const event: DomainEvent = { ...eventBase(state, command, delivery.id), type: 'delivery.dispatched', deliveryId: delivery.id, orderId: order.id };
      return commit(state, command, {
        deliveries: state.deliveries.map((item) => item.id === delivery.id ? { ...item, status: 'dispatched', dispatchedAt: state.time.totalMinutes } : item),
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'shipped' } : item),
      }, [event], 'DELIVERY_DISPATCHED', 'Lieferung versandt; Bestand bleibt bis zum Empfang reserviert.', [delivery.id, order.id]);
    }
    case 'DELIVERY/CONFIRM': {
      const delivery = state.deliveries.find((item) => item.id === command.deliveryId);
      if (!delivery) return failure(state, 'NOT_FOUND', 'Lieferung nicht gefunden.');
      if (delivery.status === 'delivered' && delivery.proofCode === command.proofCode) return { ok: true, state, events: [] };
      if (delivery.status !== 'dispatched' || command.proofCode.trim().length < 4) return failure(state, 'INVALID_TRANSITION', 'Eine versandte Lieferung und ein gültiger Spielnachweis sind erforderlich.');
      const order = state.orders.find((item) => item.id === delivery.orderId);
      if (!order) return failure(state, 'NOT_FOUND', 'Zugehöriger Auftrag nicht gefunden.');
      const ledgerKey = 'delivery:' + delivery.id + ':revenue';
      if (state.economy.ledger.some((entry) => entry.idempotencyKey === ledgerKey)) return failure(state, 'DUPLICATE_COMMAND', 'Umsatz wurde bereits verbucht.');
      let remaining = delivery.quantity;
      const updatedLots = new Map<EntityId, InventoryLotState>();
      for (const lotId of delivery.lotIds) {
        const lot = state.inventoryLots.find((item) => item.id === lotId);
        if (!lot) return failure(state, 'NOT_FOUND', 'Lieferlos nicht gefunden.');
        const amount = Math.min(remaining, lot.quantityReserved);
        if (amount <= 0) continue;
        const available = lot.quantityAvailable - amount;
        const reservedQuantity = lot.quantityReserved - amount;
        updatedLots.set(lot.id, {
          ...lot,
          quantityAvailable: available,
          quantityReserved: reservedQuantity,
          status: available === 0 ? 'depleted' : 'released',
        });
        remaining -= amount;
      }
      if (remaining > 0) return failure(state, 'INSUFFICIENT_STOCK', 'Reservierter Bestand reicht nicht zur Bestätigung.');
      const ledgerEntry: LedgerEntry = {
        id: entityId('ledger-' + delivery.id + '-revenue'),
        simulationMinute: state.time.totalMinutes,
        account: 'revenue',
        amountCents: order.contractValueCents,
        referenceId: order.id,
        reasonCode: 'order.fulfilled',
        idempotencyKey: ledgerKey,
      };
      const deliveryEvent: DomainEvent = { ...eventBase(state, command, delivery.id, 1), type: 'delivery.delivered', deliveryId: delivery.id, orderId: order.id };
      const financeEvent: DomainEvent = { ...eventBase(state, command, order.id, 2), type: 'finance.ledger_posted', ledgerEntryId: ledgerEntry.id, amountCents: Number(order.contractValueCents), account: 'revenue' };
      const roomDeltas = new Map<EntityId, number>();
      for (const [lotId, updatedLot] of updatedLots) {
        const originalLot = state.inventoryLots.find((lot) => lot.id === lotId);
        if (!originalLot) continue;
        const consumed = originalLot.quantityAvailable - updatedLot.quantityAvailable;
        roomDeltas.set(updatedLot.storageRoomId, (roomDeltas.get(updatedLot.storageRoomId) ?? 0) + consumed);
      }
      return commit(state, command, {
        deliveries: state.deliveries.map((item) => item.id === delivery.id ? { ...item, status: 'delivered', deliveredAt: state.time.totalMinutes, proofCode: command.proofCode.trim() } : item),
        orders: state.orders.map((item) => item.id === order.id ? { ...item, status: 'delivered' } : item),
        inventoryLots: state.inventoryLots.map((lot) => updatedLots.get(lot.id) ?? lot),
        rooms: state.rooms.map((room) => {
          const consumed = roomDeltas.get(room.id) ?? 0;
          return consumed > 0 ? { ...room, occupied: Math.max(0, room.occupied - consumed) } : room;
        }),
        economy: { ...state.economy, ledger: [...state.economy.ledger, ledgerEntry] },
        reputation: Math.min(1000, Number(state.reputation) + 5) as GameState['reputation'],
      }, [deliveryEvent, financeEvent], 'DELIVERY_CONFIRMED', 'Wareneingang bestätigt; Umsatz einmalig gebucht.', [delivery.id, order.id, ...delivery.lotIds]);
    }
    case 'FACILITY/ASSIGN_STAFF': {
      const staff = state.staff.find((item) => item.id === command.staffId);
      const room = state.rooms.find((item) => item.id === command.roomId);
      if (!staff || !room) return failure(state, 'NOT_FOUND', 'Mitarbeiter oder Raum nicht gefunden.');
      if (!room.unlocked) return failure(state, 'PRECONDITION_FAILED', 'Der Zielraum ist noch nicht freigeschaltet.');
      if (staff.activeAssignmentId !== null) return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiter mit aktiver Aufgabe kann nicht umverteilt werden.');
      if (!roomSupportsStaffRole(room.kind, staff.role)) return failure(state, 'PRECONDITION_FAILED', 'Die Rolle passt nicht zum gewählten Raumtyp.');
      if (staff.assignedRoomId === room.id) return failure(state, 'INVALID_TRANSITION', 'Mitarbeiter ist diesem Raum bereits zugeordnet.');
      const previousRoomId = staff.assignedRoomId;
      const event: DomainEvent = { ...eventBase(state, command, staff.id), type: 'facility.staff_assigned', staffId: staff.id, roomId: room.id };
      return commit(state, command, {
        staff: state.staff.map((item) => item.id === staff.id ? { ...item, assignedRoomId: room.id } : item),
        rooms: state.rooms.map((item) => {
          if (item.id === previousRoomId) return { ...item, assignedStaffIds: item.assignedStaffIds.filter((id) => id !== staff.id) };
          if (item.id === room.id) return { ...item, assignedStaffIds: [...item.assignedStaffIds, staff.id] };
          return item;
        }),
      }, [event], 'STAFF_ASSIGNED_TO_ROOM', staff.displayName + ' wurde dem Raum „' + room.displayName + '“ zugewiesen.', [staff.id, room.id, ...(previousRoomId ? [previousRoomId] : [])]);
    }
    case 'FACILITY/UNASSIGN_STAFF': {
      const staff = state.staff.find((item) => item.id === command.staffId);
      if (!staff) return failure(state, 'NOT_FOUND', 'Mitarbeiter nicht gefunden.');
      if (staff.assignedRoomId === null) return failure(state, 'INVALID_TRANSITION', 'Mitarbeiter ist keinem Raum zugewiesen.');
      if (staff.activeAssignmentId !== null) return failure(state, 'PRECONDITION_FAILED', 'Mitarbeiter mit aktiver Aufgabe kann nicht freigestellt werden.');
      const roomId = staff.assignedRoomId;
      const event: DomainEvent = { ...eventBase(state, command, staff.id), type: 'facility.staff_unassigned', staffId: staff.id, roomId };
      return commit(state, command, {
        staff: state.staff.map((item) => item.id === staff.id ? { ...item, assignedRoomId: null } : item),
        rooms: state.rooms.map((room) => room.id === roomId ? { ...room, assignedStaffIds: room.assignedStaffIds.filter((id) => id !== staff.id) } : room),
      }, [event], 'STAFF_UNASSIGNED_FROM_ROOM', staff.displayName + ' wurde aus der Raumzuordnung genommen.', [staff.id, roomId]);
    }
    case 'FACILITY/MOVE_MACHINE': {
      const machine = state.machines.find((item) => item.id === command.machineId);
      const room = state.rooms.find((item) => item.id === command.roomId);
      if (!machine || !room) return failure(state, 'NOT_FOUND', 'Maschine oder Zielraum nicht gefunden.');
      if (!room.unlocked) return failure(state, 'PRECONDITION_FAILED', 'Der Zielraum ist noch nicht freigeschaltet.');
      if (machine.status !== 'idle' || machine.activeJobId !== null) return failure(state, 'PRECONDITION_FAILED', 'Nur eine inaktive Maschine kann verlegt werden.');
      if (machine.roomId === room.id) return failure(state, 'INVALID_TRANSITION', 'Maschine befindet sich bereits in diesem Raum.');
      if (room.kind !== 'processing') return failure(state, 'PRECONDITION_FAILED', 'Diese Spielstation benötigt einen freigeschalteten Verarbeitungsraum.');
      const previousRoomId = machine.roomId;
      const event: DomainEvent = { ...eventBase(state, command, machine.id), type: 'facility.machine_moved', machineId: machine.id, previousRoomId, nextRoomId: room.id };
      return commit(state, command, {
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, roomId: room.id } : item),
        rooms: state.rooms.map((item) => {
          if (item.id === previousRoomId) return { ...item, assignedMachineIds: item.assignedMachineIds.filter((id) => id !== machine.id) };
          if (item.id === room.id) return { ...item, assignedMachineIds: [...item.assignedMachineIds, machine.id] };
          return item;
        }),
      }, [event], 'MACHINE_MOVED', 'Spielstation wurde in den Zielraum verlegt.', [machine.id, previousRoomId, room.id]);
    }
    case 'MACHINE/START_MAINTENANCE': {
      const machine = state.machines.find((item) => item.id === command.machineId);
      if (!machine) return failure(state, 'NOT_FOUND', 'Maschine nicht gefunden.');
      if (machine.status !== 'idle' || machine.activeJobId !== null) return failure(state, 'PRECONDITION_FAILED', 'Wartung kann nur an einer inaktiven Maschine beginnen.');
      if (machine.condition >= 100) return failure(state, 'INVALID_TRANSITION', 'Die Maschine benötigt aktuell keine Spielwartung.');
      const technician = state.staff.find((staff) => staff.role === 'maintenance' && staff.assignedRoomId === machine.roomId && staff.energy > 0);
      if (!technician) return failure(state, 'PRECONDITION_FAILED', 'Keine verfügbare Wartungsfachkraft ist diesem Raum zugewiesen.');
      const event: DomainEvent = { ...eventBase(state, command, machine.id), type: 'machine.maintenance_started', machineId: machine.id, roomId: machine.roomId, condition: Number(machine.condition) };
      return commit(state, command, {
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, status: 'maintenance', activeJobId: null } : item),
      }, [event], 'MACHINE_MAINTENANCE_STARTED', 'Fiktive Wartung gestartet; die Spielstation ist vorübergehend nicht verfügbar.', [machine.id, technician.id, machine.roomId]);
    }
    case 'MACHINE/COMPLETE_MAINTENANCE': {
      const machine = state.machines.find((item) => item.id === command.machineId);
      if (!machine) return failure(state, 'NOT_FOUND', 'Maschine nicht gefunden.');
      if (machine.status !== 'maintenance' || machine.activeJobId !== null) return failure(state, 'INVALID_TRANSITION', 'Für diese Maschine läuft keine Wartung.');
      const technician = state.staff.find((staff) => staff.role === 'maintenance' && staff.assignedRoomId === machine.roomId && staff.energy > 0);
      if (!technician) return failure(state, 'PRECONDITION_FAILED', 'Eine verfügbare Wartungsfachkraft muss der Maschine zugewiesen sein.');
      const condition = clampScore(Number(machine.condition) + 30);
      const event: DomainEvent = { ...eventBase(state, command, machine.id), type: 'machine.maintenance_completed', machineId: machine.id, roomId: machine.roomId, condition: Number(condition) };
      return commit(state, command, {
        machines: state.machines.map((item) => item.id === machine.id ? { ...item, status: 'idle', condition, activeJobId: null } : item),
      }, [event], 'MACHINE_MAINTENANCE_COMPLETED', 'Wartung abgeschlossen; die Spielstation ist wieder verfügbar.', [machine.id, technician.id, machine.roomId]);
    }
    default: {
      const unsupported: never = command;
      return failure(state, 'PRECONDITION_FAILED', 'Nicht unterstützter Vertikalschnitt-Befehl: ' + String(unsupported));
    }
  }
}

export function getCampaignBalance(state: GameState): number {
  return Number(getBalanceCents(state.economy));
}

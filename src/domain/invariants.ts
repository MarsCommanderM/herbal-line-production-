import type { GameState } from '../../contracts/domain';

export interface StateInvariantViolation {
  code: string;
  path: string;
  message: string;
}

/**
 * Validate cross-entity invariants for a candidate game state.
 * These checks are fictional simulation safeguards and contain no real-world process rules.
 */
export function validateGameStateInvariants(state: GameState): StateInvariantViolation[] {
  const violations: StateInvariantViolation[] = [];
  const add = (code: string, path: string, message: string) => violations.push({ code, path, message });

  if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
    add('INVALID_REVISION', 'revision', 'Revision must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(state.time.totalMinutes) || state.time.totalMinutes < 0) {
    add('INVALID_SIMULATION_TIME', 'time.totalMinutes', 'Simulation time must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(state.rngState) || state.rngState < 0) {
    add('INVALID_RNG_STATE', 'rngState', 'RNG state must be a non-negative safe integer.');
  }

  const complianceCases = state.compliance.cases ?? [];
  const auditRuns = state.compliance.audits ?? [];
  const violationIds = new Set(state.compliance.violations.map((item) => item.id));
  const caseIds = new Set<string>();
  for (const complianceCase of complianceCases) {
    if (caseIds.has(complianceCase.id)) add('DUPLICATE_COMPLIANCE_CASE_ID', 'compliance.cases.' + complianceCase.id, 'Compliance case IDs must be unique.');
    caseIds.add(complianceCase.id);
    if (!violationIds.has(complianceCase.violationId)) add('ORPHAN_COMPLIANCE_CASE', 'compliance.cases.' + complianceCase.id, 'Every compliance case must reference an existing violation.');
    const violation = state.compliance.violations.find((item) => item.id === complianceCase.violationId);
    if (complianceCase.status === 'closed' && (!violation || violation.resolvedAt === null || complianceCase.closedAt === null || complianceCase.verifiedAt === null)) {
      add('CLOSED_CASE_WITHOUT_VERIFICATION', 'compliance.cases.' + complianceCase.id, 'A closed compliance case requires a verified and resolved violation.');
    }
    if (complianceCase.status === 'verification' && (complianceCase.correctiveActionCode === null || complianceCase.submittedAt === null)) {
      add('INVALID_CASE_VERIFICATION_STATE', 'compliance.cases.' + complianceCase.id, 'A case in verification requires a submitted corrective action.');
    }
  }
  const auditIds = new Set<string>();
  let inProgressAuditCount = 0;
  for (const audit of auditRuns) {
    if (auditIds.has(audit.id)) add('DUPLICATE_AUDIT_ID', 'compliance.audits.' + audit.id, 'Audit IDs must be unique.');
    auditIds.add(audit.id);
    if (audit.status === 'in_progress') {
      inProgressAuditCount += 1;
      if (audit.completedAt !== null || audit.outcome !== null) add('INVALID_ACTIVE_AUDIT', 'compliance.audits.' + audit.id, 'An active audit cannot have a completion time or outcome.');
    } else if (audit.completedAt === null || audit.outcome === null) {
      add('INVALID_COMPLETED_AUDIT', 'compliance.audits.' + audit.id, 'A completed audit requires a completion time and outcome.');
    }
    if (audit.violationIds.some((id) => !violationIds.has(id))) add('ORPHAN_AUDIT_VIOLATION', 'compliance.audits.' + audit.id, 'Audit references must point to existing violations.');
  }
  if (inProgressAuditCount > 1) add('MULTIPLE_ACTIVE_AUDITS', 'compliance.audits', 'Only one audit may be active at a time.');

  const rooms = new Map(state.rooms.map((room) => [room.id, room]));
  for (const room of state.rooms) {
    if (!Number.isSafeInteger(room.capacity) || room.capacity < 0) {
      add('INVALID_ROOM_CAPACITY', 'rooms.' + room.id + '.capacity', 'Room capacity must be a non-negative safe integer.');
    }
    if (!Number.isSafeInteger(room.occupied) || room.occupied < 0 || room.occupied > room.capacity) {
      add('ROOM_OCCUPANCY_OUT_OF_RANGE', 'rooms.' + room.id + '.occupied', 'Room occupancy must be an integer between zero and capacity.');
    }
  }

  const batches = new Map(state.batches.map((batch) => [batch.id, batch]));
  const assessmentsByBatch = new Set(state.qualityAssessments.map((assessment) => assessment.batchId));
  const lots = new Map(state.inventoryLots.map((lot) => [lot.id, lot]));

  for (const plant of state.plants) {
    if (plant.care) {
      const allowedLevels = new Set(['low', 'balanced', 'high']);
      for (const [field, value] of [
        ['waterLevel', plant.care.waterLevel],
        ['lightLevel', plant.care.lightLevel],
        ['temperatureLevel', plant.care.temperatureLevel],
        ['humidityLevel', plant.care.humidityLevel],
        ['nutrientLevel', plant.care.nutrientLevel],
      ] as const) {
        if (!allowedLevels.has(value)) add('INVALID_PLANT_CARE_LEVEL', 'plants.' + plant.id + '.care.' + field, 'Plant care settings must use a defined fictional game level.');
      }
      for (const [field, value] of [
        ['pruningCount', plant.care.pruningCount],
        ['cuttingsTaken', plant.care.cuttingsTaken],
        ['cuttingsSet', plant.care.cuttingsSet],
      ] as const) {
        if (!Number.isSafeInteger(value) || value < 0) add('INVALID_PLANT_CARE_COUNT', 'plants.' + plant.id + '.care.' + field, 'Plant-care counters must be non-negative safe integers.');
      }
      if (plant.care.cuttingsSet > plant.care.cuttingsTaken) add('CUTTING_COUNT_MISMATCH', 'plants.' + plant.id + '.care', 'Set cutting count cannot exceed the number cut.');
    }
    if (plant.propagatedFromPlantId && !state.plants.some((parent) => parent.id === plant.propagatedFromPlantId)) {
      add('PROPAGATION_PARENT_MISSING', 'plants.' + plant.id + '.propagatedFromPlantId', 'A propagated plant must reference its parent plant.');
    }
    if (plant.batchId !== null) {
      const batch = batches.get(plant.batchId);
      if (!batch || !batch.plantIds.includes(plant.id)) {
        add('PLANT_BATCH_LINK_MISMATCH', 'plants.' + plant.id + '.batchId', 'Plant-to-batch linkage must be bidirectional.');
      }
    }
  }

  for (const batch of state.batches) {
    if (!Number.isSafeInteger(batch.quantity) || batch.quantity <= 0) {
      add('INVALID_BATCH_QUANTITY', 'batches.' + batch.id + '.quantity', 'Batch quantity must be a positive safe integer.');
    }
    for (const plantId of batch.plantIds) {
      const plant = state.plants.find((item) => item.id === plantId);
      if (!plant || plant.batchId !== batch.id) {
        add('BATCH_PLANT_LINK_MISMATCH', 'batches.' + batch.id + '.plantIds', 'Batch-to-plant linkage must be bidirectional.');
        break;
      }
    }
    if (batch.status === 'awaiting_qc' && !assessmentsByBatch.has(batch.id)) {
      add('QC_DECISION_MISSING', 'batches.' + batch.id + '.status', 'A batch awaiting QC must have a persisted assessment.');
    }
    if (batch.status === 'rejected' && (batch.currentRoomId !== null || !batch.holdReason || batch.holdReason.trim().length < 3)) {
      add('REJECTED_BATCH_NOT_TERMINAL', 'batches.' + batch.id, 'Rejected batches must have a documented reason and no active room.');
    }
    if (batch.status === 'released') {
      if (batch.qualityScore === null || batch.inventoryLotIds.length === 0) {
        add('RELEASED_BATCH_WITHOUT_INVENTORY', 'batches.' + batch.id, 'A released batch must have a quality score and at least one inventory lot.');
      }
      for (const lotId of batch.inventoryLotIds) {
        const lot = lots.get(lotId);
        if (!lot || lot.batchId !== batch.id) {
          add('BATCH_INVENTORY_LINK_MISMATCH', 'batches.' + batch.id + '.inventoryLotIds', 'Batch-to-inventory linkage must be bidirectional.');
          break;
        }
      }
    }
  }

  for (const lot of state.inventoryLots) {
    if (!Number.isSafeInteger(lot.quantityAvailable) || lot.quantityAvailable < 0) {
      add('INVALID_INVENTORY_AVAILABLE', 'inventoryLots.' + lot.id + '.quantityAvailable', 'Available inventory must be a non-negative safe integer.');
    }
    if (!Number.isSafeInteger(lot.quantityReserved) || lot.quantityReserved < 0 || lot.quantityReserved > lot.quantityAvailable) {
      add('INVALID_INVENTORY_RESERVED', 'inventoryLots.' + lot.id + '.quantityReserved', 'Reserved quantity must be between zero and available quantity.');
    }
    if (lot.status === 'depleted' && lot.quantityAvailable !== 0) {
      add('DEPLETED_LOT_HAS_STOCK', 'inventoryLots.' + lot.id + '.status', 'A depleted lot must have zero available quantity.');
    }
    if (lot.status === 'released' && lot.quantityAvailable === 0) {
      add('EMPTY_LOT_STILL_RELEASED', 'inventoryLots.' + lot.id + '.status', 'A lot with zero available quantity must be depleted.');
    }
    const batch = batches.get(lot.batchId);
    if (!batch || !batch.inventoryLotIds.includes(lot.id)) {
      add('INVENTORY_BATCH_LINK_MISMATCH', 'inventoryLots.' + lot.id + '.batchId', 'Inventory-to-batch linkage must be bidirectional.');
    }
  }

  for (const machine of state.machines) {
    if (machine.status === 'active' && machine.activeJobId === null) {
      add('ACTIVE_MACHINE_WITHOUT_JOB', 'machines.' + machine.id, 'An active machine must reference an active job.');
    }
    if (machine.status !== 'active' && machine.activeJobId !== null) {
      add('INACTIVE_MACHINE_WITH_JOB', 'machines.' + machine.id, 'A non-active machine cannot retain an active job.');
    }
    if (machine.activeJobId !== null) {
      const batch = batches.get(machine.activeJobId);
      if (!batch || batch.status !== 'processing' || batch.currentRoomId !== machine.roomId || !rooms.has(machine.roomId)) {
        add('MACHINE_BATCH_LINK_MISMATCH', 'machines.' + machine.id + '.activeJobId', 'Active machine and processing batch must reference the same room and job.');
      }
    }
  }

  const idempotencyKeys = new Set<string>();
  for (const entry of state.economy.ledger) {
    if (!entry.idempotencyKey.trim()) {
      add('EMPTY_LEDGER_IDEMPOTENCY_KEY', 'economy.ledger.' + entry.id, 'Ledger entries require an idempotency key.');
    } else if (idempotencyKeys.has(entry.idempotencyKey)) {
      add('DUPLICATE_LEDGER_IDEMPOTENCY_KEY', 'economy.ledger.' + entry.id, 'Ledger idempotency keys must be unique.');
    }
    idempotencyKeys.add(entry.idempotencyKey);
  }

  return violations;
}

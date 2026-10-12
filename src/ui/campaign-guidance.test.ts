import { describe, expect, it } from 'vitest';
import type { EntityId, GameState, QualityAssessment, SimulationMinute } from '../../contracts/domain';
import { createInitialGameState } from '../domain/initial-state';
import { getCampaignGuidance } from './campaign-guidance';

const entityId = (value: string): EntityId => value as EntityId;
const minute = (value: number): SimulationMinute => value as SimulationMinute;

describe('campaign guidance', () => {
  it('explains the next step for an active campaign unit', () => {
    const guidance = getCampaignGuidance(createInitialGameState());
    expect(guidance.title).toBe('Produktionseinheit aktiv');
    expect(guidance.nextStep).toBe('Simulationsschritt ausführen');
    expect(guidance.tone).toBe('info');
  });

  it('prioritizes compliance restrictions and explains why operations are blocked', () => {
    const state = createInitialGameState();
    state.compliance.licenseStatus = 'suspended';

    const guidance = getCampaignGuidance(state);
    expect(guidance.title).toBe('Betrieb teilweise gesperrt');
    expect(guidance.tone).toBe('danger');
    expect(guidance.detail).toContain('gesperrt');
  });

  it('does not imply release is possible when the latest quality decision failed', () => {
    const state = createInitialGameState();
    const batchId = entityId('batch-guidance-test');
    const assessmentId = entityId('assessment-guidance-test');
    state.batches.push({
      id: batchId,
      profileId: 'fictional-test',
      sourceLotIds: [state.sourceLots[0].id],
      plantIds: [state.plants[0].id],
      quantity: 1,
      qualityScore: 55 as GameState['batches'][number]['qualityScore'],
      status: 'awaiting_qc',
      createdAt: minute(0),
      updatedAt: minute(0),
      currentRoomId: state.rooms.find((room) => room.kind === 'quality')?.id ?? null,
      inventoryLotIds: [],
      assessmentIds: [assessmentId],
      trace: [],
      holdReason: 'FICTIONAL_QA_FAILED',
    });
    const assessment: QualityAssessment = {
      id: assessmentId,
      batchId,
      ruleSetVersion: 'fictional-game-balance-v1',
      performedAt: minute(0),
      score: 55 as QualityAssessment['score'],
      findings: ['FICTIONAL_SCORE_BELOW_RELEASE_THRESHOLD'],
      decision: 'fail',
      assessorId: state.staff.find((staff) => staff.role === 'quality')?.id ?? entityId('staff-missing'),
      traceComplete: true,
    };
    state.qualityAssessments.push(assessment);

    const guidance = getCampaignGuidance(state);
    expect(guidance.title).toBe('Freigabe blockiert');
    expect(guidance.tone).toBe('warning');
    expect(guidance.detail).toContain('nicht bestanden');
    expect(guidance.nextStep).toBe('Prüfergebnis und Befunde prüfen');
  });

  it('reports successful campaign completion after delivery', () => {
    const state = createInitialGameState();
    state.orders[0].status = 'delivered';

    const guidance = getCampaignGuidance(state);
    expect(guidance.title).toBe('Kampagnenziel erreicht');
    expect(guidance.tone).toBe('success');
  });
});

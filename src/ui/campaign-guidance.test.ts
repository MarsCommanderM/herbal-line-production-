import { describe, expect, it } from 'vitest';
import type { EntityId, GameState, QualityAssessment, SimulationMinute } from '../../contracts/domain';
import { createInitialGameState, createNewCampaignGameState } from '../domain/initial-state';
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
    const source = state.sourceLots[0];
    const plant = state.plants[0];
    const qualityStaff = state.staff.find((staff) => staff.role === 'quality');
    if (!source || !plant || !qualityStaff) throw new Error('Initial campaign fixtures are incomplete.');
    const batchId = entityId('batch-guidance-test');
    const assessmentId = entityId('assessment-guidance-test');
    state.batches.push({
      id: batchId,
      profileId: 'fictional-test',
      sourceLotIds: [source.id],
      plantIds: [plant.id],
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
      assessorId: qualityStaff.id,
      traceComplete: true,
    };
    state.qualityAssessments.push(assessment);

    const guidance = getCampaignGuidance(state);
    expect(guidance.title).toBe('Freigabe blockiert');
    expect(guidance.tone).toBe('warning');
    expect(guidance.detail).toContain('nicht bestanden');
    expect(guidance.nextStep).toBe('Batch ablehnen und Grund dokumentieren');
  });

  it('reports successful campaign completion after delivery', () => {
    const state = createInitialGameState();
    const order = state.orders[0];
    if (!order) throw new Error('Initial campaign order is missing.');
    order.status = 'delivered';

    const guidance = getCampaignGuidance(state);
    expect(guidance.title).toBe('Kampagnenziel erreicht');
    expect(guidance.tone).toBe('success');
  });

  it('guides a clean new campaign to seed intake without mutating state', () => {
    const state = createNewCampaignGameState();
    const before = structuredClone(state);

    expect(getCampaignGuidance(state)).toMatchObject({
      title: 'Neue Kampagne: Saatgutannahme',
      tone: 'info',
      nextStep: 'Saatgutlieferung annehmen',
    });
    expect(state).toEqual(before);
  });

});

import type { GameState } from '../../contracts/domain';

export type TutorialStatus = 'active' | 'blocked' | 'complete';

export interface TutorialProgress {
  step: number;
  total: 6;
  status: TutorialStatus;
  title: string;
  detail: string;
}

function currentStep(state: GameState): number {
  const order = state.orders[0];
  const batch = state.batches[state.batches.length - 1];
  const plant = state.plants[0];

  if (order?.status === 'delivered') return 6;
  if (
    batch?.status === 'released' ||
    order?.status === 'accepted' ||
    order?.status === 'allocated' ||
    order?.status === 'ready_to_ship' ||
    order?.status === 'shipped' ||
    order?.status === 'delivery_exception'
  ) return 5;
  if (batch?.status === 'processing' || batch?.status === 'awaiting_qc' || batch?.status === 'rejected' || batch?.status === 'quarantined') return 4;
  if (batch?.status === 'created' || batch?.status === 'queued') return 3;
  if (plant?.stage === 'ready_for_harvest' || plant?.stage === 'harvested') return 2;
  return 1;
}

/** State-derived onboarding copy. It never mutates game state or bypasses domain gates. */
export function getTutorialProgress(state: GameState): TutorialProgress {
  const step = currentStep(state);
  const total = 6 as const;

  if (state.compliance.licenseStatus === 'suspended' || state.compliance.licenseStatus === 'recovery_review') {
    return {
      step,
      total,
      status: 'blocked',
      title: 'Einführung pausiert: Compliance',
      detail: 'Der Betrieb ist eingeschränkt. Prüfe offene Vorfälle und den Auditstatus. Die Einführung schaltet keine gesperrten Aktionen frei.',
    };
  }

  const batch = state.batches[state.batches.length - 1];
  if (batch?.status === 'rejected' || batch?.status === 'quarantined') {
    return {
      step,
      total,
      status: 'blocked',
      title: 'Einführung pausiert: Batch gesperrt',
      detail: 'Dieser Batch bleibt ein gesperrter Endzustand. Lies das Betriebsprotokoll und starte einen neuen gültigen Ablauf; Versand und Freigabe werden nicht angeboten.',
    };
  }

  if (step === 6) {
    return {
      step,
      total,
      status: 'complete',
      title: 'Kampagnenziel erreicht',
      detail: 'Die Lieferung ist abgeschlossen. Prüfe Ledger, Betriebsprotokoll und Kennzahlen, bevor du die nächste Investition planst.',
    };
  }

  const copy: Record<1 | 2 | 3 | 4 | 5, { title: string; detail: string }> = {
    1: {
      title: 'Simulation und Zustand',
      detail: 'Führe einen Simulationsschritt aus und beobachte den Status. Der Spielzustand wird deterministisch fortgeschrieben; Rendering und Fachlogik bleiben getrennt.',
    },
    2: {
      title: 'Einheit in den Prozess überführen',
      detail: 'Wenn der Meilenstein erreicht ist, überführe die Einheit in den nächsten Prozessschritt. Die anschließende Batch-ID verbindet Herkunft und Prüfprotokoll.',
    },
    3: {
      title: 'Batch einplanen und starten',
      detail: 'Plane den Batch in einen verfügbaren Raum und starte die Station nur, wenn Status, Kapazität und Zuordnung passen.',
    },
    4: {
      title: 'Qualität und Freigabe',
      detail: 'Führe die fiktive Spiel-QA aus. Nur eine bestandene Prüfung, vollständige Rückverfolgbarkeit und ein zulässiger Compliance-Status erlauben die Freigabe.',
    },
    5: {
      title: 'Auftrag bis Lieferung',
      detail: 'Nimm den Auftrag an, reserviere freigegebenen Bestand und bestätige den Empfang. Der Umsatz wird genau einmal im Ledger gebucht.',
    },
  };
  return { step, total, status: 'active', ...copy[step as 1 | 2 | 3 | 4 | 5] };
}

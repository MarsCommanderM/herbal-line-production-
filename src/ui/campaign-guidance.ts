import type { GameState } from '../../contracts/domain';

export type GuidanceTone = 'info' | 'success' | 'warning' | 'danger';

export interface CampaignGuidance {
  title: string;
  detail: string;
  tone: GuidanceTone;
  nextStep: string;
}

/** User-facing explanation derived from domain state; it never grants permission to act. */
export function getCampaignGuidance(state: GameState): CampaignGuidance {
  const plant = state.plants.find((item) => item.id === state.ui.selectedEntityId) ?? state.plants.find((item) => item.stage === 'active') ?? state.plants[0];
  const batch = state.batches[state.batches.length - 1];
  const order = state.orders[0];
  const pendingSeedLot = state.sourceLots.find((item) => item.status === 'received');
  const availableSeedLot = state.sourceLots.find((item) => item.status === 'accepted' && item.quantity > 0);

  if (state.compliance.licenseStatus === 'suspended' || state.compliance.licenseStatus === 'recovery_review') {
    return {
      title: 'Betrieb teilweise gesperrt',
      detail: state.compliance.licenseStatus === 'suspended'
        ? 'Der Lizenzstatus ist ausgesetzt. Compliance-abhängige Spielaktionen bleiben gesperrt.'
        : 'Der Lizenzstatus befindet sich in einer Wiederherstellungsprüfung. Erst nach Klärung werden gesperrte Aktionen wieder verfügbar.',
      tone: 'danger',
      nextStep: 'Compliance-Status prüfen',
    };
  }

  if (batch?.status === 'awaiting_qc') {
    const assessment = [...state.qualityAssessments].reverse().find((item) => item.batchId === batch.id);
    if (!assessment) {
      return {
        title: 'Qualitätsprüfung unvollständig',
        detail: 'Für den aktuellen Batch fehlt eine gespeicherte Spiel-QA-Entscheidung. Eine Freigabe ist deshalb nicht zulässig.',
        tone: 'danger',
        nextStep: 'Prüfprotokoll vervollständigen',
      };
    }
    if (assessment.decision !== 'pass') {
      return {
        title: 'Freigabe blockiert',
        detail: assessment.decision === 'fail'
          ? 'Die letzte Spiel-QA ist nicht bestanden. Eine Freigabe ist gesperrt; du kannst den Batch mit dokumentiertem Grund ablehnen.'
          : 'Die letzte Spiel-QA verlangt eine manuelle Prüfung. Ohne geklärtes positives Ergebnis bleibt die Freigabe gesperrt; eine dokumentierte Ablehnung ist möglich.',
        tone: 'warning',
        nextStep: 'Batch ablehnen und Grund dokumentieren',
      };
    }
    return {
      title: 'Qualitätsprüfung bestanden',
      detail: 'Der Batch hat die fiktive Spiel-QA bestanden. Die Freigabeaktion prüft Rückverfolgbarkeit, Lagerkapazität und Compliance erneut.',
      tone: 'success',
      nextStep: 'Batch-Freigabe durchführen',
    };
  }

  if (batch?.status === 'quarantined' || batch?.status === 'rejected') {
    return {
      title: batch.status === 'quarantined' ? 'Batch in Quarantäne' : 'Batch abgelehnt',
      detail: 'Dieser Batch ist in einem gesperrten Endzustand. Es werden keine weiteren Prozessaktionen angeboten.',
      tone: 'danger',
      nextStep: 'Einen neuen gültigen Spielablauf starten',
    };
  }

  if (order?.status === 'delivered') {
    return {
      title: 'Kampagnenziel erreicht',
      detail: 'Der Abnehmerauftrag ist abgeschlossen. Der Zahlungseingang wurde im fiktiven Hauptbuch verbucht.',
      tone: 'success',
      nextStep: 'Nächsten Kampagnenschritt planen',
    };
  }

  if (plant?.stage === 'active') {
    return {
      title: 'Produktionseinheit aktiv',
      detail: 'Führe einen fiktiven Simulationsschritt aus. Der Fortschritt wird revisionsgebunden protokolliert und automatisch gespeichert.',
      tone: 'info',
      nextStep: 'Simulationsschritt ausführen',
    };
  }
  if (plant?.stage === 'ready_for_harvest' && plant.batchId === null) {
    return {
      title: 'Nächster Prozessschritt bereit',
      detail: 'Die Einheit hat den Spiel-Meilenstein erreicht. Überführe sie in den nächsten abstrakten Prozessschritt, um die Rückverfolgbarkeit fortzuführen.',
      tone: 'success',
      nextStep: 'Einheit in Batch überführen',
    };
  }
  if (plant?.stage === 'harvested' && plant.batchId === null) {
    return {
      title: 'Batch erforderlich',
      detail: 'Die Einheit ist noch keinem Batch zugeordnet. Ein Batch verbindet die fiktive Einheit mit ihrem Herkunfts- und Prüfprotokoll.',
      tone: 'info',
      nextStep: 'Batch erstellen',
    };
  }

  if (batch?.status === 'created') {
    return {
      title: 'Batch wartet auf Einplanung',
      detail: 'Prüfe, ob ein freigeschalteter Verarbeitungsraum verfügbar ist. Kapazitäts- und Compliance-Gates werden beim Einplanen erneut geprüft.',
      tone: 'info',
      nextStep: 'Verarbeitung einplanen',
    };
  }
  if (batch?.status === 'queued') {
    const machine = state.machines.find((item) => item.roomId === batch.currentRoomId && item.status === 'idle');
    return machine
      ? { title: 'Batch eingeplant', detail: 'Eine freie Spielstation ist verfügbar. Der Prozess kann gestartet werden.', tone: 'info', nextStep: 'Spielprozess starten' }
      : { title: 'Wartet auf freie Station', detail: 'Im zugewiesenen Raum ist aktuell keine freie Spielstation verfügbar. Prüfe Maschinenstatus und Raumzuordnung.', tone: 'warning', nextStep: 'Auf freie Station warten' };
  }
  if (batch?.status === 'processing') {
    return {
      title: 'Prozessschritt läuft',
      detail: 'Der nächste zulässige Schritt ist die fiktive Qualitätsprüfung. Die Prüfergebnisse und Rückverfolgbarkeit entscheiden über die Freigabe.',
      tone: 'info',
      nextStep: 'Qualitätsprüfung ausführen',
    };
  }
  if (batch?.status === 'released') {
    if (order?.status === 'available') {
      return {
        title: 'Bestand freigegeben',
        detail: 'Freigegebener Spielbestand ist vorhanden. Nimm einen passenden Abnehmerauftrag an, bevor du Bestand reservierst.',
        tone: 'success',
        nextStep: 'Abnehmerauftrag annehmen',
      };
    }
    if (order?.status === 'accepted') {
      const freeQuantity = state.inventoryLots
        .filter((lot) => lot.status === 'released' && lot.qualityScore >= order.minQuality)
        .reduce((sum, lot) => sum + lot.quantityAvailable - lot.quantityReserved, 0);
      return freeQuantity >= order.requestedQuantity
        ? { title: 'Auftrag bereit zur Zuteilung', detail: 'Der freigegebene Bestand erfüllt die fiktive Mindestqualität und deckt die Auftragsmenge.', tone: 'success', nextStep: 'Freigegebenen Bestand reservieren' }
        : { title: 'Bestand reicht nicht aus', detail: 'Die verfügbare, freigegebene Menge deckt den Auftrag nicht. Erzeuge weiteren gültigen Spielbestand oder wähle einen kleineren Auftrag.', tone: 'warning', nextStep: 'Bestandslage prüfen' };
    }
  }

  if (!plant && pendingSeedLot) return { title: 'Saatgutprüfung ausstehend', detail: 'Ein Saatgutlos ist eingegangen und wartet auf die dokumentierte fiktive Herkunfts- und Qualitätsprüfung.', tone: 'warning', nextStep: 'Saatgutprüfung freigeben' };
  if (!plant && availableSeedLot) return { title: 'Saatgut freigegeben', detail: 'Das geprüfte Saatgut ist im Lager verfügbar. Lege eine neue, rückverfolgbare Pflanze im Gewächshaus an.', tone: 'success', nextStep: 'Samen im Gewächshaus aussäen' };
  if (!plant) return { title: 'Neue Kampagne: Saatgutannahme', detail: 'Starte am Wareneingang. Nimm ein fiktives Saatgutlos an, prüfe dessen Herkunft und lege anschließend Pflanzen im Gewächshaus an.', tone: 'info', nextStep: 'Saatgutlieferung annehmen' };

  return {
    title: 'Kampagne bereit',
    detail: 'Wähle eine verfügbare Aktion. Gesperrte Aktionen werden erst nach Erfüllung ihrer Voraussetzungen freigeschaltet.',
    tone: 'info',
    nextStep: 'Verfügbare Aktionen prüfen',
  };
}

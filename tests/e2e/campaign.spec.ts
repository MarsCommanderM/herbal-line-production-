import type { CommandId, EntityId, Score0To100 } from '../../contracts/domain';
import { createInitialGameState } from '../../src/domain/initial-state';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from '../../src/domain/vertical-slice';
import { createSaveEnvelope, stableStringify } from '../../src/persistence/save-codec';
import { expect, test, type Page } from '@playwright/test';

const entity = (value: string): EntityId => value as EntityId;
const commandId = (value: string): CommandId => value as CommandId;

function applyOk(
  state: ReturnType<typeof createInitialGameState>,
  type: VerticalSliceCommand['type'],
  payload: Record<string, unknown> = {},
) {
  const command = {
    commandId: commandId('e2e-' + state.revision + '-' + type.replaceAll('/', '-')),
    actorId: state.player.id,
    expectedRevision: state.revision,
    type,
    ...payload,
  } as VerticalSliceCommand;
  const result = applyVerticalSliceCommand(state, command);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}
async function seedCampaignSave(page: Page, state: ReturnType<typeof createInitialGameState>): Promise<void> {
  const envelope = await createSaveEnvelope(state, '2026-10-12T12:00:00.000Z');
  const serialized = stableStringify(envelope);
  const metadata = {
    slotId: 'campaign-01',
    revision: envelope.revision,
    savedAtRealTime: envelope.savedAtRealTime,
    gameVersion: envelope.gameVersion,
    byteLength: new TextEncoder().encode(serialized).byteLength,
  };

  await page.goto('/');
  await page.evaluate(async ({ saveEnvelope, saveMetadata }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('saves')) {
          request.result.createObjectStore('saves', { keyPath: 'slotId' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('saves', 'readwrite');
      transaction.objectStore('saves').put({ slotId: 'campaign-01', envelope: saveEnvelope, metadata: saveMetadata });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }, { saveEnvelope: envelope, saveMetadata: metadata });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sichtbare Pflanzenpflege' })).toBeVisible();
}

test('third-person avatar moves with keyboard and camera target follows', async ({ page }) => {
  await page.goto('/');
  const worldCanvas = page.locator('#world-root canvas');
  const graphicsFallback = page.locator('#fatal-error');
  await expect.poll(async () => (await worldCanvas.isVisible()) || (await graphicsFallback.isVisible())).toBe(true);
  test.skip(!(await worldCanvas.isVisible()), 'WebGL is unavailable in this browser context; the documented graphics fallback is tested separately.');
  await expect(worldCanvas).toHaveAttribute('data-third-person', 'true');
  const initialZ = Number(await worldCanvas.getAttribute('data-player-z'));
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await worldCanvas.getAttribute('data-player-z'))).not.toBe(initialZ);
  await page.keyboard.up('w');
  await expect(worldCanvas).toHaveAttribute('data-camera-target-z', /.+/);
  const playerZ = await worldCanvas.getAttribute('data-player-z');
  const cameraTargetZ = await worldCanvas.getAttribute('data-camera-target-z');
  expect(cameraTargetZ).toBe(playerZ);
});

test('nearby cannabis plant can be selected directly from the third-person world', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#world-root canvas');
  const graphicsFallback = page.locator('#fatal-error');
  await expect.poll(async () => (await canvas.isVisible()) || (await graphicsFallback.isVisible())).toBe(true);
  test.skip(!(await canvas.isVisible()), 'WebGL is unavailable in this browser context; the documented graphics fallback is tested separately.');
  await expect(canvas).toHaveAttribute('data-third-person', 'true');
  await expect.poll(async () => await canvas.getAttribute('data-interactable-plant-x')).not.toBeNull();
  const x = Number(await canvas.getAttribute('data-interactable-plant-x'));
  const y = Number(await canvas.getAttribute('data-interactable-plant-y'));
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('3D canvas has no measurable bounds');
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x).toBeLessThan(bounds.width);
  expect(y).toBeLessThan(bounds.height);
  await page.mouse.click(bounds.x + x, bounds.y + y);
  await expect(page.locator('#game-feedback')).toContainText('Pflanze ausgewählt');
});

test('campaign controls run a step and restore a saved state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dr. Green Dump / DopeFarm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  const graphicsCanvas = page.locator('#world-root canvas');
  const graphicsWarning = page.locator('#fatal-error');
  await expect.poll(async () => (await graphicsCanvas.isVisible()) || (await graphicsWarning.isVisible())).toBe(true);
  if (await graphicsCanvas.isVisible()) {
    await expect(graphicsCanvas).toBeVisible();
  } else {
    await expect(graphicsWarning).toContainText('Die Management-Oberfläche bleibt nutzbar');
  }
  await expect(page.getByRole('heading', { name: 'Kampagnenstatus' })).toBeVisible();
  await expect(page.locator('#campaign-guidance')).toContainText('Produktionseinheit aktiv');
  await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 1 von 6');
  await expect(page.locator('#campaign-tutorial')).toContainText('Simulation und Zustand');

  await page.getByRole('button', { name: 'Spielstand speichern' }).click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand gespeichert');

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
  await expect(page.locator('#campaign-guidance')).toContainText('Nächster Prozessschritt bereit');
  await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 2 von 6');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert');
  const loadButton = page.getByRole('button', { name: 'Spielstand laden' });
  await expect(loadButton).toBeEnabled();
  // Keyboard activation is a first-class user path and avoids a Chromium-only
  // pointer-actionability stall when the scrollable management panel reflows.
  await loadButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-feedback')).toContainText('Spielstand geladen');
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
});

test('all visible plant-care settings and actions persist through autosave and reload', async ({ page }) => {
  // Chromium WebGL initialization and repeated checksum-verified IndexedDB writes
  // make this cross-browser persistence test slower than a standard UI test.
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sichtbare Pflanzenpflege' })).toBeVisible();

  const canvas = page.locator('#world-root canvas');
  const graphicsFallback = page.locator('#fatal-error');
  await expect.poll(async () => (await canvas.isVisible()) || (await graphicsFallback.isVisible())).toBe(true);
  test.skip(!(await canvas.isVisible()), 'WebGL is unavailable in this browser context; the documented graphics fallback is tested separately.');
  await expect(canvas).toHaveAttribute('data-visual-plant-id', 'plant-001');
  await expect(canvas).toHaveAttribute('data-visual-care-ring-visible', 'true');
  const settings = [
    { label: 'Bewässerung: hoch', feedback: 'Bewässerung · Spielstufe hoch', revision: 1, visualAttribute: 'data-visual-water-color', visualValue: '294a5e' },
    { label: 'Licht: niedrig', feedback: 'Lichteinstellung · Spielstufe niedrig', revision: 2, visualAttribute: 'data-visual-light-intensity', visualValue: '0.20' },
    { label: 'Temperatur: hoch', feedback: 'Temperatursimulation · Spielstufe hoch', revision: 3, visualAttribute: 'data-visual-care-ring-color', visualValue: 'ff9b71' },
    { label: 'Luftfeuchtigkeit: niedrig', feedback: 'Luftfeuchtigkeitssimulation · Spielstufe niedrig', revision: 4, visualAttribute: 'data-visual-care-ring-color', visualValue: '83d8e8' },
    { label: 'Nährstoffniveau: hoch', feedback: 'Nährstoffsimulation · Spielstufe hoch', revision: 5, visualAttribute: 'data-visual-nutrient-color', visualValue: '1e7541' },
  ];
  for (const setting of settings) {
    const button = page.getByRole('button', { name: setting.label, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#game-feedback')).toContainText(setting.feedback);
    await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision ' + setting.revision);
    await expect(canvas).toHaveAttribute(setting.visualAttribute, setting.visualValue);
  }

  const unprunedScale = Number(await canvas.getAttribute('data-visual-pruning-scale-y'));
  await page.getByRole('button', { name: 'Beschneiden', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Beschneiden ausgeführt');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 6', { timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-visual-pruning-count', '1');
  await expect(canvas).toHaveAttribute('data-visual-care-last-action', 'prune');
  await expect.poll(async () => Number(await canvas.getAttribute('data-visual-pruning-scale-y'))).toBeLessThan(unprunedScale);

  await page.getByRole('button', { name: 'Steckling schneiden', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Steckling schneiden ausgeführt');
  await expect(page.getByRole('button', { name: 'Steckling setzen (1)', exact: true })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 7', { timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-visual-care-last-action', 'take_cutting');
  await expect(canvas).toHaveAttribute('data-cutting-visual-count', '1');

  await page.getByRole('button', { name: 'Steckling setzen (1)', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Steckling setzen ausgeführt');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 8', { timeout: 15_000 });
  await expect(canvas).toHaveAttribute('data-state-plant-count', '2');
  await expect(canvas).toHaveAttribute('data-plant-visual-count', '2');
  await expect(canvas).toHaveAttribute('data-cutting-visual-count', '0');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sichtbare Pflanzenpflege' })).toBeVisible();
  for (const setting of settings) {
    await expect(page.getByRole('button', { name: setting.label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('button', { name: 'Steckling setzen (1)', exact: true })).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-state-plant-count', '2');
  await expect(canvas).toHaveAttribute('data-plant-visual-count', '2');
  await expect(canvas).toHaveAttribute('data-cutting-visual-count', '0');
  // set_cutting mutates the source plant and selects the new propagated plant.
  // Select the source again to verify its care history survived the save/reload.
  await expect(page.getByLabel('Pflanze für Pflege auswählen')).toHaveValue(/plant-/);
  await page.getByLabel('Pflanze für Pflege auswählen').selectOption('plant-001');
  await expect(canvas).toHaveAttribute('data-visual-plant-id', 'plant-001');
  await expect(canvas).toHaveAttribute('data-visual-care-last-action', 'set_cutting');
  await expect(canvas).toHaveAttribute('data-visual-water-color', '294a5e');
  await expect(canvas).toHaveAttribute('data-visual-light-intensity', '0.20');
  await expect(canvas).toHaveAttribute('data-visual-nutrient-color', '1e7541');
});


test('suspended license blocks direct plant care without changing the saved campaign', async ({ page }) => {
  const initial = createInitialGameState();
  const suspended = {
    ...initial,
    compliance: { ...initial.compliance, licenseStatus: 'suspended' as const },
  };
  await seedCampaignSave(page, suspended);
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision 0');

  const waterButton = page.getByRole('button', { name: 'Bewässerung: hoch', exact: true });
  await expect(waterButton).toHaveAttribute('aria-pressed', 'false');
  await waterButton.click();

  await expect(page.locator('#game-feedback')).toContainText('Der Lizenz-/Compliance-Status blockiert diese Pflegeaktion.');
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision 0');
  await expect(waterButton).toHaveAttribute('aria-pressed', 'false');
});

test('suspended license blocks delivery dispatch without reserving or posting anything new', async ({ page }) => {
  let state = createInitialGameState();
  state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
  state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
  state = applyOk(state, 'BATCH/CREATE', {
    batchId: entity('batch-compliance-e2e'),
    plantIds: [entity('plant-001')],
    profileId: 'fictional-medical-cannabis-batch',
  });
  state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-compliance-e2e'), roomId: entity('room-processing-01') });
  state = applyOk(state, 'BATCH/START_PROCESSING', {
    batchId: entity('batch-compliance-e2e'),
    machineId: entity('machine-processing-001'),
  });
  state = applyOk(state, 'BATCH/SUBMIT_QC', {
    batchId: entity('batch-compliance-e2e'),
    assessmentId: entity('assessment-compliance-e2e'),
  });
  state = applyOk(state, 'BATCH/RELEASE', { batchId: entity('batch-compliance-e2e') });
  state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
  state = applyOk(state, 'ORDER/ALLOCATE', {
    orderId: entity('order-buyer-001'),
    lotIds: state.inventoryLots.filter((lot) => lot.status === 'released').map((lot) => lot.id),
  });
  state = applyOk(state, 'DELIVERY/CREATE', {
    deliveryId: entity('delivery-compliance-e2e'),
    orderId: entity('order-buyer-001'),
    routeId: 'fictional-route-local-01',
  });
  state = {
    ...state,
    compliance: { ...state.compliance, licenseStatus: 'suspended' as const },
  };
  const blockedRevision = state.revision;

  await seedCampaignSave(page, state);
  await expect(page.getByRole('button', { name: 'Lieferung versenden', exact: true })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision ' + blockedRevision);

  await page.getByRole('button', { name: 'Lieferung versenden', exact: true }).click();

  await expect(page.locator('#game-feedback')).toContainText('Der Lizenz-/Compliance-Status blockiert den Versand.');
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision ' + blockedRevision);
  await expect(page.getByRole('button', { name: 'Lieferung versenden', exact: true })).toBeVisible();
});

test('held inventory cannot be allocated to a pharmacy order', async ({ page }) => {
  let state = createInitialGameState();
  state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
  state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
  state = applyOk(state, 'BATCH/CREATE', {
    batchId: entity('batch-held-e2e'),
    plantIds: [entity('plant-001')],
    profileId: 'fictional-medical-cannabis-batch',
  });
  state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-held-e2e'), roomId: entity('room-processing-01') });
  state = applyOk(state, 'BATCH/START_PROCESSING', {
    batchId: entity('batch-held-e2e'),
    machineId: entity('machine-processing-001'),
  });
  state = applyOk(state, 'BATCH/SUBMIT_QC', {
    batchId: entity('batch-held-e2e'),
    assessmentId: entity('assessment-held-e2e'),
  });
  state = applyOk(state, 'BATCH/RELEASE', { batchId: entity('batch-held-e2e') });
  state = applyOk(state, 'ORDER/ACCEPT', { orderId: entity('order-buyer-001') });
  state = {
    ...state,
    inventoryLots: state.inventoryLots.map((lot) => ({ ...lot, status: 'held' as const })),
  };

  await seedCampaignSave(page, state);
  await expect(page.locator('#game-actions')).toContainText('Abnehmerauftrag annehmen');
  await expect(page.getByRole('button', { name: 'Freigegebenen Bestand reservieren', exact: true })).toHaveCount(0);
});

test('rejects corrupt primary and backup saves without loading corrupted campaign state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await page.getByRole('button', { name: 'Einheit in Batch überführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 2');

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      for (const slotId of ['campaign-01', 'campaign-01-backup']) {
        const request = store.get(slotId);
        request.onsuccess = () => {
          const record = request.result as { envelope: { payload: { reputation: number } } } | undefined;
          if (!record) {
            transaction.abort();
            reject(new Error('Expected primary and backup save records to exist.'));
            return;
          }
          record.envelope.payload.reputation = 999;
          store.put(record);
        };
        request.onerror = () => reject(request.error);
      }
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Corruption setup transaction aborted.'));
    });
  });

  await page.reload();
  await expect(page.locator('#save-status')).toContainText('Spielstand konnte nicht automatisch geladen werden');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
});

test('autosave survives reload and corrupt primary recovers the last valid backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await page.getByRole('button', { name: 'Einheit in Batch überführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 2');

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.get('campaign-01');
      request.onsuccess = () => {
        const record = request.result as { envelope: { payload: { reputation: number } } };
        record.envelope.payload.reputation = 999;
        store.put(record);
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
    });
  });

  await page.reload();
  await expect(page.locator('#save-status')).toContainText('letztes gültiges Backup wiederhergestellt');
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Batch erstellen' })).toHaveCount(0);
});

test('exported saves can be imported after a later campaign change', async ({ page }) => {
  await page.goto('/');
  const saveButton = page.getByRole('button', { name: 'Spielstand speichern' });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand gespeichert');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Spielstand exportieren' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Export download stream was not created.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'campaign-save.json', mimeType: 'application/json', buffer: exported });

  await expect(page.locator('#game-feedback')).toContainText('Spielstand importiert');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
});


test('importing an older save removes stale propagated plant and cutting visuals', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#world-root canvas');
  const graphicsFallback = page.locator('#fatal-error');
  await expect.poll(async () => (await canvas.isVisible()) || (await graphicsFallback.isVisible())).toBe(true);
  test.skip(!(await canvas.isVisible()), 'WebGL is unavailable; graphics fallback is covered separately.');

  await expect.poll(async () => await canvas.getAttribute('data-state-plant-count')).not.toBeNull();
  const initialPlantCount = Number(await canvas.getAttribute('data-state-plant-count'));
  const initialVisualCount = Number(await canvas.getAttribute('data-plant-visual-count'));
  const saveButton = page.getByRole('button', { name: 'Spielstand speichern' });
  await saveButton.click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand gespeichert');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Spielstand exportieren' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Export download stream was not created.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const originalSave = Buffer.concat(chunks);

  await page.getByRole('button', { name: 'Steckling schneiden', exact: true }).click();
  await expect(page.locator('#game-feedback')).toContainText('Steckling');
  await page.getByRole('button', { name: 'Steckling setzen (1)', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-state-plant-count'))).toBeGreaterThan(initialPlantCount);
  await expect.poll(async () => Number(await canvas.getAttribute('data-plant-visual-count'))).toBeGreaterThan(initialVisualCount);

  await page.getByRole('button', { name: 'Steckling schneiden', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-cutting-visual-count'))).toBeGreaterThan(0);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'older-campaign-save.json', mimeType: 'application/json', buffer: originalSave });
  await expect(page.locator('#game-feedback')).toContainText('Spielstand importiert');
  await expect.poll(async () => Number(await canvas.getAttribute('data-state-plant-count'))).toBe(initialPlantCount);
  await expect.poll(async () => Number(await canvas.getAttribute('data-plant-visual-count'))).toBe(initialVisualCount);
  await expect.poll(async () => Number(await canvas.getAttribute('data-cutting-visual-count'))).toBe(0);
});

test('failed or unresolved QC offers a documented terminal rejection instead of a dead end', async ({ page }) => {
  let state = createInitialGameState();
  state = {
    ...state,
    plants: state.plants.map((plant) => ({ ...plant, qualityPotential: 62 as Score0To100 })),
  };
  state = applyOk(state, 'PLANT/ADVANCE_FICTIONAL_STEP', { plantId: entity('plant-001') });
  state = applyOk(state, 'PLANT/HARVEST', { plantId: entity('plant-001') });
  state = applyOk(state, 'BATCH/CREATE', { batchId: entity('batch-qc-review'), plantIds: [entity('plant-001')], profileId: 'fictional-profile' });
  state = applyOk(state, 'BATCH/QUEUE', { batchId: entity('batch-qc-review'), roomId: entity('room-processing-01') });
  state = applyOk(state, 'BATCH/START_PROCESSING', { batchId: entity('batch-qc-review'), machineId: entity('machine-processing-001') });
  state = applyOk(state, 'BATCH/SUBMIT_QC', { batchId: entity('batch-qc-review'), assessmentId: entity('assessment-qc-review') });
  expect(state.qualityAssessments.at(-1)?.decision).toBe('review');

  const envelope = await createSaveEnvelope(state, '2026-10-12T12:00:00.000Z');
  const serialized = stableStringify(envelope);
  const metadata = {
    slotId: 'campaign-01',
    revision: envelope.revision,
    savedAtRealTime: envelope.savedAtRealTime,
    gameVersion: envelope.gameVersion,
    byteLength: new TextEncoder().encode(serialized).byteLength,
  };

  await page.goto('/');
  await page.evaluate(async ({ envelope: saveEnvelope, metadata: saveMetadata }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('saves')) request.result.createObjectStore('saves', { keyPath: 'slotId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('saves', 'readwrite');
      transaction.objectStore('saves').put({ slotId: 'campaign-01', envelope: saveEnvelope, metadata: saveMetadata });
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }, { envelope, metadata });

  await page.reload();
  await expect(page.locator('#campaign-guidance')).toContainText('Freigabe blockiert');
  await expect(page.getByRole('button', { name: 'Batch ablehnen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Batch freigeben' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Batch ablehnen' }).click();
  await expect(page.locator('#game-metrics')).toContainText('rejected');
  await expect(page.getByRole('button', { name: 'Batch ablehnen' })).toHaveCount(0);
  await expect(page.locator('#game-log')).toContainText('BATCH REJECTED');
});

test('keyboard navigation reaches primary controls in a predictable order', async ({ page }, testInfo) => {
  await page.goto('/');
  // Focus the first control explicitly; Firefox also tabs to its scrollable management landmark.
  await page.locator('#reset-camera').focus();
  await expect(page.locator(':focus')).toHaveAttribute('id', 'reset-camera');
  if (testInfo.project.name === 'firefox') {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', 'game-panel');
  }
  const expectedIds = ['save-game', 'load-game', 'export-game', 'import-game'];
  for (const id of expectedIds) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('id', id);
  }

  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Simulationsschritt ausführen');
  const focusStyle = await page.locator(':focus').evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusStyle).not.toBe('none');
});

test('mobile viewport keeps the management panel inside the screen without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dr. Green Dump / DopeFarm' })).toBeVisible();
  await expect(page.locator('#campaign-guidance')).toContainText('Produktionseinheit aktiv');

  const geometry = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>('#game-panel');
    if (!panel) throw new Error('Management panel is missing.');
    const rect = panel.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.panelScrollHeight).toBeGreaterThanOrEqual(geometry.panelClientHeight);

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#campaign-guidance')).toContainText('Nächster Prozessschritt bereit');
});

test('live status semantics and reduced-motion preferences are respected', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#campaign-guidance')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#game-feedback')).toHaveAttribute('aria-live', 'polite');
  const animationName = await page.locator('#campaign-guidance .guidance-card').evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toBe('none');
});

test('facility controls enforce staffing roles and complete abstract machine maintenance', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Spielstation warten' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mara Weiss: Verarbeitung zuweisen' })).toBeVisible();

  await page.getByRole('button', { name: 'Mara Weiss: Verarbeitung zuweisen' }).click();
  await expect(page.getByRole('button', { name: 'Mara Weiss: Pflanzenraum zuweisen' })).toBeVisible();
  await expect(page.locator('#game-feedback')).toContainText('Mara Weiss wurde dem Raum');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');

  await page.getByRole('button', { name: 'Spielstation warten' }).click();
  await expect(page.getByRole('button', { name: 'Wartung abschließen' })).toBeVisible();
  await expect(page.locator('#game-feedback')).toContainText('Wartung gestartet');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 2');

  await page.getByRole('button', { name: 'Wartung abschließen' }).click();
  await expect(page.getByRole('button', { name: 'Wartung abschließen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Spielstation warten' })).toHaveCount(0);
  await expect(page.locator('#facility-overview')).toContainText('Zustand 100/100');
  await expect(page.locator('#game-feedback')).toContainText('Wartung abgeschlossen');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 3');
});


test('end-of-day settlement updates the campaign clock, ledger and autosave', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-metrics')).toContainText('Tageskosten');
  await expect(page.locator('#game-metrics')).toContainText('Reichweite (0 € Umsatz)');
  await expect(page.locator('#game-metrics')).toContainText('30-Tage-Szenario (0 € Umsatz)');
  await expect(page.locator('#game-metrics')).toContainText('223.600,00');
  await expect(page.getByRole('button', { name: 'Tag abschließen' })).toBeVisible();

  await page.getByRole('button', { name: 'Tag abschließen' }).click();

  await expect(page.locator('#game-metrics .metric-card').filter({ hasText: 'Spieltag' })).toContainText('2');
  await expect(page.locator('#game-feedback')).toContainText('Tag 1 abgeschlossen');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await expect(page.locator('#game-metrics')).toContainText('880,00');
  await expect(page.locator('#game-metrics')).toContainText('222.720,00');
});


test('unconfigured upgrade IDs remain unavailable until balance rules are approved', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game-actions')).toContainText('Upgrades derzeit nicht verfügbar');
  await expect(page.locator('#game-actions')).toContainText('sensor_pack_1');
  await expect(page.getByRole('button', { name: /Energieeffizienz I kaufen/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Energieeffizienz II kaufen/ })).toHaveCount(0);

  await page.reload();
  await expect(page.locator('#game-actions')).toContainText('Upgrades derzeit nicht verfügbar');
  await expect(page.locator('#game-actions')).toContainText('drying_rack_1');
});

test('full browser campaign loop delivers once and restores the ledger after reload', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 1 von 6');

  const actions = [
    'Simulationsschritt ausführen',
    'Einheit in Batch überführen',
    'Batch erstellen',
    'Verarbeitung einplanen',
    'Spielprozess starten',
    'Qualitätsprüfung ausführen',
    'Batch freigeben',
    'Abnehmerauftrag annehmen',
    'Freigegebenen Bestand reservieren',
    'Lieferung vorbereiten',
    'Lieferung versenden',
    'Wareneingang bestätigen',
  ];

  for (const [index, label] of actions.entries()) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision ' + (index + 1));
    if (index === 0) {
      await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 2 von 6');
    }
  }

  await expect(page.locator('#campaign-guidance')).toContainText('Kampagnenziel erreicht');
  await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 6 von 6');
  await expect(page.locator('#game-metrics')).toContainText('delivered');

  const countRevenuePostings = async (): Promise<number> => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const record = await new Promise<{ envelope: { payload: { economy: { ledger: { account: string }[] } } } }>((resolve, reject) => {
        const request = database.transaction('saves', 'readonly').objectStore('saves').get('campaign-01');
        request.onsuccess = () => {
          if (!request.result) {
            reject(new Error('Autosaved campaign record is missing.'));
            return;
          }
          resolve(request.result as { envelope: { payload: { economy: { ledger: { account: string }[] } } } });
        };
        request.onerror = () => reject(request.error);
      });
      return record.envelope.payload.economy.ledger.filter((entry) => entry.account === 'revenue').length;
    } finally {
      database.close();
    }
  });

  expect(await countRevenuePostings()).toBe(1);
  await page.reload();
  await expect(page.locator('#campaign-guidance')).toContainText('Kampagnenziel erreicht');
  await expect(page.locator('#campaign-tutorial')).toContainText('Schritt 6 von 6');
  expect(await countRevenuePostings()).toBe(1);
});
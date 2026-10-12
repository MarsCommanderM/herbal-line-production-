import type { CommandId, EntityId, Score0To100 } from '../../contracts/domain';
import { createInitialGameState } from '../../src/domain/initial-state';
import { applyVerticalSliceCommand, type VerticalSliceCommand } from '../../src/domain/vertical-slice';
import { createSaveEnvelope, stableStringify } from '../../src/persistence/save-codec';
import { expect, test } from '@playwright/test';

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

test('campaign controls run a step and restore a saved state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.locator('#world-root canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kampagnenstatus' })).toBeVisible();
  await expect(page.locator('#campaign-guidance')).toContainText('Produktionseinheit aktiv');

  await page.getByRole('button', { name: 'Spielstand speichern' }).click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand gespeichert');

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
  await expect(page.locator('#campaign-guidance')).toContainText('Nächster Prozessschritt bereit');
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert');

  await page.getByRole('button', { name: 'Spielstand laden' }).click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand geladen');
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Spielstand speichern' }).click();
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

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'campaign-save.json', mimeType: 'application/json', buffer: exported });

  await expect(page.locator('#game-feedback')).toContainText('Spielstand importiert');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
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

test('keyboard navigation reaches primary controls in a predictable order', async ({ page }) => {
  await page.goto('/');
  const expectedIds = ['reset-camera', 'save-game', 'load-game', 'export-game', 'import-game'];
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
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();
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

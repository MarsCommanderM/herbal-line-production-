import type { Score0To100 } from '../../contracts/domain';
import { createInitialGameState } from '../../src/domain/initial-state';
import { createSaveEnvelope } from '../../src/persistence/save-codec';
import { expect, test } from '@playwright/test';

test('campaign controls run a step and restore a saved state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.locator('#world-root canvas')).toBeVisible();

  await page.getByRole('button', { name: 'Spielstand speichern' }).click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand gespeichert');

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
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

test('a non-passing QC result has a terminal rejection path and never creates inventory', async ({ page }) => {
  const initial = createInitialGameState();
  const reviewState = {
    ...initial,
    plants: initial.plants.map((plant) => ({ ...plant, qualityPotential: 62 as Score0To100 })),
  };
  const envelope = await createSaveEnvelope(reviewState);
  const fileBuffer = Buffer.from(JSON.stringify(envelope));

  await page.goto('/');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'qc-review-save.json', mimeType: 'application/json', buffer: fileBuffer });
  await expect(page.locator('#game-feedback')).toContainText('Spielstand importiert');

  const runAndWaitForAutosave = async (label: string, revision: number): Promise<void> => {
    await page.getByRole('button', { name: label }).click();
    await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision ' + revision);
  };

  await runAndWaitForAutosave('Simulationsschritt ausführen', 1);
  await runAndWaitForAutosave('Einheit in Batch überführen', 2);
  await runAndWaitForAutosave('Batch erstellen', 3);
  await runAndWaitForAutosave('Verarbeitung einplanen', 4);
  await runAndWaitForAutosave('Spielprozess starten', 5);
  await runAndWaitForAutosave('Qualitätsprüfung ausführen', 6);

  await expect(page.getByRole('button', { name: 'Batch ablehnen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Batch freigeben' })).toHaveCount(0);
  await runAndWaitForAutosave('Batch ablehnen', 7);
  await expect(page.locator('#game-metrics')).toContainText('rejected');
  await expect(page.locator('#game-actions')).toContainText('Kampagne beendet');
  await expect(page.getByRole('button', { name: 'Abnehmerauftrag annehmen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Batch freigeben' })).toHaveCount(0);
});

import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const unitStage = (page: import('@playwright/test').Page) =>
  page.locator('#game-metrics .metric-card').nth(3).locator('.metric-value');

test('manual save restores the exact committed campaign state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();
  await expect(page.locator('#world-root canvas')).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('Neue Kampagne');

  await page.getByRole('button', { name: 'Jetzt speichern' }).click();
  await expect(page.locator('#save-status')).toContainText('Spielstand gespeichert · Revision 0');

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await expect(unitStage(page)).toHaveText('ready for harvest');

  await page.getByRole('button', { name: 'Spielstand laden' }).click();
  await expect(page.locator('#save-status')).toContainText('Spielstand geladen · Revision 0');
  await expect(unitStage(page)).toHaveText('active');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
});

test('autosave survives a full browser reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await expect(unitStage(page)).toHaveText('ready for harvest');

  await page.reload();
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision 1');
  await expect(unitStage(page)).toHaveText('ready for harvest');
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toHaveCount(0);
});

test('corrupted persisted state is rejected without replacing the safe startup state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');

  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line-saves', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('slots', 'readwrite');
      const store = transaction.objectStore('slots');
      const request = store.get('autosave');
      request.onsuccess = () => {
        const stored = request.result as { envelope: { payload: { reputation: number } } };
        stored.envelope.payload.reputation = 999;
        store.put(stored);
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
      transaction.onabort = () => { database.close(); reject(transaction.error); };
    });
  });

  await page.reload();
  await expect(page.locator('#save-status')).toContainText('CHECKSUM_MISMATCH');
  await expect(unitStage(page)).toHaveText('active');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
});

test('valid export can be imported after a later campaign change', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jetzt speichern' }).click();
  await expect(page.locator('#save-status')).toContainText('Spielstand gespeichert · Revision 0');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Spielstand exportieren' }).click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  if (!exportedPath) throw new Error('Export download path was not created.');
  const exportedSave = await readFile(exportedPath);

  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'herbal-line-save.json',
    mimeType: 'application/json',
    buffer: exportedSave,
  });

  await expect(page.locator('#save-status')).toContainText('Import geprüft und geladen · Revision 0');
  await expect(unitStage(page)).toHaveText('active');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
});

test('invalid import leaves the active in-memory campaign untouched', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Simulationsschritt ausführen' }).click();
  await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision 1');
  await expect(unitStage(page)).toHaveText('ready for harvest');

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Spielstand importieren' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'unsupported-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 2 })),
  });

  await expect(page.locator('#save-status')).toContainText('UNSUPPORTED_VERSION');
  await expect(unitStage(page)).toHaveText('ready for harvest');
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toBeVisible();
});

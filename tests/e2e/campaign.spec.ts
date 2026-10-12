import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const unitStage = (page: import('@playwright/test').Page) =>
  page.locator('#game-metrics .metric-card').nth(3).locator('.metric-value');

test('operations dashboard exposes queues, room capacity, and keyboard-usable actions', async ({ page }) => {
  await page.goto('/');
  const queues = page.locator('#operations-queues');

  await expect(queues.getByRole('heading', { name: 'Prozesspipeline' })).toBeVisible();
  await expect(queues).toContainText('Keine aktiven Batches.');
  await expect(queues.getByRole('heading', { name: 'Raumkapazitäten' })).toBeVisible();
  await expect(queues.getByRole('list', { name: 'Raumkapazitäten' })).toBeVisible();
  await expect(queues).toContainText('1 / 12 Plätze belegt');
  await expect(queues.getByRole('heading', { name: 'Anlagenstatus' })).toBeVisible();
  await expect(queues).toContainText('machine-processing-001');
  await expect(queues.getByRole('heading', { name: 'Aufträge & Auslieferung' })).toBeVisible();
  await expect(queues).toContainText('order-buyer-001');

  const saveButton = page.getByRole('button', { name: 'Jetzt speichern', exact: true });
  await saveButton.focus();
  await expect(saveButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#save-status')).toContainText('Spielstand gespeichert · Revision 0');
});

test('management loop completes through QC release, dispatch, and revenue posting in the browser', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();

  const runAction = async (label: string, revision: number): Promise<void> => {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('#save-status')).toContainText('Autosave gespeichert · Revision ' + revision);
  };

  await runAction('Simulationsschritt ausführen', 1);
  await runAction('Einheit in Batch überführen', 2);
  await runAction('Batch erstellen', 3);
  await runAction('Verarbeitung einplanen', 4);
  await runAction('Spielprozess starten', 5);
  await runAction('Qualitätsprüfung ausführen', 6);
  await expect(page.getByRole('button', { name: 'Batch freigeben', exact: true })).toBeVisible();
  await runAction('Batch freigeben', 7);
  await runAction('Abnehmerauftrag annehmen', 8);
  await runAction('Freigegebenen Bestand reservieren', 9);
  await runAction('Lieferung vorbereiten', 10);
  await runAction('Lieferung versenden', 11);
  await runAction('Wareneingang bestätigen', 12);

  await expect(page.locator('#game-metrics .metric-card').nth(4).locator('.metric-value')).toHaveText('released');
  await expect(page.locator('#game-metrics .metric-card').nth(5).locator('.metric-value')).toHaveText('delivered');
  await expect(page.locator('#game-metrics .metric-card').nth(1).locator('.metric-value')).toContainText('258.500');
  await expect(page.locator('#game-actions')).toContainText('Kampagnenziel erreicht');
  await expect(page.locator('#game-log')).toContainText('DELIVERY CONFIRMED');

  const committed = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line-saves', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<{ revision: number; checksum: string; orderStatus: string; deliveryStatus: string; revenueCount: number }>((resolve, reject) => {
      const transaction = database.transaction('slots', 'readonly');
      const request = transaction.objectStore('slots').get('autosave');
      request.onsuccess = () => {
        const record = request.result as {
          envelope: {
            revision: number;
            checksum: string;
            payload: {
              orders: Array<{ status: string }>;
              deliveries: Array<{ status: string }>;
              economy: { ledger: Array<{ idempotencyKey: string }> };
            };
          };
        };
        database.close();
        resolve({
          revision: record.envelope.revision,
          checksum: record.envelope.checksum,
          orderStatus: record.envelope.payload.orders[0]?.status ?? 'missing',
          deliveryStatus: record.envelope.payload.deliveries[0]?.status ?? 'missing',
          revenueCount: record.envelope.payload.economy.ledger.filter(
            (entry) => entry.idempotencyKey === 'delivery:delivery-001:revenue',
          ).length,
        });
      };
      request.onerror = () => { database.close(); reject(request.error); };
    });
  });
  expect(committed.revision).toBe(12);
  expect(committed.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
  expect(committed.orderStatus).toBe('delivered');
  expect(committed.deliveryStatus).toBe('delivered');
  expect(committed.revenueCount).toBe(1);

  await page.reload();
  await expect(page.locator('#save-status')).toContainText('Autosave wiederhergestellt · Revision 12');
  await expect(page.locator('#game-metrics .metric-card').nth(5).locator('.metric-value')).toHaveText('delivered');
  await expect(page.locator('#game-actions')).toContainText('Kampagnenziel erreicht');
});

test('manual save restores the exact committed campaign state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Botanical Operations' })).toBeVisible();
  await expect(page.locator('#world-root canvas')).toBeVisible();
  await expect(page.locator('#save-status')).toContainText('Neue Kampagne');

  await page.getByRole('button', { name: 'Jetzt speichern' }).click();
  await expect(page.locator('#save-status')).toContainText('Spielstand gespeichert · Revision 0');

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

test('corrupt primary save recovers the last verified backup in real IndexedDB', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jetzt speichern' }).click();
  await expect(page.locator('#save-status')).toContainText('Spielstand gespeichert · Revision 0');
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
  await expect(page.locator('#save-status')).toContainText('Letztes gültiges Backup wiederhergestellt · Revision 0');
  await expect(unitStage(page)).toHaveText('active');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);

  const restored = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('herbal-line-saves', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<{ revision: number; checksum: string }>((resolve, reject) => {
      const transaction = database.transaction('slots', 'readonly');
      const request = transaction.objectStore('slots').get('autosave');
      request.onsuccess = () => {
        const stored = request.result as { envelope: { revision: number; checksum: string } };
        database.close();
        resolve({ revision: stored.envelope.revision, checksum: stored.envelope.checksum });
      };
      request.onerror = () => { database.close(); reject(request.error); };
    });
  });
  expect(restored.revision).toBe(0);
  expect(restored.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
});

test('a corrupted save without a valid backup never replaces the safe startup state', async ({ page }) => {
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
      const request = transaction.objectStore('slots').get('autosave');
      request.onsuccess = () => {
        const stored = request.result as { envelope: { payload: { reputation: number } } };
        stored.envelope.payload.reputation = 999;
        transaction.objectStore('slots').put(stored);
      };
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

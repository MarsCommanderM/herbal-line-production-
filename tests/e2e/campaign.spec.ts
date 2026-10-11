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

  await page.getByRole('button', { name: 'Spielstand laden' }).click();
  await expect(page.locator('#game-feedback')).toContainText('Spielstand geladen');
  await expect(page.getByRole('button', { name: 'Simulationsschritt ausführen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Einheit in Batch überführen' })).toHaveCount(0);
});

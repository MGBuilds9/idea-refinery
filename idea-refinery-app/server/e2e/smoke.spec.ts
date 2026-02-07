import { expect, test } from '@playwright/test';

test('health endpoint returns ok', async ({ page }) => {
  const response = await page.goto('/health');
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('body')).toContainText('ok');
});

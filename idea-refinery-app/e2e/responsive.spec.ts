import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('mobile viewport (375px) - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('mobile viewport (375px) - content is visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Body should be visible and rendered
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();

    // Should see some recognizable app content (onboarding, login, PIN, or main)
    // Check individually to avoid strict mode violations with .or() matching multiple elements
    const hasIdeaRefinery = await page.getByRole('heading', { name: 'Idea Refinery' }).isVisible().catch(() => false);
    const hasConnectIntelligence = await page.getByRole('heading', { name: 'Connect Intelligence' }).isVisible().catch(() => false);
    const hasServerAccess = await page.getByRole('heading', { name: 'Server Access' }).isVisible().catch(() => false);
    const hasInitializing = await page.locator('text=INITIALIZING').isVisible().catch(() => false);
    const hasPinScreen = await page.locator('input[type="password"]').first().isVisible().catch(() => false);

    expect(hasIdeaRefinery || hasConnectIntelligence || hasServerAccess || hasInitializing || hasPinScreen).toBeTruthy();
  });

  test('tablet viewport (768px) - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('tablet viewport (768px) - page renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Page renders without issues at tablet size
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768 + 5);

    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('desktop viewport (1440px) - content contained', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Page renders without issues
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('onboarding form is usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(3000);

    // On onboarding screen at mobile width, the form should still be accessible
    const connectIntelligence = page.locator('text=Connect Intelligence');
    if (await connectIntelligence.isVisible({ timeout: 5000 }).catch(() => false)) {
      // API key input should be visible and not clipped
      const apiKeyInput = page.locator('input[type="password"]');
      await expect(apiKeyInput).toBeVisible();

      // The skip button should be visible
      const skipBtn = page.locator('button:has-text("Skip Setup")').or(
        page.locator('button:has-text("Explore First")')
      );
      await expect(skipBtn).toBeVisible();

      // Check the input is within viewport bounds
      const inputBox = await apiKeyInput.boundingBox();
      if (inputBox) {
        expect(inputBox.x).toBeGreaterThanOrEqual(0);
        expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(375 + 5);
      }
    }
  });

  test('login form is usable at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem('auth_token');
    });
    await page.reload();
    await page.waitForTimeout(3000);

    const serverAccess = page.locator('text=Server Access');
    if (await serverAccess.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Username and password inputs should be visible and within bounds
      const usernameInput = page.locator('input[aria-label="Username"]');
      const passwordInput = page.locator('input[aria-label="Password"]');

      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();

      const usernameBox = await usernameInput.boundingBox();
      if (usernameBox) {
        expect(usernameBox.x).toBeGreaterThanOrEqual(0);
        expect(usernameBox.x + usernameBox.width).toBeLessThanOrEqual(375 + 5);
      }
    }
  });
});

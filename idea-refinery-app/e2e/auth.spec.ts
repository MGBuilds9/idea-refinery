import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login screen when not authenticated', async ({ page }) => {
    // Set onboarding as complete but remove auth token to trigger login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem('auth_token');
    });
    await page.reload();

    // Should see the login screen with "Server Access" heading
    await expect(
      page.getByRole('heading', { name: 'Server Access' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show onboarding on fresh visit (no auth, no onboarding_complete)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();

    // Fresh state should show onboarding with "Connect Intelligence" step
    await expect(
      page.getByRole('heading', { name: 'Connect Intelligence' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display username and password fields on login screen', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem('auth_token');
    });
    await page.reload();

    // Wait for login screen to appear
    await expect(page.locator('text=Server Access')).toBeVisible({ timeout: 10000 });

    // Check for username and password inputs by aria-label
    const usernameInput = page.locator('input[aria-label="Username"]');
    const passwordInput = page.locator('input[aria-label="Password"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should handle invalid login gracefully', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem('auth_token');
    });
    await page.reload();

    // Wait for login screen
    await expect(page.locator('text=Server Access')).toBeVisible({ timeout: 10000 });

    // Fill in credentials
    const usernameInput = page.locator('input[aria-label="Username"]');
    const passwordInput = page.locator('input[aria-label="Password"]');

    await usernameInput.fill('wronguser');
    await passwordInput.fill('wrongpassword');

    // Submit the form
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Wait for the request to complete (will fail since no server is running on /api/auth/login)
    await page.waitForTimeout(3000);

    // Page should still be functional - either shows error message or stays on login
    // The app catches errors gracefully and shows them in a role="alert" element
    const errorAlert = page.locator('[role="alert"]');
    const stillOnLogin = page.locator('text=Server Access');

    // Either we see an error message or we're still on the login screen
    const hasError = await errorAlert.isVisible().catch(() => false);
    const hasLogin = await stillOnLogin.isVisible().catch(() => false);

    expect(hasError || hasLogin).toBeTruthy();

    // Page should not have navigated to an error URL
    await expect(page).not.toHaveURL(/error/);
  });

  test('should keep submit button disabled when fields are empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_complete', 'true');
      localStorage.removeItem('auth_token');
    });
    await page.reload();

    await expect(page.locator('text=Server Access')).toBeVisible({ timeout: 10000 });

    // Submit button should be disabled when both fields are empty
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fill only username - should still be disabled
    const usernameInput = page.locator('input[aria-label="Username"]');
    await usernameInput.fill('someuser');
    await expect(submitBtn).toBeDisabled();

    // Fill password too - should now be enabled
    const passwordInput = page.locator('input[aria-label="Password"]');
    await passwordInput.fill('somepassword');
    await expect(submitBtn).toBeEnabled();
  });
});

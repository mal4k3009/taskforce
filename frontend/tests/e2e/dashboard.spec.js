import { test, expect } from '@playwright/test';

test.describe('Dashboard & Financials', () => {
  const timestamp = Date.now();
  const testEmail = `dashuser_${timestamp}@example.com`;
  
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async () => ['0xDashWalletAddress1234567890abcdef12345678'],
        on: () => {},
        removeListener: () => {}
      };
    });

    await page.goto('/');
    
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Min. 6 characters"]', 'Password123!');
    await page.fill('input[placeholder="••••••••"]', 'Password123!');
    
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('text=Live Orchestration Feed')).toBeVisible({ timeout: 15000 });
  });

  test('should view earnings and stats', async ({ page }) => {
    // Assuming there is a sidebar or navigation to a dashboard/stats page
    // For now we check if basic stats cards exist.
    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    if (await connectBtn.count() > 0) {
      await connectBtn.first().click();
    }
    
    // The main page should show some metrics, or we navigate to /dashboard
    await page.goto('/');
    
    await expect(page.locator('text=Tasks Settled')).toBeVisible();
    await expect(page.locator('text=Total Value')).toBeVisible();
  });
});

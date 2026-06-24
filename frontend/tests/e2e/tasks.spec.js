import { test, expect } from '@playwright/test';

// Helper to mock ethereum wallet
async function mockWallet(page) {
  await page.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async () => ['0xTestWalletAddress1234567890abcdef12345678'],
      on: () => {},
      removeListener: () => {}
    };
  });
}

test.describe('Task Orchestration', () => {
  const timestamp = Date.now();
  const testEmail = `taskuser_${timestamp}@example.com`;
  
  test.beforeEach(async ({ page }) => {
    await mockWallet(page);
    await page.goto('/');
    
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Min. 6 characters"]', 'Password123!');
    await page.fill('input[placeholder="••••••••"]', 'Password123!');
    
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('text=Live Orchestration Feed')).toBeVisible({ timeout: 15000 });
  });

  test('should submit a task and see result', async ({ page }) => {
    // Fill the command center input
    const textarea = page.locator('textarea[placeholder*="Describe your task"]');
    await expect(textarea).toBeVisible();
    await textarea.fill('Write a summary about artificial intelligence');
    
    // Click run
    await page.locator('button.bg-primary', { hasText: 'Deploy' }).click();
    
    // Check for streaming elements appearing
    await expect(page.locator('text=Lead agent received the task')).toBeVisible({ timeout: 15000 });
    
    // Wait for synthesis / completion
    // The backend mock returns "Orchestration complete."
    await expect(page.locator('text=Orchestration complete.')).toBeVisible({ timeout: 60000 });
    
    // Check if the final result block is visible (Assuming there's a result section)
    const resultBlock = page.locator('.task-result, text=Final Result'); 
    // We just verify that the status changed to completed or similar
    await expect(page.locator('text=COMPLETED').first()).toBeVisible({ timeout: 10000 });
  });
});

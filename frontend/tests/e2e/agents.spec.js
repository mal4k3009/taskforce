import { test, expect } from '@playwright/test';

// Helper to mock ethereum wallet
async function mockWallet(page) {
  await page.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          return ['0xTestWalletAddress1234567890abcdef12345678'];
        }
        if (method === 'personal_sign') {
          return 'test_signature';
        }
        return null;
      },
      on: () => {},
      removeListener: () => {}
    };
  });
}

test.describe('Agent Management', () => {
  const timestamp = Date.now();
  const testEmail = `agentuser_${timestamp}@example.com`;
  
  test.beforeEach(async ({ page }) => {
    await mockWallet(page);
    // Create user and login
    await page.goto('/');
    
    await page.click('button:has-text("Register")');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Min. 6 characters"]', 'Password123!');
    await page.fill('input[placeholder="••••••••"]', 'Password123!');
    
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('text=Live Orchestration Feed')).toBeVisible({ timeout: 15000 });
    
    // Connect Wallet (if not auto-connected by app logic)
    await page.waitForTimeout(1000); // Wait for potential state changes
    const connectBtn = page.locator('button:has-text("Connect Wallet")');
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
    }
    // Wait for the connected wallet address to appear in the header
    await expect(page.locator('text=0xTest')).toBeVisible({ timeout: 10000 });
  });

  test('should deploy a custom API agent', async ({ page }) => {
    // Navigate to agents or trigger deploy modal
    await page.goto('/'); 
    
    const deployBtn = page.locator('button.text-primary', { hasText: 'Deploy' });
    await deployBtn.click();
    
    // Fill Deploy Modal
    await page.fill('input[placeholder="e.g., SolidityAuditBot"]', 'Test Custom Agent');
    await page.selectOption('select', 'Writing'); // Assuming Writing is an option
    
    // Custom API Endpoint and Key
    await page.fill('input[placeholder="https://your-agent-api.com/webhook"]', 'http://127.0.0.1:9999/webhook');
    await page.fill('input[placeholder="Bearer token for your API"]', 'test-api-key');
    
    await page.click('button:has-text("Deploy Agent")');
    
    // Verify Success
    await expect(page.locator('text=Agent Deployed Successfully!')).toBeVisible();
  });
});

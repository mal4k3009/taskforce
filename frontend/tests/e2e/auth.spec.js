import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  test('should allow a new user to sign up', async ({ page }) => {
    await page.goto('/');
    
    // Switch to register tab
    await page.click('button:has-text("Register")');
    
    // Fill out sign up form
    await page.fill('input[type="email"]', testEmail);
    // There are two password fields in register, fill both
    await page.fill('input[placeholder="Min. 6 characters"]', testPassword);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    
    // Click submit
    await page.click('button:has-text("Create Account")');
    
    // Should navigate away from auth page
    await expect(page.locator('text=Live Orchestration Feed')).toBeVisible({ timeout: 15000 });
  });

  test('should allow user to log out and log back in', async ({ page }) => {
    // First sign in
    await page.goto('/');
    
    // Switch to login tab if needed (should be default)
    // await page.click('button:has-text("Sign In")'); // usually it's the default
    
    // wait for form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);
    
    // There might be two inputs with placeholder •••••••• (one in login, one in register)
    // To be safe:
    await page.fill('input[type="password"]', testPassword);
    
    await page.click('button:has-text("Sign In")');
    
    await expect(page.locator('text=Live Orchestration Feed')).toBeVisible({ timeout: 15000 });
    
    // Log out is a button with "Sign Out" based on App.jsx
    await page.click('button:has-text("Sign Out")');
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });
});

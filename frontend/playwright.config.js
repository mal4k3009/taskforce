import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && python dummy_webhook.py',
      port: 9999,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../backend && uvicorn main:app --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: 'sqlite+aiosqlite:///taskforce_test.db',
        GEMINI_API_KEY: '' // Ensure mock fallback
      }
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    }
  ],
});

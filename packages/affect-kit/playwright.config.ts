import { defineConfig, devices } from '@playwright/test';

// Visual regression coverage for the components at known V/A coordinates.
// Run via the local playground app once it's wired up.
export default defineConfig({
  testDir: './test/visual',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'pnpm --filter playground dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
  },
});

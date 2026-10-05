import { defineConfig, devices } from '@playwright/test';

// The check-in flow end to end, against `vite dev` with local D1 and the
// lexicon (EXTRACTOR_MODEL is empty), so it needs no model and no network.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5277', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite dev --port 5277 --strictPort',
    url: 'http://localhost:5277',
    // Never reuse: another project's dev server could be on the port.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

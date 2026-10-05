import { defineConfig, devices } from '@playwright/test';

// The check-in flow end to end, against `vite dev` in wrangler's `e2e`
// environment: the lexicon (no model, no network), its own vars
// (.dev.vars.e2e), a fresh local D1 (.wrangler/e2e) and its own port, so it
// never touches a dev server, log or settings you're using. (wrangler's
// --persist-to adds a v3/ folder; the platform proxy's persist path doesn't.)
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5278', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'rm -rf .wrangler/e2e && pnpm exec wrangler d1 migrations apply checkin --local --env e2e --persist-to .wrangler/e2e && CHECKIN_ENV=e2e CHECKIN_STATE=.wrangler/e2e/v3 pnpm exec vite dev --port 5278 --strictPort',
    url: 'http://localhost:5278',
    // Never reuse: another project's dev server could be on the port.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

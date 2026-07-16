import { defineConfig, devices } from '@playwright/test';

/**
 * E2e against the BUILT site (S0.2.3) — run `pnpm build` first.
 * Serving the production build (not the dev server) keeps these tests
 * honest about what readers and agents actually receive.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3517/pokedocs/',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm docusaurus serve --port 3517 --no-open',
    url: 'http://localhost:3517/pokedocs/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

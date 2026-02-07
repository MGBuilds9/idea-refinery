import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'PORT=3001 npm run start',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

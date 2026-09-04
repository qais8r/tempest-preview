import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  timeout: process.env.CI ? 60000 : 30000,
  use: {
    baseURL: 'http://127.0.0.1:4537/tempest-web/',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: { ignoreDefaultArgs: ['--disable-back-forward-cache'] },
      },
    },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run build:preview && node tests/helpers/serve-preview.mjs',
    env: {
      CONTENT_DIR: new URL('./content', import.meta.url).pathname,
      SITE_URL: 'http://127.0.0.1:4537',
      BASE_PATH: '/tempest-web',
    },
    url: 'http://127.0.0.1:4537/tempest-web/',
    timeout: 120000,
  },
});

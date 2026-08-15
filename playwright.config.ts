import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

const artifactsRoot = join(tmpdir(), 'brisa-playwright')

export default defineConfig({
  testDir: './e2e',
  forbidOnly: true,
  updateSnapshots: 'none',
  outputDir: join(artifactsRoot, 'test-results'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: join(artifactsRoot, 'report') }],
  ],
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
})

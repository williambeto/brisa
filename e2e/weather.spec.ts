import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'
import {
  celsiusForecast,
  emptyGeocodingResults,
  expect,
  fahrenheitForecast,
  geocodingResults,
  nightForecast,
  ok,
  test,
  unavailable,
} from './fixtures'

async function preparePage(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
}

async function openSuccess(page: Page) {
  await preparePage(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'São Paulo' })).toBeVisible()
}

async function audit(page: Page, testInfo: TestInfo, checkpoint: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const path = testInfo.outputPath(`axe-${checkpoint}.json`)
  await writeFile(path, JSON.stringify(result, null, 2))
  await testInfo.attach(`axe-${checkpoint}`, { path, contentType: 'application/json' })
  expect(result.violations, `Axe em ${checkpoint}`).toEqual([])
}

async function stabilizeVisuals(page: Page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  })
}

test('sucesso acessível e baseline visual', async ({ page, mockOpenMeteo }, testInfo) => {
  mockOpenMeteo({ forecast: ok(celsiusForecast) })
  await openSuccess(page)
  await audit(page, testInfo, 'success')
  await stabilizeVisuals(page)
  await expect(page).toHaveScreenshot('success.png', { fullPage: true, animations: 'disabled' })
})

test('combobox com 12 localidades, teclado e baseline visual', async ({ page, mockOpenMeteo }, testInfo) => {
  mockOpenMeteo({ forecast: ok(celsiusForecast), geocoding: ok(geocodingResults) })
  await openSuccess(page)
  const search = page.getByRole('combobox', { name: 'Pesquisar cidade' })
  await search.fill('Rio')
  const options = page.getByRole('option')
  await expect(options).toHaveCount(12)
  await search.press('ArrowDown')
  await expect(options.first()).toHaveAttribute('aria-selected', 'true')
  await audit(page, testInfo, 'combobox')
  await stabilizeVisuals(page)
  await expect(page).toHaveScreenshot('combobox-open.png', { fullPage: true, animations: 'disabled' })
})

test('busca vazia e erro 503 recuperam sem rede real', async ({ page, mockOpenMeteo }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'cenário concentrado no desktop')
  mockOpenMeteo({
    forecast: ok(celsiusForecast),
    geocoding: ok(emptyGeocodingResults),
  })
  await openSuccess(page)
  const search = page.getByRole('combobox', { name: 'Pesquisar cidade' })
  await search.fill('Lugar inexistente')
  await expect(page.getByText('Nenhum lugar encontrado')).toBeVisible()
  await audit(page, testInfo, 'search-empty')
  mockOpenMeteo({ geocoding: [unavailable(), ok(geocodingResults)] })
  await search.fill('Rio')
  await expect(page.getByText('A busca ficou sem conexão')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('option')).toHaveCount(12)
  await audit(page, testInfo, 'search-recovered')
})

test('erro inicial da previsão recupera por retry', async ({ page, mockOpenMeteo }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'cenário concentrado no mobile')
  mockOpenMeteo({ forecast: [unavailable(), ok(celsiusForecast)] })
  await preparePage(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Não foi possível abrir esta previsão.' })).toBeVisible()
  await audit(page, testInfo, 'forecast-initial-error')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'São Paulo' })).toBeVisible()
  await audit(page, testInfo, 'forecast-initial-recovered')
})

test('refresh falho preserva leitura anterior e recupera', async ({ page, mockOpenMeteo }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'cenário concentrado no desktop')
  mockOpenMeteo({
    forecast: [ok(celsiusForecast), unavailable(120), ok(celsiusForecast)],
    geocoding: ok(geocodingResults),
  })
  await openSuccess(page)
  const search = page.getByRole('combobox', { name: 'Pesquisar cidade' })
  await search.fill('Rio')
  await page.getByRole('option').first().click()
  await expect(page.getByRole('heading', { name: 'São Paulo' })).toBeVisible()
  await expect(page.getByText('A leitura anterior continua visível.')).toBeVisible()
  await audit(page, testInfo, 'stale-refresh')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Rio de Janeiro' })).toBeVisible()
})

test('troca C para F expõe pendência, falha e recovery', async ({ page, mockOpenMeteo }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'cenário concentrado no mobile')
  mockOpenMeteo({ forecast: [ok(celsiusForecast), unavailable(180), ok(fahrenheitForecast)] })
  await openSuccess(page)
  await page.getByRole('button', { name: '°F' }).click()
  await expect(page.getByText('Atualizando para graus Fahrenheit…')).toBeVisible()
  await expect(page.getByText('A leitura anterior continua visível.')).toBeVisible()
  await audit(page, testInfo, 'unit-failed')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('77°F')).toBeVisible()
  await expect(page.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true')
  await audit(page, testInfo, 'unit-recovered')
})

test('storage inválido usa fallback local e fixture noturna', async ({ page, mockOpenMeteo }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'cenário concentrado no mobile')
  mockOpenMeteo({ forecast: ok(nightForecast) })
  await page.addInitScript(() => localStorage.setItem('brisa:last-location', '{inválido'))
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'São Paulo' })).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-period', 'night')
  await audit(page, testInfo, 'fallback-night')
})

test('exibe métricas de índice UV e pressão atmosférica com auditoria de acessibilidade', async ({ page, mockOpenMeteo }, testInfo) => {
  mockOpenMeteo({ forecast: ok(celsiusForecast) })
  await openSuccess(page)
  await expect(page.getByText('Índice UV')).toBeVisible()
  await expect(page.getByText('Pressão')).toBeVisible()
  await expect(page.getByText('1.013 hPa')).toBeVisible()
  await audit(page, testInfo, 'uv-pressure-metrics')
})

test('alterna tema visual entre claro, escuro e sistema preservando acessibilidade', async ({ page, mockOpenMeteo }, testInfo) => {
  mockOpenMeteo({ forecast: ok(celsiusForecast) })
  await openSuccess(page)
  const shell = page.locator('.app-shell')

  const darkButton = page.getByRole('button', { name: 'Tema escuro' })
  await darkButton.click()
  await expect(shell).toHaveAttribute('data-period', 'night')
  await expect(shell).toHaveAttribute('data-theme', 'dark')
  await audit(page, testInfo, 'theme-dark')

  const lightButton = page.getByRole('button', { name: 'Tema claro' })
  await lightButton.click()
  await expect(shell).toHaveAttribute('data-period', 'day')
  await expect(shell).toHaveAttribute('data-theme', 'light')
  await audit(page, testInfo, 'theme-light')

  const systemButton = page.getByRole('button', { name: 'Automático pelo sistema' })
  await systemButton.click()
  await expect(shell).toHaveAttribute('data-theme', 'system')
  await audit(page, testInfo, 'theme-system')
})

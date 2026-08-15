import { expect, test as base } from '@playwright/test'

const localOrigin = 'http://127.0.0.1:4173'
const endpoints = {
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  forecast: 'https://api.open-meteo.com/v1/forecast',
} as const

export type MockReply = {
  body: unknown
  status?: number
  delayMs?: number
}

type OpenMeteoMocks = Partial<Record<keyof typeof endpoints, MockReply | MockReply[]>>
type NetworkFixtures = {
  mockOpenMeteo: (mocks: OpenMeteoMocks) => void
}

export const locations = Array.from({ length: 12 }, (_, index) => ({
  id: 1000 + index,
  name: index === 0 ? 'Rio de Janeiro' : `Cidade ${String(index + 1).padStart(2, '0')}`,
  admin1: index === 0 ? 'Rio de Janeiro' : 'Estado fixo',
  country: 'Brasil',
  country_code: 'BR',
  latitude: -22.9068 + index / 100,
  longitude: -43.1729 + index / 100,
  timezone: 'America/Sao_Paulo',
}))

export const geocodingResults = { results: locations }
export const emptyGeocodingResults = { results: [] }

export function weatherFixture(unit: 'celsius' | 'fahrenheit', night = false) {
  const temperature = unit === 'celsius' ? 25 : 77
  const apparent = unit === 'celsius' ? 26 : 79
  const unitLabel = unit === 'celsius' ? '°C' : '°F'
  const hours = Array.from({ length: 30 }, (_, index) => `2026-08-${String(15 + Math.floor(index / 24)).padStart(2, '0')}T${String(index % 24).padStart(2, '0')}:00`)
  const dates = Array.from({ length: 7 }, (_, index) => `2026-08-${String(15 + index).padStart(2, '0')}`)

  return {
    timezone: 'America/Sao_Paulo',
    timezone_abbreviation: '-03',
    current: {
      time: '2026-08-15T12:00',
      temperature_2m: temperature,
      apparent_temperature: apparent,
      relative_humidity_2m: 63,
      precipitation: 0,
      weather_code: night ? 0 : 1,
      wind_speed_10m: 14,
      is_day: night ? 0 : 1,
    },
    current_units: {
      temperature_2m: unitLabel,
      relative_humidity_2m: '%',
      precipitation: 'mm',
      wind_speed_10m: 'km/h',
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, index) => temperature + (index % 4)),
      precipitation_probability: hours.map((_, index) => (index * 7) % 60),
      weather_code: hours.map(() => (night ? 0 : 1)),
      is_day: hours.map(() => (night ? 0 : 1)),
    },
    hourly_units: { precipitation_probability: '%' },
    daily: {
      time: dates,
      weather_code: dates.map(() => (night ? 0 : 1)),
      temperature_2m_max: dates.map((_, index) => temperature + 3 + index),
      temperature_2m_min: dates.map((_, index) => temperature - 5 + index),
      precipitation_probability_max: dates.map((_, index) => index * 8),
      sunrise: dates.map((date) => `${date}T06:22`),
      sunset: dates.map((date) => `${date}T17:48`),
      wind_speed_10m_max: dates.map((_, index) => 18 + index),
    },
    daily_units: { wind_speed_10m_max: 'km/h' },
  }
}

export const celsiusForecast = weatherFixture('celsius')
export const fahrenheitForecast = weatherFixture('fahrenheit')
export const nightForecast = weatherFixture('celsius', true)

export const ok = (body: unknown, delayMs?: number): MockReply => ({ body, delayMs })
export const unavailable = (delayMs?: number): MockReply => ({
  body: { reason: 'Serviço temporariamente indisponível.' },
  status: 503,
  delayMs,
})

export const test = base.extend<NetworkFixtures>({
  mockOpenMeteo: [
    async ({ context }, use) => {
      const mocks: OpenMeteoMocks = {}
      const positions: Partial<Record<keyof typeof endpoints, number>> = {}
      const violations: string[] = []

      await context.route('**/*', async (route) => {
        const requestUrl = route.request().url()
        const url = new URL(requestUrl)
        if (url.origin === localOrigin) {
          await route.continue()
          return
        }

        const mockName = Object.entries(endpoints).find(([, endpoint]) => {
          const expected = new URL(endpoint)
          return url.origin === expected.origin && url.pathname === expected.pathname
        })?.[0] as keyof OpenMeteoMocks | undefined
        const configured = mockName ? mocks[mockName] : undefined

        if (!mockName || !configured) {
          violations.push(requestUrl)
          await route.abort('blockedbyclient')
          return
        }

        const replies = Array.isArray(configured) ? configured : [configured]
        const position = positions[mockName] ?? 0
        const reply = replies[Math.min(position, replies.length - 1)]
        positions[mockName] = position + 1
        if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs))
        await route.fulfill({
          status: reply.status ?? 200,
          contentType: 'application/json',
          body: JSON.stringify(reply.body),
        })
      })

      await context.routeWebSocket(/^(?!ws:\/\/127\.0\.0\.1:4173(?:\/|$)).+/, async (webSocket) => {
        violations.push(webSocket.url())
        await webSocket.close({ code: 1008, reason: 'Rede externa bloqueada no teste' })
      })

      await use((nextMocks) => {
        Object.assign(mocks, nextMocks)
        for (const name of Object.keys(nextMocks) as (keyof OpenMeteoMocks)[]) positions[name] = 0
      })
      expect(violations, 'requisições HTTP(S) ou WebSocket externas não mockadas').toEqual([])
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'

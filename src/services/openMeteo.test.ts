import { describe, expect, it, vi } from 'vitest'
import { fetchWeather, OpenMeteoRequestError, searchLocations } from './openMeteo'

const location = {
  name: 'São Paulo',
  country: 'Brasil',
  latitude: -23.55,
  longitude: -46.63,
}

describe('cliente Open-Meteo', () => {
  it('busca cidades em português e descarta resultados incompletos', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => jsonResponse({
        results: [
          {
            id: 1,
            name: 'São Paulo',
            admin1: 'São Paulo',
            country: 'Brasil',
            country_code: 'BR',
            latitude: -23.55,
            longitude: -46.63,
            timezone: 'America/Sao_Paulo',
          },
          { name: 'Resultado quebrado' },
        ],
      }),
    )

    const results = await searchLocations('  São Paulo  ', undefined, fetchMock as typeof fetch)
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))

    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      'https://geocoding-api.open-meteo.com/v1/search',
    )
    expect(requestedUrl.searchParams.get('name')).toBe('São Paulo')
    expect(requestedUrl.searchParams.get('language')).toBe('pt')
    expect(results).toEqual([
      expect.objectContaining({ name: 'São Paulo', admin1: 'São Paulo', countryCode: 'BR' }),
    ])
  })

  it('solicita os campos oficiais e normaliza as próximas 24 horas e os sete dias', async () => {
    const hourlyTimes = Array.from({ length: 30 }, (_, index) =>
      `2026-08-${String(11 + Math.floor((index + 9) / 24)).padStart(2, '0')}T${String((index + 9) % 24).padStart(2, '0')}:00`,
    )
    const sequence = Array.from({ length: 30 }, (_, index) => index)
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => jsonResponse({
        timezone: 'America/Sao_Paulo',
        timezone_abbreviation: 'GMT-3',
        current: {
          time: '2026-08-11T10:30',
          temperature_2m: 21.4,
          apparent_temperature: 20.7,
          relative_humidity_2m: 71,
          precipitation: 0,
          weather_code: 2,
          wind_speed_10m: 12.2,
          is_day: 1,
          uv_index: 5.5,
          surface_pressure: 1012.4,
        },
        current_units: {
          temperature_2m: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          wind_speed_10m: 'km/h',
          surface_pressure: 'hPa',
        },
        hourly: {
          time: hourlyTimes,
          temperature_2m: sequence,
          precipitation_probability: sequence,
          weather_code: sequence.map(() => 2),
          is_day: sequence.map(() => 1),
        },
        hourly_units: { precipitation_probability: '%' },
        daily: {
          time: Array.from({ length: 7 }, (_, index) => `2026-08-${String(11 + index).padStart(2, '0')}`),
          weather_code: [2, 3, 61, 0, 1, 80, 95],
          temperature_2m_max: [25, 24, 22, 26, 27, 23, 21],
          temperature_2m_min: [15, 16, 15, 14, 16, 17, 16],
          precipitation_probability_max: [10, 20, 70, 5, 5, 60, 80],
          sunrise: Array.from({ length: 7 }, () => '2026-08-11T06:30'),
          sunset: Array.from({ length: 7 }, () => '2026-08-11T17:45'),
          wind_speed_10m_max: [20, 18, 24, 15, 17, 26, 31],
          uv_index_max: [6, 7, 5, 8, 8, 4, 3],
        },
        daily_units: { wind_speed_10m_max: 'km/h' },
      }),
    )

    const forecast = await fetchWeather(location, 'celsius', undefined, fetchMock as typeof fetch)
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))

    expect(requestedUrl.searchParams.get('current')).toContain('apparent_temperature')
    expect(requestedUrl.searchParams.get('current')).toContain('uv_index')
    expect(requestedUrl.searchParams.get('current')).toContain('surface_pressure')
    expect(requestedUrl.searchParams.get('daily')).toContain('precipitation_probability_max')
    expect(requestedUrl.searchParams.get('daily')).toContain('uv_index_max')
    expect(requestedUrl.searchParams.get('timezone')).toBe('auto')
    expect(requestedUrl.searchParams.get('temperature_unit')).toBe('celsius')
    expect(forecast.hourly).toHaveLength(24)
    expect(forecast.hourly[0]).toMatchObject({ time: '2026-08-11T10:00', temperature: 1 })
    expect(forecast.daily).toHaveLength(7)
    expect(forecast.daily[0]?.uvIndexMax).toBe(6)
    expect(forecast.current.isDay).toBe(true)
    expect(forecast.current.uvIndex).toBe(5.5)
    expect(forecast.current.surfacePressure).toBe(1012.4)
    expect(forecast.units.surfacePressure).toBe('hPa')
  })

  it('transforma erros HTTP em uma falha de domínio acionável', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ reason: 'Serviço temporariamente indisponível' }, 503))

    await expect(fetchWeather(location, 'fahrenheit', undefined, fetchMock as typeof fetch)).rejects.toEqual(
      expect.objectContaining<Partial<OpenMeteoRequestError>>({
        name: 'OpenMeteoRequestError',
        message: 'Serviço temporariamente indisponível',
        status: 503,
      }),
    )
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

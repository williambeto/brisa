import type {
  DailyWeather,
  HourlyWeather,
  TemperatureUnit,
  WeatherForecast,
  WeatherLocation,
} from '../types/weather'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'is_day',
  'uv_index',
  'surface_pressure',
]

const HOURLY_FIELDS = [
  'temperature_2m',
  'precipitation_probability',
  'weather_code',
  'is_day',
]

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'sunrise',
  'sunset',
  'wind_speed_10m_max',
  'uv_index_max',
]

export class OpenMeteoRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'OpenMeteoRequestError'
  }
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<WeatherLocation[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const url = new URL(GEOCODING_URL)
  url.search = new URLSearchParams({
    name: normalizedQuery,
    count: '8',
    language: 'pt',
    format: 'json',
  }).toString()

  const response = await fetcher(url, { signal })
  await assertSuccessfulResponse(response, 'Não foi possível buscar cidades agora.')

  const payload: unknown = await response.json()
  const results = readArray(readRecord(payload), 'results')
  return results.map(normalizeLocation).filter((location): location is WeatherLocation => location !== null)
}

export async function fetchWeather(
  location: WeatherLocation,
  unit: TemperatureUnit,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<WeatherForecast> {
  const url = new URL(FORECAST_URL)
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: unit,
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timeformat: 'iso8601',
  }).toString()

  const response = await fetcher(url, { signal })
  await assertSuccessfulResponse(response, 'Não foi possível consultar a previsão agora.')
  const payload: unknown = await response.json()
  return normalizeForecast(payload, unit)
}

export function normalizeForecast(payload: unknown, unit: TemperatureUnit): WeatherForecast {
  const root = readRecord(payload)
  const current = readRecord(root.current)
  const currentUnits = readRecord(root.current_units)
  const hourly = readRecord(root.hourly)
  const hourlyUnits = readRecord(root.hourly_units)
  const daily = readRecord(root.daily)
  const dailyUnits = readRecord(root.daily_units)

  const currentTime = readString(current.time) ?? ''
  const hourlyTimes = readStringArray(hourly.time)
  const startIndex = findCurrentHourIndex(hourlyTimes, currentTime)
  const hourlyForecast = hourlyTimes.slice(startIndex, startIndex + 24).map<HourlyWeather>((time, offset) => {
    const index = startIndex + offset
    return {
      time,
      temperature: readNumberAt(hourly.temperature_2m, index),
      precipitationProbability: readNumberAt(hourly.precipitation_probability, index),
      weatherCode: readNumberAt(hourly.weather_code, index),
      isDay: readBooleanAt(hourly.is_day, index),
    }
  })

  const dates = readStringArray(daily.time).slice(0, 7)
  const dailyForecast = dates.map<DailyWeather>((date, index) => ({
    date,
    weatherCode: readNumberAt(daily.weather_code, index),
    temperatureMax: readNumberAt(daily.temperature_2m_max, index),
    temperatureMin: readNumberAt(daily.temperature_2m_min, index),
    precipitationProbability: readNumberAt(daily.precipitation_probability_max, index),
    sunrise: readStringAt(daily.sunrise, index),
    sunset: readStringAt(daily.sunset, index),
    windSpeedMax: readNumberAt(daily.wind_speed_10m_max, index),
    uvIndexMax: readNumberAt(daily.uv_index_max, index),
  }))

  if (!currentTime && hourlyForecast.length === 0 && dailyForecast.length === 0) {
    throw new OpenMeteoRequestError('A resposta meteorológica chegou incompleta.')
  }

  return {
    timezone: readString(root.timezone) ?? 'auto',
    timezoneAbbreviation: readString(root.timezone_abbreviation) ?? '',
    updatedAt: currentTime,
    unit,
    current: {
      time: currentTime,
      temperature: readNumber(current.temperature_2m),
      apparentTemperature: readNumber(current.apparent_temperature),
      humidity: readNumber(current.relative_humidity_2m),
      precipitation: readNumber(current.precipitation),
      weatherCode: readNumber(current.weather_code),
      windSpeed: readNumber(current.wind_speed_10m),
      isDay: readBoolean(current.is_day),
      uvIndex: readNumber(current.uv_index),
      surfacePressure: readNumber(current.surface_pressure),
    },
    hourly: hourlyForecast,
    daily: dailyForecast,
    units: {
      temperature:
        readString(currentUnits.temperature_2m) ?? (unit === 'celsius' ? '°C' : '°F'),
      humidity: readString(currentUnits.relative_humidity_2m) ?? '%',
      precipitation: readString(currentUnits.precipitation) ?? 'mm',
      precipitationProbability: readString(hourlyUnits.precipitation_probability) ?? '%',
      windSpeed:
        readString(currentUnits.wind_speed_10m) ?? readString(dailyUnits.wind_speed_10m_max) ?? 'km/h',
      surfacePressure: readString(currentUnits.surface_pressure) ?? 'hPa',
      uvIndex: '',
    },
  }
}

async function assertSuccessfulResponse(response: Response, fallbackMessage: string) {
  if (response.ok) return

  let reason = fallbackMessage
  try {
    const body: unknown = await response.json()
    const apiReason = readString(readRecord(body).reason)
    if (apiReason) reason = apiReason
  } catch {
    // A mensagem local continua sendo o fallback seguro.
  }
  throw new OpenMeteoRequestError(reason, response.status)
}

function normalizeLocation(value: unknown): WeatherLocation | null {
  const record = readRecord(value)
  const name = readString(record.name)
  const country = readString(record.country)
  const latitude = readNumber(record.latitude)
  const longitude = readNumber(record.longitude)

  if (!name || !country || latitude === null || longitude === null) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

  const location: WeatherLocation = { name, country, latitude, longitude }
  const id = readNumber(record.id)
  const admin1 = readString(record.admin1)
  const countryCode = readString(record.country_code)
  const timezone = readString(record.timezone)

  if (id !== null) location.id = id
  if (admin1) location.admin1 = admin1
  if (countryCode) location.countryCode = countryCode
  if (timezone) location.timezone = timezone
  return location
}

function findCurrentHourIndex(times: string[], currentTime: string) {
  if (!currentTime) return 0
  const currentHour = currentTime.slice(0, 13)
  const index = times.findIndex((time) => time.slice(0, 13) >= currentHour)
  return index >= 0 ? index : 0
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function readArray(record: Record<string, unknown>, key: string) {
  return Array.isArray(record[key]) ? record[key] : []
}

function readString(value: unknown) {
  return typeof value === 'string' && value ? value : null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown) {
  const number = readNumber(value)
  return number === null ? null : number === 1
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readNumberAt(value: unknown, index: number) {
  return Array.isArray(value) ? readNumber(value[index]) : null
}

function readStringAt(value: unknown, index: number) {
  return Array.isArray(value) ? readString(value[index]) : null
}

function readBooleanAt(value: unknown, index: number) {
  return Array.isArray(value) ? readBoolean(value[index]) : null
}

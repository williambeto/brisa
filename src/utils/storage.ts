import type { WeatherLocation } from '../types/weather'

const STORAGE_KEY = 'brisa:last-location'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const DEFAULT_LOCATION: WeatherLocation = {
  id: 3448439,
  name: 'São Paulo',
  admin1: 'São Paulo',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -23.5475,
  longitude: -46.63611,
  timezone: 'America/Sao_Paulo',
}

export function parseStoredLocation(value: string | null): WeatherLocation | null {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) return null

    const name = readText(parsed.name)
    const country = readText(parsed.country)
    const latitude = readCoordinate(parsed.latitude, -90, 90)
    const longitude = readCoordinate(parsed.longitude, -180, 180)

    if (!name || !country || latitude === null || longitude === null) return null

    const location: WeatherLocation = { name, country, latitude, longitude }
    const id = readFiniteNumber(parsed.id)
    const admin1 = readText(parsed.admin1)
    const countryCode = readText(parsed.countryCode)
    const timezone = readText(parsed.timezone)

    if (id !== null) location.id = id
    if (admin1) location.admin1 = admin1
    if (countryCode) location.countryCode = countryCode
    if (timezone) location.timezone = timezone
    return location
  } catch {
    return null
  }
}

export function readStoredLocation(storage?: StorageLike | null) {
  const target = storage ?? getBrowserStorage()
  if (!target) return null

  try {
    return parseStoredLocation(target.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveStoredLocation(location: WeatherLocation, storage?: StorageLike | null) {
  const target = storage ?? getBrowserStorage()
  if (!target) return false

  try {
    target.setItem(STORAGE_KEY, JSON.stringify(location))
    return true
  } catch {
    return false
  }
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readCoordinate(value: unknown, minimum: number, maximum: number) {
  const number = readFiniteNumber(value)
  return number !== null && number >= minimum && number <= maximum ? number : null
}

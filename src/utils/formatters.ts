import type { TemperatureUnit, WeatherLocation } from '../types/weather'

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

export function formatTemperature(value: number | null, unit: TemperatureUnit) {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${numberFormatter.format(value)}°${unit === 'celsius' ? 'C' : 'F'}`
}

export function formatTemperatureValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${numberFormatter.format(value)}°`
}

export function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Indisponível'
  return `${numberFormatter.format(value)}%`
}

export function formatMeasurement(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return 'Indisponível'
  return `${decimalFormatter.format(value)} ${unit}`
}

export function formatHour(time: string) {
  const hour = time.match(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):([0-5]\d)$/)
  return hour ? `${hour[1]}:${hour[2]}` : 'Horário indisponível'
}

export function formatDay(date: string, index: number) {
  if (index === 0) return 'Hoje'
  const parsed = parseApiDate(date)
  if (!parsed) return 'Dia'
  const label = weekdayFormatter.format(parsed).replace('.', '')
  return `${label.charAt(0).toLocaleUpperCase('pt-BR')}${label.slice(1)}`
}

export function formatShortDate(date: string) {
  const parsed = parseApiDate(date)
  if (!parsed) return 'Data indisponível'
  return dateFormatter.format(parsed).replace('.', '')
}

export function formatLocationContext(location: WeatherLocation) {
  return [location.admin1, location.country]
    .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
    .join(' · ')
}

export function formatUpdatedAt(time: string) {
  const formatted = formatHour(time)
  return formatted === 'Horário indisponível' ? 'Horário de atualização indisponível' : `Atualizado às ${formatted}`
}

function parseApiDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

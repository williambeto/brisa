import { describe, expect, it } from 'vitest'
import {
  formatDay,
  formatHour,
  formatLocationContext,
  formatMeasurement,
  formatPercent,
  formatShortDate,
  formatTemperature,
  formatTemperatureValue,
  formatUpdatedAt,
  formatUvCategory,
  formatUvDescription,
  formatUvIndex,
} from './formatters'

describe('formatadores pt-BR', () => {
  it('extrai HH:mm diretamente do horário local da API', () => {
    expect(formatHour('2026-08-11T00:05')).toBe('00:05')
    expect(formatHour('2026-08-11T23:59')).toBe('23:59')
    expect(formatUpdatedAt('2026-08-11T10:30')).toBe('Atualizado às 10:30')
  })

  it('rejeita strings de horário inválidas', () => {
    expect(formatHour('2026-08-11T24:00')).toBe('Horário indisponível')
    expect(formatHour('2026-08-11T10:60')).toBe('Horário indisponível')
    expect(formatHour('prefixoT10:30sufixo')).toBe('Horário indisponível')
    expect(formatHour('')).toBe('Horário indisponível')
    expect(formatUpdatedAt('inválido')).toBe('Horário de atualização indisponível')
  })

  it('mantém os fallbacks centrais para valores indisponíveis', () => {
    expect(formatTemperature(null, 'celsius')).toBe('—')
    expect(formatTemperature(Number.NaN, 'fahrenheit')).toBe('—')
    expect(formatTemperatureValue(Number.POSITIVE_INFINITY)).toBe('—')
    expect(formatPercent(null)).toBe('Indisponível')
    expect(formatMeasurement(Number.NaN, 'km/h')).toBe('Indisponível')
    expect(formatUvIndex(null)).toBe('Indisponível')
    expect(formatUvCategory(null)).toBe('Indisponível')
    expect(formatUvDescription(null)).toBe('Indisponível')
    expect(formatDay('inválido', 1)).toBe('Dia')
    expect(formatShortDate('inválida')).toBe('Data indisponível')
  })

  it('preserva os formatos centrais e o contexto sem duplicação', () => {
    expect(formatTemperature(21.4, 'celsius')).toBe('21°C')
    expect(formatTemperatureValue(21.6)).toBe('22°')
    expect(formatPercent(71)).toBe('71%')
    expect(formatMeasurement(12.25, 'km/h')).toBe('12,3 km/h')
    expect(formatDay('2026-08-11', 0)).toBe('Hoje')
    expect(formatLocationContext({
      name: 'São Paulo',
      admin1: 'Brasil',
      country: 'Brasil',
      latitude: -23.55,
      longitude: -46.63,
    })).toBe('Brasil')
    expect(formatUvIndex(5.2)).toBe('5,2')
    expect(formatUvCategory(1)).toBe('Baixo')
    expect(formatUvCategory(4)).toBe('Moderado')
    expect(formatUvCategory(6.5)).toBe('Alto')
    expect(formatUvCategory(9)).toBe('Muito alto')
    expect(formatUvCategory(11.5)).toBe('Extremo')
    expect(formatUvDescription(6.5)).toBe('6,5 (Alto)')
  })
})

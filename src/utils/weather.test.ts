import { describe, expect, it } from 'vitest'
import { getWeatherDescription } from './weather'

describe('getWeatherDescription', () => {
  it('diferencia céu limpo durante o dia e à noite', () => {
    expect(getWeatherDescription(0, true)).toMatchObject({
      label: 'Céu limpo',
      category: 'clear',
      icon: 'clear-day',
    })
    expect(getWeatherDescription(0, false)).toMatchObject({
      label: 'Noite limpa',
      category: 'clear',
      icon: 'clear-night',
    })
  })

  it.each([
    [45, 'fog', 'Nevoeiro'],
    [63, 'rain', 'Chuva moderada'],
    [75, 'snow', 'Neve forte'],
    [99, 'storm', 'Tempestade com granizo'],
  ] as const)('mapeia o código WMO %i', (code, category, label) => {
    expect(getWeatherDescription(code)).toMatchObject({ category, label })
  })

  it('mantém um fallback legível para códigos ausentes ou futuros', () => {
    expect(getWeatherDescription(120)).toEqual({
      label: 'Condição indisponível',
      category: 'cloudy',
      icon: 'unknown',
    })
  })
})

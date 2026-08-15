import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { weatherFixture } from '../test/weatherFixture'
import DailyForecast from './DailyForecast.vue'

describe('DailyForecast', () => {
  it.each([
    ['celsius' as const, 'mínima 16°C', 'máxima 24°C'],
    ['fahrenheit' as const, 'mínima 64°F', 'máxima 72°F'],
  ])('nomeia cada dia com contexto completo em %s', (unit, minimum, maximum) => {
    const wrapper = mount(DailyForecast, { props: { forecast: weatherFixture(unit) } })
    const name = wrapper.get('.daily-row').attributes('aria-label')

    expect(name).toContain('Hoje, 14 de ago')
    expect(name).toContain('condição: Parcialmente nublado')
    expect(name).toContain(minimum)
    expect(name).toContain(maximum)
    expect(name).toContain('chance máxima de chuva: 30%')
    expect(name).toContain('nascer do sol: 06:30')
    expect(name).toContain('pôr do sol: 17:45')
    expect(name).toContain('vento máximo: 20 km/h')
  })

  it('expõe fallbacks com unidade e contexto de cada medição', () => {
    const forecast = weatherFixture('fahrenheit')
    forecast.daily[0] = {
      date: 'inválida',
      weatherCode: null,
      temperatureMax: null,
      temperatureMin: null,
      precipitationProbability: null,
      sunrise: null,
      sunset: null,
      windSpeedMax: null,
    }
    const wrapper = mount(DailyForecast, { props: { forecast } })
    const name = wrapper.get('.daily-row').attributes('aria-label')

    expect(name).toContain('Hoje, Data indisponível')
    expect(name).toContain('Condição indisponível')
    expect(name).toContain('mínima indisponível em graus Fahrenheit')
    expect(name).toContain('máxima indisponível em graus Fahrenheit')
    expect(name).toContain('chance máxima de chuva: Indisponível')
    expect(name).toContain('nascer do sol: indisponível')
    expect(name).toContain('pôr do sol: indisponível')
    expect(name).toContain('vento máximo: Indisponível')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { weatherFixture } from '../test/weatherFixture'
import HourlyForecast from './HourlyForecast.vue'

describe('HourlyForecast', () => {
  it.each([
    ['celsius' as const, '20°C'],
    ['fahrenheit' as const, '68°F'],
  ])('nomeia cada hora com contexto completo em %s', (unit, temperature) => {
    const wrapper = mount(HourlyForecast, { props: { forecast: weatherFixture(unit) } })
    const name = wrapper.get('.hourly-item').attributes('aria-label')

    expect(name).toContain('Agora, 10:00')
    expect(name).toContain('condição: Parcialmente nublado')
    expect(name).toContain(`temperatura ${temperature}`)
    expect(name).toContain('chance de chuva: 25%')
  })

  it('expõe fallbacks de horário, condição, temperatura e chuva', () => {
    const forecast = weatherFixture()
    forecast.hourly[0] = {
      time: 'inválido',
      temperature: null,
      precipitationProbability: null,
      weatherCode: null,
      isDay: null,
    }
    const wrapper = mount(HourlyForecast, { props: { forecast } })
    const name = wrapper.get('.hourly-item').attributes('aria-label')

    expect(name).toContain('Horário indisponível')
    expect(name).toContain('Condição indisponível')
    expect(name).toContain('temperatura indisponível em graus Celsius')
    expect(name).toContain('chance de chuva: Indisponível')
  })
})

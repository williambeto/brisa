import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { weatherFixture } from '../test/weatherFixture'
import CurrentMetrics from './CurrentMetrics.vue'

describe('CurrentMetrics', () => {
  it('renderiza as seis métricas principais com valores formatados', () => {
    const forecast = weatherFixture('celsius')
    forecast.current.apparentTemperature = 22
    forecast.current.humidity = 65
    forecast.current.precipitation = 1.5
    forecast.current.windSpeed = 15.4
    forecast.current.uvIndex = 6.2
    forecast.current.surfacePressure = 1014.5

    const wrapper = mount(CurrentMetrics, { props: { forecast } })
    const text = wrapper.text()

    expect(text).toContain('Sensação')
    expect(text).toContain('22°C')
    expect(text).toContain('Umidade')
    expect(text).toContain('65%')
    expect(text).toContain('Chuva agora')
    expect(text).toContain('1,5 mm')
    expect(text).toContain('Vento')
    expect(text).toContain('15,4 km/h')
    expect(text).toContain('Índice UV')
    expect(text).toContain('6,2')
    expect(text).toContain('Pressão')
    expect(text).toContain('1.014,5 hPa')
  })

  it('exibe fallbacks adequados quando medições são nulas', () => {
    const forecast = weatherFixture('fahrenheit')
    forecast.current.apparentTemperature = null
    forecast.current.humidity = null
    forecast.current.precipitation = null
    forecast.current.windSpeed = null
    forecast.current.uvIndex = null
    forecast.current.surfacePressure = null

    const wrapper = mount(CurrentMetrics, { props: { forecast } })
    const text = wrapper.text()

    expect(text).toContain('—')
    expect(text).toContain('Indisponível')
  })
})

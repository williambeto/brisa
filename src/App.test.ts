import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWeather } from './services/openMeteo'
import { weatherFixture } from './test/weatherFixture'
import type { WeatherForecast, WeatherLocation } from './types/weather'
import { readStoredLocation, saveStoredLocation } from './utils/storage'
import App from './App.vue'

vi.mock('./services/openMeteo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./services/openMeteo')>()),
  fetchWeather: vi.fn(),
}))

vi.mock('./utils/storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./utils/storage')>()),
  readStoredLocation: vi.fn(),
  saveStoredLocation: vi.fn(),
}))

const fetchMock = vi.mocked(fetchWeather)
const readMock = vi.mocked(readStoredLocation)
const saveMock = vi.mocked(saveStoredLocation)
const rio: WeatherLocation = {
  name: 'Rio de Janeiro',
  country: 'Brasil',
  latitude: -22.91,
  longitude: -43.17,
}

beforeEach(() => {
  fetchMock.mockReset()
  readMock.mockReset().mockReturnValue(null)
  saveMock.mockReset().mockReturnValue(true)
})

describe('App forecast transacional', () => {
  it('mantém C após falha de F, refaz retry em F e confirma F atomicamente', async () => {
    const failedF = deferred<WeatherForecast>()
    const retriedF = deferred<WeatherForecast>()
    fetchMock
      .mockResolvedValueOnce(weatherFixture('celsius'))
      .mockReturnValueOnce(failedF.promise)
      .mockReturnValueOnce(retriedF.promise)
    const wrapper = await mountLoaded()

    await unitButton(wrapper, '°F').trigger('click')
    expect(wrapper.text()).toContain('Atualizando para graus Fahrenheit')
    expect(unitButton(wrapper, '°C').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('20°C')
    failedF.reject(new Error('offline'))
    await flushPromises()

    expect(wrapper.text()).toContain('A leitura anterior continua visível')
    expect(wrapper.text()).toContain('Não foi possível atualizar a previsão de São Paulo em graus Fahrenheit')
    expect(wrapper.text()).toContain('20°C')
    await buttonNamed(wrapper, 'Tentar novamente').trigger('click')
    expect(fetchMock.mock.calls[2]?.[1]).toBe('fahrenheit')
    expect(wrapper.text()).toContain('20°C')
    retriedF.resolve(weatherFixture('fahrenheit'))
    await flushPromises()

    expect(wrapper.text()).toContain('68°F')
    expect(unitButton(wrapper, '°F').attributes('aria-pressed')).toBe('true')
  })

  it('ignora resposta antiga que resolve depois da nova e somente o vencedor persiste', async () => {
    const stale = deferred<WeatherForecast>()
    const winner = deferred<WeatherForecast>()
    fetchMock
      .mockResolvedValueOnce(weatherFixture('celsius'))
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(winner.promise)
    const wrapper = await mountLoaded()
    saveMock.mockClear()

    await unitButton(wrapper, '°F').trigger('click')
    const staleSignal = fetchMock.mock.calls[1]?.[2]
    wrapper.findComponent({ name: 'CitySearch' }).vm.$emit('select', rio)
    await flushPromises()
    expect(staleSignal?.aborted).toBe(true)
    expect(fetchMock.mock.calls[2]?.[1]).toBe('fahrenheit')

    const rioForecast = weatherFixture('fahrenheit', 77)
    winner.resolve(rioForecast)
    await flushPromises()
    stale.resolve(weatherFixture('fahrenheit', 60))
    await flushPromises()

    expect(wrapper.text()).toContain('Rio de Janeiro')
    expect(wrapper.text()).toContain('77°F')
    expect(wrapper.text()).not.toContain('60°F')
    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock).toHaveBeenCalledWith(rio)
  })

  it('não muta nem persiste após unmount', async () => {
    const pending = deferred<WeatherForecast>()
    fetchMock.mockReturnValueOnce(pending.promise)
    const wrapper = mount(App)
    await flushPromises()
    const signal = fetchMock.mock.calls[0]?.[2]

    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    pending.resolve(weatherFixture())
    await flushPromises()
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('C→F→C invalida F e volta ao confirmado sem request C desnecessário', async () => {
    const fahrenheit = deferred<WeatherForecast>()
    fetchMock.mockResolvedValueOnce(weatherFixture()).mockReturnValueOnce(fahrenheit.promise)
    const wrapper = await mountLoaded()

    await unitButton(wrapper, '°F').trigger('click')
    const signal = fetchMock.mock.calls[1]?.[2]
    await unitButton(wrapper, '°C').trigger('click')

    expect(signal?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('20°C')
    expect(wrapper.text()).not.toContain('Atualizando para')
    fahrenheit.resolve(weatherFixture('fahrenheit'))
    await flushPromises()
    expect(wrapper.text()).toContain('20°C')
  })

  it.each([
    ['CurrentMetrics', ['Próximas 24 horas', 'Os próximos 7 dias']],
    ['HourlyForecast', ['Agora, em detalhes', 'Os próximos 7 dias']],
    ['DailyForecast', ['Agora, em detalhes', 'Próximas 24 horas']],
  ])('isola erro de %s, preserva seções irmãs e atribuição', async (component, siblings) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchMock.mockResolvedValueOnce(weatherFixture())
    const Broken = defineComponent({
      name: component,
      render() {
        throw new Error(`falha em ${component}`)
      },
    })
    const wrapper = mount(App, { global: { stubs: { [component]: Broken } } })
    await flushPromises()

    expect(wrapper.findAll('.contained-error')).toHaveLength(1)
    for (const sibling of siblings) expect(wrapper.text()).toContain(sibling)
    expect(wrapper.text()).toContain('Dados meteorológicos públicos da Open-Meteo')
  })

  it('mantém fallback e bloqueia retry concorrente até vencedor mudar a recovery key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const recovery = deferred<WeatherForecast>()
    fetchMock.mockResolvedValueOnce(weatherFixture()).mockReturnValueOnce(recovery.promise)
    const Broken = defineComponent({
      name: 'CurrentMetrics',
      render() {
        throw new Error('continua quebrado')
      },
    })
    const wrapper = mount(App, { global: { stubs: { CurrentMetrics: Broken } } })
    await flushPromises()

    await wrapper.get('.contained-error button').trigger('click')
    expect(wrapper.find('.contained-error').exists()).toBe(true)
    expect(wrapper.get('.contained-error button').attributes('disabled')).toBeDefined()
    await wrapper.get('.contained-error button').trigger('click')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    recovery.resolve(weatherFixture())
    await flushPromises()
    expect(wrapper.find('.contained-error').exists()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

async function mountLoaded() {
  const wrapper = mount(App)
  await flushPromises()
  return wrapper
}

function unitButton(wrapper: VueWrapper, label: string) {
  return wrapper.findAll('.unit-toggle__button').find((button) => button.text() === label)!
}

function buttonNamed(wrapper: VueWrapper, label: string) {
  return wrapper.findAll('button').find((button) => button.text() === label)!
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

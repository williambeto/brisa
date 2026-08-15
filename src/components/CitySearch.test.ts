import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchLocations } from '../services/openMeteo'
import type { WeatherLocation } from '../types/weather'
import CitySearch from './CitySearch.vue'

vi.mock('../services/openMeteo', () => ({
  searchLocations: vi.fn(),
}))

const locations: WeatherLocation[] = [
  {
    id: 1,
    name: 'São Paulo',
    admin1: 'São Paulo',
    country: 'Brasil',
    latitude: -23.55,
    longitude: -46.63,
  },
  {
    id: 2,
    name: 'Santos',
    admin1: 'São Paulo',
    country: 'Brasil',
    latitude: -23.96,
    longitude: -46.33,
  },
]

const searchMock = vi.mocked(searchLocations)
let scrollIntoView: ReturnType<typeof vi.fn>
let originalScrollIntoView: PropertyDescriptor | undefined
let documentWrapper: VueWrapper | undefined

beforeEach(() => {
  vi.useFakeTimers()
  searchMock.mockReset()
  originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  scrollIntoView = vi.fn()
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
})

afterEach(() => {
  documentWrapper?.unmount()
  documentWrapper = undefined
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView)
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  }
  document.body.replaceChildren()
})

describe('CitySearch', () => {
  it('deriva IDs únicos e mantém referências ARIA apenas para elementos existentes', async () => {
    const wrapper = (documentWrapper = mount(
      defineComponent({
        components: { CitySearch },
        template: '<div><CitySearch /><CitySearch /></div>',
      }),
      { attachTo: document.body },
    ))
    const searches = wrapper.findAllComponents(CitySearch)
    const firstInput = searches[0]!.get('input[role="combobox"]')
    const secondInput = searches[1]!.get('input[role="combobox"]')

    expect(firstInput.attributes('id')).not.toBe(secondInput.attributes('id'))
    for (const search of searches) {
      const input = search.get('input[role="combobox"]')
      const describedById = input.attributes('aria-describedby')
      expect(describedById).toBeDefined()
      const describedBy = describedById!.split(' ')
      expect(describedBy).toHaveLength(2)
      expect(search.get('label').attributes('for')).toBe(input.attributes('id'))
      expect(describedBy.every((id) => document.getElementById(id))).toBe(true)
      expect(input.attributes('aria-expanded')).toBe('false')
      expect(input.attributes('aria-controls')).toBeUndefined()
      expect(input.attributes('aria-activedescendant')).toBeUndefined()
    }

    await firstInput.setValue('s')
    expect(searches[0].text()).toContain('Continue escrevendo')
    expect(searches[0].find('[role="listbox"]').exists()).toBe(false)
    expect(firstInput.attributes('aria-controls')).toBeUndefined()

    const pending = deferred<WeatherLocation[]>()
    searchMock.mockReturnValueOnce(pending.promise)
    await firstInput.setValue('sa')
    expect(searches[0].text()).toContain('Procurando no mapa')
    expect(searches[0].find('[role="listbox"]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(320)
    pending.resolve([])
    await flushPromises()
    expect(searches[0].text()).toContain('Nenhum lugar encontrado')
    expect(searches[0].find('[role="listbox"]').exists()).toBe(false)

    searchMock.mockResolvedValueOnce(locations)
    await firstInput.setValue('san')
    await vi.advanceTimersByTimeAsync(320)
    await flushPromises()
    const listbox = searches[0].get('[role="listbox"]')
    const listboxId = listbox.attributes('id')
    expect(firstInput.attributes('aria-expanded')).toBe('true')
    expect(listboxId).toBeDefined()
    expect(firstInput.attributes('aria-controls')).toBe(listboxId)
    expect(document.getElementById(listboxId!)).toBe(listbox.element)
    expect(searches[0].findAll('[role="option"]')).toHaveLength(2)
    expect(searches[0].find('[role="option"] button').exists()).toBe(false)
    expect(searches[0].findAll('[role="option"]')[0].attributes('aria-selected')).toBe('false')
  })

  it('não seleciona sem opção ativa e navega, seleciona e fecha pelo teclado', async () => {
    searchMock.mockResolvedValue(locations)
    const wrapper = mount(CitySearch)
    const input = wrapper.get('input')
    await findLocations(wrapper, 'sa')

    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(input.attributes('aria-activedescendant')).toBeUndefined()

    await input.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const firstOption = wrapper.findAll('[role="option"]')[0]
    expect(input.attributes('aria-activedescendant')).toBe(firstOption.attributes('id'))
    expect(firstOption.attributes('aria-selected')).toBe('true')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(input.attributes('aria-activedescendant')).toBe(firstOption.attributes('id'))
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toEqual([[locations[0]]])

    await findLocations(wrapper, 'san')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(input.attributes('aria-expanded')).toBe('false')
    expect(input.attributes('aria-activedescendant')).toBeUndefined()
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('rola a opção ativa com nearest e mantém o foco no input na seleção por pointer/click', async () => {
    searchMock.mockResolvedValue(locations)
    const wrapper = mount(CitySearch, { attachTo: document.body })
    const input = wrapper.get('input')
    await findLocations(wrapper, 'sa')
    input.element.focus()

    await input.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })

    const secondOption = wrapper.findAll('[role="option"]')[1]
    await secondOption.trigger('pointerdown')
    expect(document.activeElement).toBe(input.element)
    await secondOption.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[locations[1]]])
  })

  it('mantém retry alcançável no foco interno e fecha somente ao mover foco para fora', async () => {
    searchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(locations)
    const wrapper = mount(CitySearch, { attachTo: document.body })
    const input = wrapper.get('input')
    await findLocations(wrapper, 'sa')
    const retry = wrapper.get('button.text-button')

    expect(retry.attributes('tabindex')).toBeUndefined()
    expect(retry.attributes('disabled')).toBeUndefined()
    input.element.focus()
    ;(retry.element as HTMLElement).focus()
    await nextTick()
    expect(document.activeElement).toBe(retry.element)
    expect(wrapper.find('button.text-button').exists()).toBe(true)

    input.element.focus()
    await nextTick()
    expect(document.activeElement).toBe(input.element)
    expect(wrapper.find('button.text-button').exists()).toBe(true)

    ;(retry.element as HTMLElement).focus()
    await retry.trigger('click')
    expect(searchMock).toHaveBeenCalledTimes(2)
    await flushPromises()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)

    const outside = document.createElement('button')
    document.body.append(outside)
    input.element.focus()
    outside.focus()
    await nextTick()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('aplica debounce em 320ms, aborta a operação anterior e inicia só uma busca por query', async () => {
    const first = deferred<WeatherLocation[]>()
    const second = deferred<WeatherLocation[]>()
    searchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const wrapper = mount(CitySearch)
    const input = wrapper.get('input')

    await input.setValue('sa')
    await vi.advanceTimersByTimeAsync(319)
    expect(searchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(searchMock).toHaveBeenCalledTimes(1)
    const firstSignal = searchMock.mock.calls[0][1]

    await input.setValue('san')
    expect(firstSignal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(319)
    expect(searchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(searchMock).toHaveBeenCalledTimes(2)

    second.resolve(locations)
    first.resolve([locations[1]])
    await flushPromises()
    expect(wrapper.findAll('[role="option"]')[0].text()).toContain('São Paulo')
  })

  it('ignora resultado e erro stale e um finally antigo não perde o controller atual', async () => {
    const staleError = deferred<WeatherLocation[]>()
    const current = deferred<WeatherLocation[]>()
    const newest = deferred<WeatherLocation[]>()
    searchMock
      .mockReturnValueOnce(staleError.promise)
      .mockReturnValueOnce(current.promise)
      .mockReturnValueOnce(newest.promise)
    const wrapper = mount(CitySearch)
    const input = wrapper.get('input')

    await findLocations(wrapper, 'sa', false)
    const staleSignal = searchMock.mock.calls[0][1]
    await findLocations(wrapper, 'san', false)
    const currentSignal = searchMock.mock.calls[1][1]
    expect(staleSignal?.aborted).toBe(true)

    staleError.reject(new Error('erro atrasado'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('sem conexão')

    await input.setValue('sant')
    expect(currentSignal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(320)
    current.resolve([locations[1]])
    newest.resolve([locations[0]])
    await flushPromises()
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    expect(wrapper.get('[role="option"]').text()).toContain('São Paulo')
  })

  it('cancela timer, request e foco no unmount', async () => {
    const timerWrapper = mount(CitySearch)
    await timerWrapper.get('input').setValue('sa')
    timerWrapper.unmount()
    await vi.advanceTimersByTimeAsync(320)
    expect(searchMock).not.toHaveBeenCalled()

    const pending = deferred<WeatherLocation[]>()
    searchMock.mockReturnValueOnce(pending.promise)
    const requestWrapper = mount(CitySearch, { attachTo: document.body })
    const input = requestWrapper.get('input')
    await findLocations(requestWrapper, 'san', false)
    const signal = searchMock.mock.calls[0][1]
    input.element.focus()
    expect(document.activeElement).toBe(input.element)
    requestWrapper.unmount()
    expect(signal?.aborted).toBe(true)
    expect(document.activeElement).not.toBe(input.element)
    pending.resolve(locations)
    await flushPromises()
  })
})

async function findLocations(
  wrapper: VueWrapper,
  query: string,
  settle = true,
) {
  await wrapper.get('input').setValue(query)
  await vi.advanceTimersByTimeAsync(320)
  if (settle) await flushPromises()
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

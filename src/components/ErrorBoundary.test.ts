import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary.vue'

const FaultySection = defineComponent({
  props: { fail: Boolean },
  render() {
    if (this.fail) throw new Error('render quebrado')
    return h('p', 'Seção disponível')
  },
})

describe('ErrorBoundary', () => {
  it('mantém o fallback durante retry e só tenta novo slot após sucesso', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const key = ref(1)
    const recovering = ref(false)
    const fail = ref(false)
    const wrapper = mount(defineComponent({
      components: { ErrorBoundary, FaultySection },
      setup: () => ({ key, recovering, fail }),
      template: '<ErrorBoundary :recovery-key="key" :recovering="recovering"><FaultySection :fail="fail" /></ErrorBoundary>',
    }))
    fail.value = true
    await nextTick()

    const button = wrapper.get('button')
    await button.trigger('click')
    expect(wrapper.findComponent(ErrorBoundary).emitted('retry')).toHaveLength(1)
    recovering.value = true
    await nextTick()
    expect(wrapper.text()).toContain('Esta parte da previsão não pôde ser exibida')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.findComponent(ErrorBoundary).emitted('retry')).toHaveLength(1)

    recovering.value = false
    await nextTick()
    expect(wrapper.text()).toContain('Esta parte da previsão não pôde ser exibida')
    key.value += 1
    await nextTick()
    expect(wrapper.text()).toContain('Esta parte da previsão não pôde ser exibida')
  })

  it('gera IDs exclusivos para fallbacks independentes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fail = ref(false)
    const wrapper = mount(defineComponent({
      components: { ErrorBoundary, FaultySection },
      setup: () => ({ fail }),
      template: '<div><ErrorBoundary :recovery-key="1" :recovering="false"><FaultySection :fail="fail" /></ErrorBoundary><ErrorBoundary :recovery-key="1" :recovering="false"><FaultySection :fail="fail" /></ErrorBoundary></div>',
    }))
    fail.value = true
    await nextTick()
    const sections = wrapper.findAll('.contained-error')
    const ids = sections.map((section) => section.attributes('aria-labelledby'))

    expect(new Set(ids).size).toBe(2)
    expect(ids.every((id) => wrapper.element.querySelector(`[id="${id}"]`))).toBe(true)
  })

  it('renderiza novamente quando a recovery key muda', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fail = ref(false)
    const key = ref(1)
    const wrapper = mount(defineComponent({
      components: { ErrorBoundary, FaultySection },
      setup: () => ({ key, fail }),
      template: '<ErrorBoundary :recovery-key="key" :recovering="false"><FaultySection :fail="fail" /></ErrorBoundary>',
    }))

    fail.value = true
    await nextTick()
    expect(wrapper.text()).toContain('Esta parte da previsão não pôde ser exibida')
    fail.value = false
    key.value += 1
    await nextTick()
    expect(wrapper.text()).toContain('Seção disponível')
  })
})

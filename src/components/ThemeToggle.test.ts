import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ThemeToggle from './ThemeToggle.vue'

describe('ThemeToggle', () => {
  it('destaca o botão correspondente à preferência atual e expõe aria-pressed', () => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: 'dark' } })
    const buttons = wrapper.findAll('button')

    expect(buttons[0]?.attributes('aria-pressed')).toBe('false')
    expect(buttons[1]?.attributes('aria-pressed')).toBe('true')
    expect(buttons[2]?.attributes('aria-pressed')).toBe('false')
  })

  it('emite evento change com o tema selecionado ao clicar', async () => {
    const wrapper = mount(ThemeToggle, { props: { modelValue: 'system' } })
    const buttons = wrapper.findAll('button')

    await buttons[0]?.trigger('click')
    expect(wrapper.emitted('change')?.[0]).toEqual(['light'])

    await buttons[1]?.trigger('click')
    expect(wrapper.emitted('change')?.[1]).toEqual(['dark'])

    await buttons[2]?.trigger('click')
    expect(wrapper.emitted('change')?.[2]).toEqual(['system'])
  })
})

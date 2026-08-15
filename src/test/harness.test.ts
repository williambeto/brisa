import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'

describe('harness de componentes', () => {
  it('monta componentes Vue em jsdom e rejeita fetch não injetado', async () => {
    const wrapper = mount(defineComponent({ template: '<p>Brisa</p>' }))

    expect(wrapper.text()).toBe('Brisa')
    await expect(fetch('https://example.com/nao-permitido')).rejects.toThrow(
      'Fetch inesperado no teste',
    )
  })
})

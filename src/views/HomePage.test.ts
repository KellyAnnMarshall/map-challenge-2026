import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HomePage from './HomePage.vue'

describe('home page', () => {
  it('shows every daily challenge as a link', () => {
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.findAll('.challenge-tile')).toHaveLength(30)
    expect(wrapper.text()).toContain('30 maps.')
    expect(wrapper.text()).toContain('Pen & paper')
  })
})

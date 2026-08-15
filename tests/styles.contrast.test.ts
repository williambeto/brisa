import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles.css', 'utf8')

type Rgb = [number, number, number]
type Color = { rgb: Rgb; alpha: number }

function declarations(selector: string) {
  const match = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
    ([, ruleSelector]) => ruleSelector.trim() === selector,
  )
  expect(match, `regra CSS ausente: ${selector}`).toBeDefined()
  return Object.fromEntries(
    [...match![2].matchAll(/(--[\w-]+|[\w-]+)\s*:\s*([^;]+);/g)].map((entry) => [
      entry[1],
      entry[2].trim(),
    ]),
  )
}

function color(value: string): Color {
  const hex = value.match(/^#([\da-f]{6})$/i)?.[1]
  if (hex) {
    return {
      rgb: [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as Rgb,
      alpha: 1,
    }
  }

  const rgba = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i)
  expect(rgba, `cor CSS não suportada: ${value}`).not.toBeNull()
  return {
    rgb: [Number(rgba![1]), Number(rgba![2]), Number(rgba![3])],
    alpha: Number(rgba![4]),
  }
}

function composite(foreground: Color, background: Color): Color {
  return {
    rgb: foreground.rgb.map((channel, index) =>
      Math.round(channel * foreground.alpha + background.rgb[index] * (1 - foreground.alpha)),
    ) as Rgb,
    alpha: 1,
  }
}

function luminance({ rgb }: Color) {
  const channels = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(first: Color, second: Color) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function resolved(root: Record<string, string>, override: Record<string, string>, token: string) {
  const value = override[token] ?? root[token]
  expect(value, `token CSS ausente: ${token}`).toBeTruthy()
  return color(value)
}

describe('contraste dos tokens efetivamente declarados', () => {
  const root = declarations(':root')
  const themes = [
    ['clear', {}],
    ['cloudy', declarations('.app-shell[data-weather="cloudy"]')],
    ['fog', declarations('.app-shell[data-weather="fog"]')],
    ['snow', declarations('.app-shell[data-weather="snow"]')],
    ['rain', declarations('.app-shell[data-weather="rain"]')],
    ['storm', declarations('.app-shell[data-weather="storm"],\n.app-shell[data-period="night"]')],
    ['night', declarations('.app-shell[data-weather="storm"],\n.app-shell[data-period="night"]')],
  ] as const

  it.each(themes)('%s mantém texto normal e muted em 4.5:1 no gradiente e superfícies', (name, override) => {
    const textColors = [resolved(root, override, '--color-text'), resolved(root, override, '--color-text-muted')]
    const endpoints = [
      resolved(root, override, '--color-background'),
      resolved(root, override, '--color-background-deep'),
    ]
    const glow = resolved(root, override, '--color-atmosphere-glow')
    const surfaces = [resolved(root, override, '--color-surface'), resolved(root, override, '--color-surface-strong')]

    for (const endpoint of endpoints) {
      for (const effectiveBackground of [endpoint, composite(glow, endpoint)]) {
        for (const foreground of textColors) {
          expect(contrast(foreground, effectiveBackground), `${name}: texto no gradiente`).toBeGreaterThanOrEqual(4.5)
          for (const surface of surfaces) {
            expect(contrast(foreground, composite(surface, effectiveBackground)), `${name}: texto na superfície`).toBeGreaterThanOrEqual(4.5)
          }
        }
      }
    }
  })

  it('mantém os pares sólidos de controles e mensagens em 4.5:1', () => {
    const pairs = [
      ['--color-control-text', '--color-control-surface'],
      ['--color-control-muted', '--color-control-surface'],
      ['--color-danger', '--color-danger-surface'],
    ] as const
    for (const [foreground, background] of pairs) {
      expect(contrast(color(root[foreground]), color(root[background])), `${foreground}/${background}`).toBeGreaterThanOrEqual(4.5)
    }

    expect(contrast(color('#fffaf2'), color('#8f402c')), 'botão primário').toBeGreaterThanOrEqual(4.5)
    expect(contrast(color(root['--color-control-text']), color('#fbfcf7')), 'popover').toBeGreaterThanOrEqual(4.5)
    expect(contrast(color(root['--color-control-muted']), color('#e7efea')), 'opção ativa').toBeGreaterThanOrEqual(4.5)
  })

  it('mantém ao menos um lado do anel duplo em 3:1 contra cada superfície', () => {
    const dark = color(root['--color-focus-dark'])
    const light = color(root['--color-focus-light'])
    expect(contrast(dark, light), 'separação entre os dois anéis').toBeGreaterThanOrEqual(3)

    const adjacent = [
      color(root['--color-control-surface']),
      color('#fbfcf7'),
      color('#e7efea'),
      color('#8f402c'),
      ...themes.flatMap(([, override]) => [
        resolved(root, override, '--color-background'),
        resolved(root, override, '--color-background-deep'),
      ]),
    ]
    for (const surface of adjacent) {
      expect(Math.max(contrast(dark, surface), contrast(light, surface))).toBeGreaterThanOrEqual(3)
    }
  })
})

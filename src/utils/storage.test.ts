import { describe, expect, it } from 'vitest'
import { parseStoredLocation, readStoredLocation, saveStoredLocation } from './storage'

describe('persistência da localização', () => {
  it('aceita somente uma localização válida e dentro dos limites geográficos', () => {
    const valid = JSON.stringify({
      name: 'Recife',
      admin1: 'Pernambuco',
      country: 'Brasil',
      latitude: -8.05,
      longitude: -34.9,
    })

    expect(parseStoredLocation(valid)).toMatchObject({ name: 'Recife', latitude: -8.05 })
    expect(parseStoredLocation('{inválido')).toBeNull()
    expect(parseStoredLocation(JSON.stringify({ name: 'Lugar', country: 'Brasil', latitude: 91, longitude: 0 }))).toBeNull()
  })

  it('contém falhas de leitura e escrita do storage', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    }

    expect(readStoredLocation(brokenStorage)).toBeNull()
    expect(
      saveStoredLocation(
        { name: 'Recife', country: 'Brasil', latitude: -8.05, longitude: -34.9 },
        brokenStorage,
      ),
    ).toBe(false)
  })

  it('contém falhas ao adquirir o storage global', () => {
    withLocalStorageDescriptor(
      {
        get: () => {
          throw new Error('acesso bloqueado')
        },
      },
      () => {
        expect(readStoredLocation()).toBeNull()
        expect(
          saveStoredLocation({ name: 'Recife', country: 'Brasil', latitude: -8.05, longitude: -34.9 }),
        ).toBe(false)
      },
    )
  })

  it('trata storage global ausente como indisponível', () => {
    withLocalStorageDescriptor({ value: undefined }, () => {
      expect(readStoredLocation()).toBeNull()
      expect(
        saveStoredLocation({ name: 'Recife', country: 'Brasil', latitude: -8.05, longitude: -34.9 }),
      ).toBe(false)
    })
  })
})

function withLocalStorageDescriptor(descriptor: PropertyDescriptor, assertion: () => void) {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')

  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, ...descriptor })
    assertion()
  } finally {
    if (original) Object.defineProperty(window, 'localStorage', original)
    else Reflect.deleteProperty(window, 'localStorage')
  }
}

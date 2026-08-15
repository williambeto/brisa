import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      Promise.reject(new Error(`Fetch inesperado no teste: ${String(input)}`)),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

import { afterEach, describe, expect, it, vi } from 'vitest'

describe('serverEnv', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

  it('treats empty values from a copied .env.example as unset', async () => {
    vi.stubEnv('SESSION_SECRET', '')
    vi.stubEnv('RPC_URL_BASE', '')
    vi.stubEnv('ADMIN_ADDRESSES', '0xABC, 0xdef ')
    const { serverEnv } = await import('./env.server')
    const env = serverEnv()
    expect(env.sessionSecret.length).toBeGreaterThanOrEqual(32)
    expect(env.RPC_URL_BASE).toBeUndefined()
    expect(env.adminAddresses).toEqual(['0xabc', '0xdef'])
  })

  it('rejects a weak session secret', async () => {
    vi.stubEnv('SESSION_SECRET', 'short')
    const { serverEnv } = await import('./env.server')
    expect(() => serverEnv()).toThrow(/SESSION_SECRET/)
  })

  it('requires a session secret in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_SECRET', '')
    const { serverEnv } = await import('./env.server')
    expect(() => serverEnv()).toThrow(/required in production/)
  })
})

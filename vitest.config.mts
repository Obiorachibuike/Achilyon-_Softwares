import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { 'server-only': fileURLToPath(new URL('./src/test/empty.ts', import.meta.url)) } },
  test: { environment: 'node', testTimeout: 30_000, hookTimeout: 60_000, include: ['src/**/*.test.ts'], env: { NEXT_PUBLIC_DEMO_MODE: 'true' } },
})
